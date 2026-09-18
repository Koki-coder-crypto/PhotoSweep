import fs from 'node:fs';
import { initialState, stageCandidates, decide, undo, beginDeletion, reconcileDeletion, startSession } from '../src/domain/review.ts';
import { refreshDay } from '../src/domain/policy.ts';
import type { ReviewState, Clock, Entitlement } from '../src/domain/types.ts';

const clock: Clock = { now: 1790000000000, day: '2026-09-21', timezoneOffset: -540 };
const free: Entitlement = { kind: 'free', verified: true };
const pro: Entitlement = { kind: 'legacy', verified: true, productId: 'com.kokicoder.photosweep.pro.lifetime' };
const cases: unknown[] = [];
function add(name: string, input: ReviewState, operation: string, ids: string[], entitlement: Entitlement, fn: () => ReviewState) {
  try { cases.push({ name, input, operation, ids, pro: entitlement === pro, expected: fn(), error: false }); }
  catch { cases.push({ name, input, operation, ids, pro: entitlement === pro, error: true }); }
}
for (const used of [0, 29, 30, 31, 50]) {
  const input = { ...initialState(clock), used: Array.from({ length: used }, (_, i) => `p${i}`) };
  add(`photo-${used}-plus-one`, input, 'stage', ['new-photo'], free, () => stageCandidates(input, ['new-photo'], free, clock));
  add(`photo-${used}-pro`, input, 'stage', ['new-photo'], pro, () => stageCandidates(input, ['new-photo'], pro, clock));
}
for (const used of [0, 4, 5, 6]) {
  const input = initialState(clock);
  input.used = Array.from({ length: used }, (_, i) => `v${i}`);
  input.mediaKinds = Object.fromEntries([...input.used, 'new-video'].map(id => [id, 'video']));
  add(`video-${used}-mixed`, input, 'stage', ['new-video', 'new-photo'], free, () => stageCandidates(input, ['new-video', 'new-photo'], free, clock));
}
let review = startSession(initialState(clock), ['a', 'b'], { month: '2026-09', order: 'newest' }, free, clock, 'fixture-session');
add('keep', review, 'keep', ['a'], free, () => decide(review, 'a', 'keep', free, clock));
add('skip', review, 'skip', ['a'], free, () => decide(review, 'a', 'skip', free, clock));
review = decide(review, 'a', 'candidate', free, clock);
add('undo-preserves-used', review, 'undo', [], free, () => undo(review));
add('rejudge-does-not-charge', review, 'stage', ['a'], free, () => stageCandidates(review, ['a'], free, clock));
const pending = beginDeletion(review, ['a'], 'fixture-deletion', clock.now);
add('cancel-deletion', pending, 'cancel', [], free, () => reconcileDeletion(pending, { kind: 'cancelled' }));
add('unknown-deletion', pending, 'unknown', [], free, () => reconcileDeletion(pending, { kind: 'unknown' }));
add('confirmed-deletion', pending, 'delete', ['a'], free, () => reconcileDeletion(pending, { kind: 'confirmed', deleted: ['a'] }));
fs.mkdirSync('native/Tests/Fixtures', { recursive: true });
fs.writeFileSync('native/Tests/Fixtures/legacy-engine.json', JSON.stringify(cases, null, 2) + '\n');
console.log(`Generated ${cases.length} parity fixtures by invoking the production 1.3 functions.`);
