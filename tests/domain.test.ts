import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  initialState,
  decide,
  undo,
  startSession,
  beginDeletion,
  reconcileDeletion,
  removeCandidate,
  ReviewController,
} from "../src/domain/review.ts";
import {
  batchSize,
  hasPro,
  productCTA,
  refreshDay,
  remaining,
  trialReminderAt,
  validateScopeDates,
} from "../src/domain/policy.ts";
import { SqlReviewPersistence, type SqlConnection } from "../src/data/sql.ts";
import type {
  Clock,
  Entitlement,
  ReviewState,
  StoreProduct,
} from "../src/domain/types.ts";
const c: Clock = {
  now: new Date("2026-09-17T12:00:00+09:00").getTime(),
  day: "2026-09-17",
  timezoneOffset: -540,
};
const free: Entitlement = { kind: "free", verified: true };
const pro: Entitlement = {
  kind: "trial",
  verified: true,
  expiresAt: c.now + 7 * 86400000,
  autoRenew: true,
  productId: "monthly",
};
function active(count = 20, entitlement = free) {
  return startSession(
    initialState(c),
    Array.from({ length: count }, (_, i) => `p${i}`),
    { order: "newest" },
    entitlement,
    c,
    "s1",
  );
}
test("keep and candidate each consume exactly one unique daily decision; skip does not", () => {
  let s = decide(active(), "p0", "keep", free, c);
  s = decide(s, "p1", "candidate", free, c);
  s = decide(s, "p2", "skip", free, c);
  assert.equal(s.used.length, 2);
  assert.equal(s.session?.cursor, 3);
  assert.equal(s.decisions.p2, undefined);
});
test("undo keeps usage; redeciding same asset cannot consume quota twice", () => {
  const s = decide(
    undo(decide(active(), "p0", "candidate", free, c)),
    "p0",
    "keep",
    free,
    c,
  );
  assert.equal(s.used.length, 1);
  assert.equal(s.decisions.p0?.choice, "keep");
});
test("49 -> 50 is durable and 51st new photo is refused", () => {
  const s = {
    ...active(),
    used: Array.from({ length: 49 }, (_, i) => `old${i}`),
  };
  const next = decide(s, "p0", "keep", free, c);
  assert.equal(remaining(next), 0);
  assert.throws(() => decide(next, "p1", "candidate", free, c), /無料/);
  assert.equal(decide(undo(next), "p0", "keep", free, c).used.length, 50);
});
test("quota is shared between screenshot and month sessions", () => {
  let s = decide(active(), "p0", "keep", free, c);
  s = { ...s, decisions: {} }; // A history reset must still retain the ledger.
  s = startSession(
    s,
    ["p0"],
    { order: "newest", screenshotsOnly: true },
    free,
    c,
    "s2",
  );
  assert.equal(decide(s, "p0", "candidate", free, c).used.length, 1);
});
test("Pro decisions preserve free ledger; expiration resumes it", () => {
  const s = { ...active(20, pro), used: ["old"] };
  assert.deepEqual(decide(s, "p0", "keep", pro, c).used, ["old"]);
  assert.equal(hasPro(pro, pro.expiresAt), false);
});
test("paid batch settings do not escape the free batch cap", () => {
  const s = initialState(c);
  s.settings.batch = 100;
  assert.equal(batchSize(s, free, c.now, 100), 20);
  s.used = Array.from({ length: 43 }, (_, i) => String(i));
  assert.equal(batchSize(s, free, c.now, 100), 7);
  assert.equal(batchSize(s, pro, c.now, 100), 100);
});
test("day boundary resets once; clock rollback and timezone change cannot mint allowance", () => {
  let s = { ...initialState(c), used: ["p"] };
  s = refreshDay(s, { ...c, day: "2026-09-18", now: c.now + 86400000 });
  assert.equal(s.used.length, 0);
  s.used = ["new"];
  s = refreshDay(s, c);
  assert.equal(s.used.length, 1);
  s = refreshDay(s, {
    ...c,
    day: "2026-09-19",
    now: c.now + 86400001,
    timezoneOffset: -720,
  });
  assert.equal(s.used.length, 1);
  s = refreshDay(s, {
    ...c,
    day: "2026-09-19",
    now: c.now + 86400002,
    timezoneOffset: -720,
  });
  assert.equal(s.used.length, 1);
});
test("session is a snapshot, deduplicated, and shortens to available photos", () => {
  const s = startSession(
    initialState(c),
    ["a", "a", "b"],
    { order: "newest" },
    free,
    c,
    "s",
  );
  assert.deepEqual(s.session?.ids, ["a", "b"]);
  assert.equal(s.session?.target, 2);
});
test("summary celebrates all kept; undo retracts history and resumes review", () => {
  const s = decide(active(1), "p0", "keep", free, c);
  assert.equal(s.session?.status, "summary");
  assert.equal(s.history[0]?.kept, 1);
  assert.equal(s.history[0]?.candidates, 0);
  const back = undo(s);
  assert.equal(back.history.length, 0);
  assert.equal(back.session?.cursor, 0);
});
test("stale or double-tapped asset cannot advance the next card", () => {
  const s = decide(active(), "p0", "keep", free, c);
  assert.throws(() => decide(s, "p0", "candidate", free, c), /変わりました/);
});
test("candidate removal remains free at the quota limit", () => {
  const s = decide(active(), "p0", "candidate", free, c);
  s.used = Array.from({ length: 50 }, (_, i) => String(i));
  assert.equal(removeCandidate(s, "p0").decisions.p0?.choice, "keep");
});
test("candidate selection alone does not create a deletion job", () => {
  assert.equal(
    decide(active(), "p0", "candidate", free, c).deletion,
    undefined,
  );
});
function deleting() {
  let s = decide(active(), "p0", "candidate", free, c);
  s = decide(s, "p1", "candidate", free, c);
  return beginDeletion(s, ["p0", "p1"], "j", c.now);
}
test("deletion rejects zero, noncandidate and duplicate jobs", () => {
  assert.throws(() => beginDeletion(active(), [], "j", c.now));
  assert.throws(() => beginDeletion(active(), ["p0"], "j", c.now));
  assert.throws(() => beginDeletion(deleting(), ["p0"], "j2", c.now));
  assert.throws(() => undo(deleting()));
});
test("OS cancellation leaves all candidates and history untouched", () => {
  const s = deleting();
  const next = reconcileDeletion(s, { kind: "cancelled" });
  assert.deepEqual(next.decisions, s.decisions);
  assert.deepEqual(next.used, s.used);
  assert.equal(next.deletedCount, 0);
});
test("unknown deletion does not count success, clear candidates, or allow another job", () => {
  const s = reconcileDeletion(deleting(), { kind: "unknown" });
  assert.equal(Object.keys(s.decisions).length, 2);
  assert.equal(s.deletedCount, 0);
  assert.throws(() => beginDeletion(s, ["p0"], "j2", c.now));
});
test("partial reconciliation removes only proven deletions and cannot count them twice", () => {
  const s = reconcileDeletion(deleting(), {
    kind: "confirmed",
    deleted: ["p0"],
  });
  assert.equal(s.deletion?.status, "partial");
  assert.equal(s.deletedCount, 1);
  assert.equal(s.decisions.p1?.choice, "candidate");
  assert.equal(
    reconcileDeletion(s, { kind: "confirmed", deleted: ["p0"] }).deletedCount,
    1,
  );
});
test("unexpected deletion result IDs are rejected", () => {
  assert.throws(() =>
    reconcileDeletion(deleting(), { kind: "confirmed", deleted: ["intruder"] }),
  );
});
test("full confirmed deletion invalidates undo; quota stays unchanged", () => {
  const s = reconcileDeletion(deleting(), {
    kind: "confirmed",
    deleted: ["p0", "p1"],
  });
  assert.equal(s.deletedCount, 2);
  assert.equal(s.used.length, 2);
  assert.equal(s.session?.steps.length, 0);
});
for (const kind of ["free", "unknown", "expired", "revoked"] as const)
  test(`${kind} cannot unlock Pro`, () => {
    assert.equal(hasPro({ kind, verified: true }, c.now), false);
  });
test("grace ends at its verified expiration; renewal off does not revoke an active period", () => {
  assert.equal(hasPro({ ...pro, autoRenew: false }, c.now), true);
  assert.equal(
    hasPro({ ...pro, kind: "grace", expiresAt: c.now }, c.now),
    false,
  );
});
const product: StoreProduct = {
  id: "year",
  period: "year",
  displayPrice: "￥2,400",
  price: 2400,
  currency: "JPY",
  eligibility: "eligible",
  trialDays: 7,
};
test("paywall never invents prices or eligibility; ineligible purchase is explicit", () => {
  assert.equal(productCTA().enabled, false);
  assert.equal(
    productCTA({ ...product, eligibility: "unknown" }).enabled,
    false,
  );
  assert.equal(productCTA(product).label, "7日間無料で試す");
  const p = productCTA({ ...product, eligibility: "ineligible" });
  assert.equal(p.trial, false);
  assert.match(p.disclosure, /登録時に/);
  assert.equal(
    productCTA({ ...product, trialDays: 3 }).label,
    "3日間無料で試す",
  );
  assert.equal(productCTA({ ...product, trialDays: 0 }).trial, false);
});
test("trial reminder uses verified expiration; no past, unsolicited or canceled notifications", () => {
  assert.equal(
    trialReminderAt(pro, true, true, c.now),
    pro.expiresAt - 48 * 3600000,
  );
  assert.equal(trialReminderAt(pro, false, true, c.now), null);
  assert.equal(trialReminderAt(pro, true, false, c.now), null);
  assert.equal(
    trialReminderAt({ ...pro, autoRenew: false }, true, true, c.now),
    null,
  );
  assert.equal(trialReminderAt(pro, true, true, pro.expiresAt), null);
});
test("calendar validation rejects impossible dates and backwards ranges", () => {
  assert.ok(validateScopeDates("2026-02-30", "2026-03-01").error);
  assert.ok(validateScopeDates("2026-03-03", "2026-03-01").error);
  assert.ok(!validateScopeDates("2026-02-28", "2026-03-01").error);
});
function sqlite() {
  const native = new DatabaseSync(":memory:");
  const db: SqlConnection = {
    exec: async (sql) => {
      native.exec(sql);
    },
    run: async (sql, params) => {
      native.prepare(sql).run(...params);
    },
    all: async <T>(sql: string, params = []) =>
      native.prepare(sql).all(...params) as T[],
    transaction: async (work) => {
      native.exec("BEGIN IMMEDIATE");
      try {
        await work(db);
        native.exec("COMMIT");
      } catch (e) {
        native.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { native, db };
}
test("production SQL persistence survives process reconstruction including pending deletion", async () => {
  const { native, db } = sqlite();
  const store = new SqlReviewPersistence(db);
  await store.init();
  await store.save(initialState(c), deleting());
  const reloaded = await new SqlReviewPersistence(db).load();
  assert.deepEqual(reloaded, deleting());
  native.close();
});
test("SQL write failure rolls back decisions, cursor and quota together", async () => {
  const { native, db } = sqlite();
  const store = new SqlReviewPersistence(db);
  await store.init();
  const s = active();
  await store.save(initialState(c), s);
  native.exec(
    "CREATE TRIGGER fail_meta BEFORE UPDATE ON meta BEGIN SELECT RAISE(ABORT, 'disk full'); END;",
  );
  await assert.rejects(
    () => store.save(s, decide(s, "p0", "candidate", free, c)),
    /disk full/,
  );
  assert.deepEqual(await store.load(), s);
  native.close();
});
test("controller does not publish failed saves and rejects overlapping writes", async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const controller = new ReviewController(active(), {
    load: async () => null,
    save: async () => {
      await gate;
      throw new Error("disk full");
    },
  });
  const first = controller.mutate((s) => decide(s, "p0", "keep", free, c));
  await assert.rejects(() => controller.mutate((s) => s), /保存/);
  release();
  await assert.rejects(first, /disk full/);
  assert.equal(controller.state.session?.cursor, 0);
  assert.equal(controller.state.used.length, 0);
});
for (const count of [1000, 10000])
  test(`${count} decisions persist and reload using production schema`, async () => {
    const { native, db } = sqlite();
    const store = new SqlReviewPersistence(db);
    await store.init();
    const s = initialState(c);
    s.decisions = Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        `asset-${i}`,
        { choice: i % 2 ? "candidate" : "keep", at: c.now, sessionId: "large" },
      ]),
    );
    await store.save(initialState(c), s);
    assert.equal(Object.keys((await store.load())!.decisions).length, count);
    native.close();
  });
