import type { AssetSize, CleanupOutcome, MediaKind, Photo, ReviewState, Scope } from './types.ts';

export function kindOf(state: ReviewState, id: string): MediaKind { return state.mediaKinds?.[id] || 'photo'; }
export function sessionKey(scope: Scope): string {
  return JSON.stringify([scope.month || '', scope.mediaKind || '', !!scope.screenshotsOnly, !!scope.recordingsOnly, scope.start ?? null, scope.end ?? null, scope.order]);
}
export function migrateMedia(state: ReviewState): ReviewState {
  if (state.version === 2) return state;
  return { ...state, version: 2, mediaKinds: Object.fromEntries(state.used.map(id => [id, 'photo'])),
    monthSessions: state.session ? { [sessionKey(state.session.scope)]: state.session } : {}, sizes: {}, outcomes: [] };
}
export function registerMedia(state: ReviewState, photos: Photo[]): ReviewState {
  const mediaKinds = { ...state.mediaKinds };
  photos.forEach(p => { mediaKinds[p.id] = p.kind || 'photo'; });
  return { ...state, mediaKinds };
}
export function summarizeSizes(ids: string[], sizes: Record<string, AssetSize> = {}) {
  let knownBytes = 0, unknownCount = 0, estimated = false;
  for (const id of new Set(ids)) {
    const s = sizes[id];
    if (!s || s.bytes === null || !Number.isFinite(s.bytes) || s.bytes < 0) unknownCount++;
    else { knownBytes += s.bytes; estimated ||= s.quality !== 'measured-resource'; }
  }
  return { knownBytes, unknownCount, estimated };
}
export function deletionOutcome(state: ReviewState, deleted: string[]): CleanupOutcome {
  const job = state.deletion!;
  const sizes = Object.fromEntries(Object.entries(job.snapshot || {}).flatMap(([id, item]) => item.size ? [[id, item.size]] : []));
  return { id: job.id, at: job.at,
    photoCount: deleted.filter(id => (job.snapshot?.[id]?.kind || kindOf(state, id)) === 'photo').length,
    videoCount: deleted.filter(id => (job.snapshot?.[id]?.kind || kindOf(state, id)) === 'video').length,
    ...summarizeSizes(deleted, sizes), ...(job.freeBefore === undefined ? {} : { freeBefore: job.freeBefore }) };
}
export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  const units = ['KB', 'MB', 'GB', 'TB']; let value = bytes / 1000, i = 0;
  while (value >= 1000 && i < units.length - 1) { value /= 1000; i++; }
  return `${value.toLocaleString('ja-JP', { maximumFractionDigits: 1 })} ${units[i]}`;
}
export function mayRequestReview(state: ReviewState, version: string, now: number): boolean {
  const days = new Set((state.outcomes || []).filter(x => x.photoCount + x.videoCount > 0).map(x => new Date(x.at).toLocaleDateString('sv-SE')));
  return days.size >= 2 && (!state.reviewPrompt || (state.reviewPrompt.version !== version && now - state.reviewPrompt.at >= 120 * 86400000));
}
