import type { Entitlement } from "./types.ts";
export interface VerifiedStoreSnapshot {
  verified: boolean;
  productId: string;
  expiresAt?: number | null;
  revokedAt?: number | null;
  state?: string;
  autoRenew: boolean;
  graceExpiresAt?: number | null;
  billingRetry?: boolean;
  trial: boolean;
  legacy?: boolean;
}
export function entitlementFromStore(
  s: VerifiedStoreSnapshot | null,
  now: number,
): Entitlement {
  if (!s) return { kind: "free", verified: true };
  if (!s.verified) return { kind: "unknown", verified: false };
  if (s.revokedAt || s.state === "revoked" || s.state === "refunded")
    return { kind: "revoked", verified: true };
  if (s.legacy)
    return { kind: "legacy", verified: true, productId: s.productId };
  if (
    s.state === "in-grace-period" &&
    s.graceExpiresAt &&
    s.graceExpiresAt > now
  )
    return {
      kind: "grace",
      verified: true,
      productId: s.productId,
      expiresAt: s.graceExpiresAt,
      autoRenew: s.autoRenew,
      billingRetry: true,
    };
  if (!s.expiresAt || s.expiresAt <= now)
    return { kind: "expired", verified: true };
  return {
    kind: s.trial ? "trial" : "active",
    verified: true,
    productId: s.productId,
    expiresAt: s.expiresAt,
    autoRenew: s.autoRenew,
    billingRetry: s.billingRetry,
  };
}
