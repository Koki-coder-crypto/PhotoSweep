import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPhotoGroups,
  duplicateCandidates,
  hashDistance,
} from "../src/domain/analysis.ts";
import {
  initialState,
  stageCandidates,
  beginDeletion,
  ReviewController,
} from "../src/domain/review.ts";
import { clock, remaining, productCTA } from "../src/domain/policy.ts";
import type {
  Photo,
  PhotoFingerprint,
  Entitlement,
} from "../src/domain/types.ts";

const now = Date.now(),
  c = clock(new Date(now));
const free: Entitlement = { kind: "free", verified: true };
function photo(id: string, patch: Partial<Photo> = {}): Photo {
  return {
    id,
    uri: `file:///${id}`,
    width: 1200,
    height: 1600,
    createdAt: now,
    screenshot: false,
    ...patch,
  };
}
function fingerprint(
  id: string,
  hash = "0f0f0f0f0f0f0f0f",
  patch: Partial<PhotoFingerprint> = {},
): PhotoFingerprint {
  return {
    id,
    hash,
    quality: 600,
    favorite: false,
    exactEligible: true,
    ...patch,
  };
}

test("a matching perceptual hash alone never labels photos as exact duplicates", () => {
  const groups = buildPhotoGroups(
    [photo("a"), photo("b")],
    [fingerprint("a"), fingerprint("b")],
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.kind, "similar");
});
test("exact original bytes form a duplicate group with the favorite recommended", () => {
  const groups = buildPhotoGroups(
    [photo("a"), photo("b")],
    [fingerprint("a"), fingerprint("b", undefined, { favorite: true })],
    new Map([
      ["a", "a".repeat(64)],
      ["b", "a".repeat(64)],
    ]),
  );
  assert.deepEqual(groups, [
    { id: "duplicate-b", kind: "duplicate", ids: ["b", "a"], recommended: "b" },
  ]);
});
test("different SHA256 values do not become exact duplicates and malformed digests are ignored", () => {
  const groups = buildPhotoGroups(
    [photo("a"), photo("b"), photo("c")],
    [fingerprint("a"), fingerprint("b"), fingerprint("c")],
    new Map([
      ["a", "a".repeat(64)],
      ["b", "b".repeat(64)],
      ["c", "invalid"],
    ]),
  );
  assert.ok(groups.every((g) => g.kind === "similar"));
});
test("similarity excludes screenshots, large date gaps, different shapes and invalid hashes", () => {
  const photos = [
    photo("a"),
    photo("b", { createdAt: now - 86400001 }),
    photo("c", { screenshot: true }),
    photo("d", { width: 1600, height: 1200 }),
    photo("e"),
  ];
  assert.equal(
    buildPhotoGroups(
      photos,
      photos.map((p) =>
        fingerprint(p.id, p.id === "e" ? "invalid" : undefined),
      ),
    ).length,
    0,
  );
  assert.equal(hashDistance("invalid", "0".repeat(16)), 65);
});
test("grouping compares against a representative and never joins dissimilar ends of a chain", () => {
  const groups = buildPhotoGroups(
    [
      photo("a", { createdAt: now + 2 }),
      photo("b", { createdAt: now + 1 }),
      photo("c"),
    ],
    [
      fingerprint("a", "0000000000000000"),
      fingerprint("b", "000000000000007f"),
      fingerprint("c", "0000000000003fff"),
    ],
  );
  assert.equal(groups[0]?.ids.length, 2);
  assert.ok(!groups[0]?.ids.includes("c"));
});
test("byte-hash candidates exclude edited or Live Photo assets", () => {
  assert.deepEqual(
    duplicateCandidates([
      fingerprint("a"),
      fingerprint("b"),
      fingerprint("c", undefined, { exactEligible: false }),
    ]),
    ["a", "b"],
  );
});
for (const count of [1000, 10000])
  test(`${count} photo analysis completes with every suggested id unique`, () => {
    const photos = Array.from({ length: count }, (_, i) =>
      photo(String(i), { createdAt: now - i * 60000 }),
    );
    const prints = photos.map((p, i) =>
      fingerprint(
        p.id,
        BigInt.asUintN(64, BigInt(Math.floor(i / 3) + 1) * 0x9e3779b97f4a7c15n)
          .toString(16)
          .padStart(16, "0"),
      ),
    );
    const start = performance.now();
    const groups = buildPhotoGroups(photos, prints);
    const ids = groups.flatMap((g) => g.ids);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(groups.length > 0);
    assert.ok(
      performance.now() - start < 5000,
      "analysis exceeds a five-second regression ceiling",
    );
  });
test("bulk selection applies 49 to 50 atomically and rejects 51 without changing its input", () => {
  const s = {
    ...initialState(c),
    used: Array.from({ length: 49 }, (_, i) => `old-${i}`),
  };
  assert.throws(() => stageCandidates(s, ["a", "b"], free, c), /無料/);
  assert.deepEqual(s.decisions, {});
  const next = stageCandidates(s, ["a", "a"], free, c);
  assert.equal(remaining(next), 0);
  assert.throws(() => stageCandidates(next, ["b"], free, c), /無料/);
  assert.equal(stageCandidates(next, ["a"], free, c).used.length, 50);
});
test("previously reviewed photos can become candidates after the quota is exhausted", () => {
  const s = {
    ...initialState(c),
    used: Array.from({ length: 50 }, (_, i) => `old-${i}`),
    decisions: {
      existing: {
        choice: "keep" as const,
        at: now - 86400000,
        sessionId: "old",
      },
    },
  };
  assert.equal(
    stageCandidates(s, ["existing"], free, c).decisions.existing?.choice,
    "candidate",
  );
});
test("bulk selection remains locked until an unknown deletion is reconciled", () => {
  const s = beginDeletion(
    stageCandidates(initialState(c), ["a"], free, c),
    ["a"],
    "job",
    now,
  );
  assert.throws(() => stageCandidates(s, ["b"], free, c), /前の削除/);
  assert.throws(
    () =>
      stageCandidates(
        { ...s, deletion: { ...s.deletion!, status: "unknown" } },
        ["b"],
        free,
        c,
      ),
    /前の削除/,
  );
});
test("bulk selection at midnight resets once and an expired Pro uses free quota", () => {
  const s = {
    ...initialState(c),
    used: Array.from({ length: 50 }, (_, i) => `old-${i}`),
  };
  const tomorrow = clock(new Date(now + 86400000));
  assert.equal(stageCandidates(s, ["a"], free, tomorrow).used.length, 1);
  assert.throws(
    () => stageCandidates(s, ["a"], { kind: "expired", verified: true }, c),
    /無料/,
  );
});
test("weekly and lifetime CTA show the full charge and appropriate renewal terms", () => {
  const base = {
    id: "product",
    displayPrice: "￥1,500",
    price: 1500,
    currency: "JPY",
    eligibility: "eligible" as const,
    trialDays: 7,
  };
  assert.match(productCTA({ ...base, period: "week" }).disclosure, /週/);
  const lifetime = productCTA({
    ...base,
    period: "lifetime",
    displayPrice: "￥6,000",
    eligibility: "ineligible",
    trialDays: 0,
  });
  assert.match(lifetime.label, /￥6,000/);
  assert.match(lifetime.disclosure, /自動更新はありません/);
});
