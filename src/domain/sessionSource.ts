import { hasPro, refreshDay, remaining } from './policy.ts';
import { sessionKey } from './media.ts';
import type { Clock, Entitlement, Photo, PhotoRepository, ReviewState, Scope } from './types.ts';

// Page past exhausted media types, and keep searching for a saved month's position.
export async function sessionSource(repository: PhotoRepository, state: ReviewState, scope: Scope, entitlement: Entitlement, clock: Clock) {
  const base = refreshDay(state, clock), pro = hasPro(entitlement, clock.now);
  const budget = { photo: remaining(base), video: remaining(base, 'video') };
  const saved = base.monthSessions?.[sessionKey(scope)];
  const pending = new Set(saved?.status !== 'summary' ? saved?.ids.slice(saved.cursor) : []);
  const used = new Set(base.used), seen = new Set<string>();
  const ids: string[] = [], photos: Photo[] = [];
  let after: string | undefined, eligible = 0;
  const target = pro ? base.settings.batch : Math.max(1, Math.min(20, budget.photo + budget.video));
  do {
    const page = await repository.page(scope, after, 250);
    for (const photo of page.items) {
      pending.delete(photo.id);
      if (seen.has(photo.id)) continue;
      seen.add(photo.id); photos.push(photo);
      if (base.decisions[photo.id]) continue;
      ids.push(photo.id);
      if (pro || used.has(photo.id) || budget[photo.kind || 'photo']-- > 0) eligible++;
    }
    if (page.next && page.next === after) throw new Error('写真一覧を更新してください。');
    after = page.next;
  } while (after && (eligible < target || pending.size > 0));
  return { ids, photos };
}
