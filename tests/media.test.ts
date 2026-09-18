import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, startSession, decide, undo, stageCandidates, beginDeletion, reconcileDeletion, ReviewController } from '../src/domain/review.ts';
import { remaining, refreshDay } from '../src/domain/policy.ts';
import { migrateMedia, registerMedia, sessionKey, summarizeSizes, mayRequestReview } from '../src/domain/media.ts';
import { mayStageOriginal } from '../src/domain/compression.ts';
import type { Photo, ReviewState } from '../src/domain/types.ts';
const c = { now: Date.parse('2026-09-18T12:00:00+09:00'), day: '2026-09-18', timezoneOffset: -540 };
const free = { kind: 'free', verified: true } as const;
const media: Photo[] = Array.from({ length: 45 }, (_, i) => ({ id: `a${i}`, kind: i < 35 ? 'photo' : 'video', uri: '', width: 100, height: 100, screenshot: false, createdAt: c.now }));
const base = () => registerMedia(initialState(c), media);
test('photos 29/30/31 and videos 4/5/6 are independent, including atomic mixed selection', () => {
  let s = stageCandidates(base(), media.slice(0, 29).map(x => x.id), free, c);
  s = stageCandidates(s, media.slice(35, 39).map(x => x.id), free, c);
  assert.equal(remaining(s), 1); assert.equal(remaining(s, 'video'), 1);
  s = stageCandidates(s, ['a29', 'a39'], free, c);
  assert.equal(remaining(s), 0); assert.equal(remaining(s, 'video'), 0);
  assert.throws(() => stageCandidates(s, ['a30'], free, c));
  assert.throws(() => stageCandidates(s, ['a40'], free, c));
  assert.equal(stageCandidates(s, ['a29', 'a39'], free, c).used.length, 35);
});
test('one exhausted type does not block the other and mixed sessions cannot exceed either allowance', () => {
  let s = stageCandidates(base(), media.slice(0, 30).map(x => x.id), free, c);
  s = startSession(s, media.map(x => x.id), { order: 'newest' }, free, c, 'mixed');
  assert.equal(s.session?.target, 5);
  assert.deepEqual(s.session?.ids, ['a35', 'a36', 'a37', 'a38', 'a39']);
  s = decide(s, 'a35', 'candidate', free, c); s = undo(s); s = decide(s, 'a35', 'keep', free, c);
  assert.equal(remaining(s, 'video'), 4);
});
test('legacy migration retains over-limit usage and positions without replaying full onboarding', () => {
  const old: ReviewState = { ...initialState(c), version: 1, used: Array.from({ length: 49 }, (_, i) => `old${i}`), onboarded: true, guided: true };
  const next = migrateMedia(old); assert.equal(next.version, 2); assert.equal(remaining(next), 0); assert.equal(remaining(next, 'video'), 5);
  assert.deepEqual(next.used, old.used); assert.equal(next.onboarded, true); assert.equal(migrateMedia(next), next);
  assert.equal(remaining(refreshDay(next, { ...c, now: c.now + 86400000, day: '2026-09-19' })), 30);
});
test('switching month and reconstructing the controller preserves the saved cursor', async () => {
  let saved = base(); const persistence = { load: async () => saved, save: async (_: ReviewState, next: ReviewState) => { saved = JSON.parse(JSON.stringify(next)); } };
  let controller = new ReviewController(saved, persistence);
  const september = { month: '2026-09', order: 'newest' } as const, august = { month: '2026-08', order: 'newest' } as const;
  await controller.mutate(s => startSession(s, ['a0', 'a1'], september, free, c, 'sept'));
  await controller.mutate(s => decide(s, 'a0', 'keep', free, c));
  await controller.mutate(s => startSession(s, ['a2'], august, free, c, 'aug'));
  controller = new ReviewController(await persistence.load(), persistence);
  await controller.mutate(s => startSession(s, ['a1'], september, free, c, 'new'));
  assert.equal(controller.state.session?.id, 'sept'); assert.equal(controller.state.session?.cursor, 1);
  assert.equal(controller.state.monthSessions?.[sessionKey(august)]?.id, 'aug');
});
test('confirmed deletion stores only confirmed count/bytes once and leaves inaccessible sizes unknown', () => {
  let s = stageCandidates(base(), ['a0', 'a35'], free, c);
  s = beginDeletion(s, ['a0', 'a35'], 'delete-1', c.now);
  s.deletion!.snapshot = { a0: { kind: 'photo', size: { bytes: 100, quality: 'measured-resource', basis: 'original-resource', modifiedAt: 0 } }, a35: { kind: 'video' } };
  const cancelled = reconcileDeletion(s, { kind: 'cancelled' }); assert.equal(cancelled.outcomes?.length, 0);
  s = reconcileDeletion(s, { kind: 'confirmed', deleted: ['a35'] });
  assert.equal(s.outcomes?.[0]?.videoCount, 1); assert.equal(s.outcomes?.[0]?.knownBytes, 0); assert.equal(s.outcomes?.[0]?.unknownCount, 1);
  assert.equal(reconcileDeletion(s, { kind: 'confirmed', deleted: ['a35'] }).outcomes?.length, 1);
  assert.equal(summarizeSizes(['a0', 'a0'], { a0: s.deletion!.snapshot!.a0!.size! }).knownBytes, 100);
});
test('review policy requires two different success days and honors cooldown/version', () => {
  const outcome = { id: 'one', at: c.now, photoCount: 1, videoCount: 0, knownBytes: 0, unknownCount: 1, estimated: false };
  const s = { ...base(), outcomes: [outcome, { ...outcome, id: 'two' }] };
  assert.equal(mayRequestReview(s, '1.3.0', c.now), false);
  s.outcomes[0]!.at -= 86400000; assert.equal(mayRequestReview(s, '1.3.0', c.now), true);
  assert.equal(mayRequestReview({ ...s, reviewPrompt: { at: c.now - 119 * 86400000, version: '1.2.0' } }, '1.3.0', c.now), false);
  assert.equal(mayRequestReview({ ...s, reviewPrompt: { at: 0, version: '1.3.0' } }, '1.3.0', c.now), false);
});
test('compression never permits original staging before a distinct saved asset is confirmed', () => {
  for (const phase of ['idle', 'preparing', 'encoding', 'ready', 'saving', 'unknown', 'failed', 'cancelled', 'not-smaller'] as const)
    assert.equal(mayStageOriginal({ id: 'j', assetId: 'original', savedId: 'new', phase }), false);
  assert.equal(mayStageOriginal({ id: 'j', assetId: 'original', savedId: 'original', phase: 'saved' }), false);
  assert.equal(mayStageOriginal({ id: 'j', assetId: 'original', savedId: 'new', phase: 'saved' }), true);
});


test('paged session source reaches videos after 1,000 / 10,000 exhausted-type photos', async () => {
  const { sessionSource } = await import('../src/domain/sessionSource.ts');
  for (const count of [1000, 10000]) {
    const photos = Array.from({ length: count + 5 }, (_, i) => ({ ...media[0]!, id: `page-${i}`, kind: i < count ? 'photo' as const : 'video' as const }));
    const s = stageCandidates(base(), media.slice(0, 30).map(x => x.id), free, c);
    let calls = 0;
    const repository = { page: async (_: unknown, after?: string, limit = 250) => {
      calls++; const offset = Number(after || 0);
      return { items: photos.slice(offset, offset + limit), next: offset + limit < photos.length ? String(offset + limit) : undefined };
    } } as import('../src/domain/types').PhotoRepository;
    const found = await sessionSource(repository, s, { order: 'newest' }, free, c);
    const next = startSession(registerMedia(s, found.photos), found.ids, { order: 'newest' }, free, c, 'deep');
    assert.equal(next.session?.ids.length, 5);
    assert.ok(next.session?.ids.every(id => id.startsWith(`page-${count}`) || Number(id.slice(5)) >= count));
    assert.equal(calls, Math.ceil(photos.length / 250));
  }
});

test('expired Pro resumes only the remaining free allowance', () => {
  const scope = { month: '2026-09', order: 'newest' } as const;
  let s = base();
  s.monthSessions = { [sessionKey(scope)]: { id: 'pro', ids: media.map(x => x.id), cursor: 0, target: 45, scope, startedAt: c.now, status: 'paused', steps: [] } };
  s = startSession(s, media.map(x => x.id), scope, free, c, 'free');
  assert.ok((s.session?.target || 0) <= 20);
  assert.ok((s.session?.ids.filter(id => s.mediaKinds?.[id] === 'video').length || 0) <= 5);
  assert.ok((s.session?.ids.filter(id => s.mediaKinds?.[id] === 'photo').length || 0) <= 30);
});
