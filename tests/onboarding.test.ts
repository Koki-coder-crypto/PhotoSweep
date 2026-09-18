import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { initialState, startSession, decide } from "../src/domain/review.ts";
import { SqlReviewPersistence, type SqlConnection } from "../src/data/sql.ts";
import {
  migrateOnboarding,
  onboardingState,
  finishOnboarding,
  replayOnboarding,
  updateOnboarding,
  needsOnboarding,
  type IntroStep,
} from "../src/domain/onboarding.ts";
const clock = { now: 1000000, day: "2026-09-18", timezoneOffset: -540 };
const free = { kind: "free", verified: true } as const;
function existing() {
  let s = startSession(
    initialState(clock),
    ["p0", "p1", "p2"],
    { order: "newest" },
    free,
    clock,
    "existing",
  );
  s = decide(s, "p0", "candidate", free, clock);
  s.onboarded = true;
  return s;
}
test("fresh and legacy users see v2 once; completion survives reconstruction", () => {
  assert.equal(onboardingState(initialState(clock)).mode, "first");
  const old = existing(),
    next = migrateOnboarding(old);
  assert.equal(onboardingState(next).mode, "upgrade");
  assert.equal(needsOnboarding(next), true);
  assert.equal(next.session, old.session);
  assert.equal(next.decisions, old.decisions);
  assert.equal(next.used, old.used);
  const done = migrateOnboarding(
    JSON.parse(JSON.stringify(finishOnboarding(next))),
  );
  assert.equal(needsOnboarding(done), false);
  assert.deepEqual(done.decisions, old.decisions);
  assert.deepEqual(done.used, old.used);
  assert.deepEqual(done.session, old.session);
});
test("practice and replay retain quota, actual candidates, deletion state and review position", () => {
  const old = existing();
  let s = updateOnboarding(migrateOnboarding(old), {
    step: "compare",
    selected: [1, 2],
    compared: true,
  });
  s = updateOnboarding(s, { step: "swipe", kept: true, candidate: true });
  s = replayOnboarding(finishOnboarding(s));
  assert.equal(onboardingState(s).mode, "replay");
  assert.equal(onboardingState(s).step, "welcome");
  assert.equal(onboardingState(s).homeHintSeen, true);
  assert.deepEqual(s.used, old.used);
  assert.deepEqual(s.decisions, old.decisions);
  assert.deepEqual(s.session, old.session);
  assert.equal(s.deletion, old.deletion);
});
for (const step of [
  "welcome",
  "compare",
  "swipe",
  "permission",
  "discover",
  "pro",
] as IntroStep[])
  test(`SQLite relaunch resumes ${step} and does not erase old records`, async () => {
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
        native.exec("BEGIN");
        try {
          await work(db);
          native.exec("COMMIT");
        } catch (e) {
          native.exec("ROLLBACK");
          throw e;
        }
      },
    };
    const store = new SqlReviewPersistence(db);
    await store.init();
    const old = existing();
    await store.save(initialState(clock), old);
    const migrated = migrateOnboarding((await store.load())!);
    const progress = updateOnboarding(migrated, {
      step,
      selected: [1],
      kept: true,
    });
    await store.save(old, progress);
    const reloaded = migrateOnboarding(
      (await new SqlReviewPersistence(db).load())!,
    );
    assert.equal(onboardingState(reloaded).step, step);
    assert.deepEqual(onboardingState(reloaded).selected, [1]);
    assert.equal(onboardingState(reloaded).kept, true);
    assert.deepEqual(reloaded.session, old.session);
    assert.deepEqual(reloaded.decisions, old.decisions);
    assert.deepEqual(reloaded.used, old.used);
    native.close();
  });
