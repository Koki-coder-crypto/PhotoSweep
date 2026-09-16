import { test } from "node:test";
import assert from "node:assert/strict";
import {
  entitlementFromStore,
  type VerifiedStoreSnapshot,
} from "../src/domain/billing.ts";
const at = Date.now();
const valid: VerifiedStoreSnapshot = {
  verified: true,
  productId: "annual",
  expiresAt: at + 1000,
  autoRenew: true,
  trial: true,
};
test("native unverified, revoked, expired and missing transactions do not grant access", () => {
  assert.equal(entitlementFromStore(null, at).kind, "free");
  assert.equal(
    entitlementFromStore({ ...valid, verified: false }, at).kind,
    "unknown",
  );
  assert.equal(
    entitlementFromStore({ ...valid, revokedAt: at }, at).kind,
    "revoked",
  );
  assert.equal(
    entitlementFromStore({ ...valid, expiresAt: at }, at).kind,
    "expired",
  );
});
test("trial, auto-renew-off, and billing grace reflect verified store facts", () => {
  assert.equal(entitlementFromStore(valid, at).kind, "trial");
  assert.equal(
    entitlementFromStore({ ...valid, trial: false, autoRenew: false }, at).kind,
    "active",
  );
  assert.equal(
    entitlementFromStore(
      {
        ...valid,
        state: "in-grace-period",
        expiresAt: at - 1,
        graceExpiresAt: at + 10,
      },
      at,
    ).kind,
    "grace",
  );
  assert.equal(
    entitlementFromStore(
      { ...valid, state: "in-billing-retry", expiresAt: at - 1 },
      at,
    ).kind,
    "expired",
  );
});
test("legacy is only honored when verified and not revoked", () => {
  assert.equal(
    entitlementFromStore({ ...valid, legacy: true }, at).kind,
    "legacy",
  );
  assert.equal(
    entitlementFromStore({ ...valid, legacy: true, verified: false }, at).kind,
    "unknown",
  );
  assert.equal(
    entitlementFromStore({ ...valid, legacy: true, revokedAt: at }, at).kind,
    "revoked",
  );
});
