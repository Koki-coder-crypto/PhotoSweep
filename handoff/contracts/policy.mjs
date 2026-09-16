/**
 * PhotoSweep handoff: executable product-policy REFERENCE, not app or StoreKit code.
 * No native APIs, network, storage or purchase side effects.
 * Codex must port these invariants to actual production functions and test them directly.
 */
export const FREE_LIMIT = 50;
export const ALWAYS_FREE = new Set([
  'view', 'skip', 'undo', 'reviewCandidates', 'removeCandidate', 'deleteSelected',
  'save', 'resume', 'help', 'manageSubscription', 'restorePurchase', 'settings',
]);
function nonNegativeInt(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`${name} must be a non-negative integer`);
  return value;
}
function id(value) {
  if (typeof value !== 'string' || !value.length) throw new TypeError('A nonempty asset id is required');
  return value;
}
export function hasProAccess(entitlement, nowMs) {
  if (!Number.isFinite(nowMs)) throw new TypeError('nowMs required');
  const e = entitlement;
  if (!e || e.verified !== true || e.revoked === true) return false;
  if (e.kind === 'legacy_lifetime') return true;
  if (['trial_active', 'subscribed'].includes(e.kind)) return Number.isFinite(e.expiresAtMs) && nowMs < e.expiresAtMs;
  if (e.kind === 'grace') return Number.isFinite(e.graceExpiresAtMs) && nowMs < e.graceExpiresAtMs;
  return false;
}
/** Day bucket is injected after local-calendar/clock policy is applied by the app. */
export function recordDecision(ledger, event, pro = false) {
  if (!ledger || !Array.isArray(ledger.assetIds)) throw new TypeError('ledger.assetIds required');
  if (!event || typeof event.kind !== 'string') throw new TypeError('event required');
  const current = [...new Set(ledger.assetIds.map(id))];
  const base = {dayKey: ledger.dayKey, assetIds: current};
  if (!['keep', 'candidate'].includes(event.kind)) return {allowed: true, charged: false, ledger: base};
  const assetId = id(event.assetId);
  if (event.persisted !== true) return {allowed: false, charged: false, reason: 'not_persisted', ledger: base};
  if (pro || current.includes(assetId)) return {allowed: true, charged: false, ledger: base};
  if (current.length >= FREE_LIMIT) return {allowed: false, charged: false, reason: 'quota', ledger: base};
  return {allowed: true, charged: true, ledger: {...base, assetIds: [...current, assetId]}};
}
export function quotaRemaining(ledger) { return Math.max(0, FREE_LIMIT - new Set(ledger.assetIds).size); }
export function mayUse(action, remaining, pro = false) {
  nonNegativeInt(remaining, 'remaining');
  if (ALWAYS_FREE.has(action)) return true;
  if (action === 'newDecision') return pro || remaining > 0;
  if (['customDate', 'changeSort', 'customBatch'].includes(action)) return pro;
  return false;
}
export function batchSize({requested = 20, remainingAssets, freeRemaining, pro = false}) {
  nonNegativeInt(remainingAssets, 'remainingAssets'); nonNegativeInt(freeRemaining, 'freeRemaining');
  if (![20, 50, 100].includes(requested)) throw new RangeError('supported batches: 20/50/100');
  return Math.min(pro ? requested : 20, remainingAssets, pro ? Infinity : freeRemaining);
}
/** No candidate price fallback, and no free-trial promise while eligibility is unknown. */
export function offerView({product, eligibility, purchaseAllowed = true}) {
  if (!purchaseAllowed) return {mode: 'blocked', reason: 'purchase_restricted'};
  if (!product || !product.displayPrice || !['month', 'year'].includes(product.period)) return {mode: 'blocked', reason: 'product_unavailable'};
  if (!['eligible', 'ineligible'].includes(eligibility)) return {mode: 'blocked', reason: 'eligibility_unknown'};
  const trial = eligibility === 'eligible' && product.introOffer?.mode === 'freeTrial'
    && product.introOffer?.unit === 'week' && product.introOffer?.value === 1;
  return {mode: trial ? 'trial' : 'paid', displayPrice: product.displayPrice, period: product.period, trialDays: trial ? 7 : 0};
}
/** Real runtime must validate returned IDs and reconcile ambiguous native outcomes. */
export function reconcileDeletion(requestedIds, outcome) {
  const requested = [...new Set(requestedIds.map(id))];
  if (outcome?.kind === 'cancelled') return {state: 'cancelled', deletedIds: [], remainingIds: requested, celebrate: false};
  if (outcome?.kind === 'failed') return {state: 'failed', deletedIds: [], remainingIds: requested, celebrate: false};
  if (outcome?.kind !== 'confirmed' || !Array.isArray(outcome.deletedIds)) return {state: 'unknown', deletedIds: [], remainingIds: requested, celebrate: false};
  const deleted = [...new Set(outcome.deletedIds.map(id))];
  if (deleted.some(x => !requested.includes(x))) throw new Error('Native result contains an unrequested asset');
  const remaining = requested.filter(x => !deleted.includes(x));
  return {state: remaining.length ? (deleted.length ? 'partial' : 'failed') : 'succeeded', deletedIds: deleted, remainingIds: remaining, celebrate: requested.length > 0 && remaining.length === 0};
}
export function feedback(event, enabled = true) {
  if (!enabled) return 'none';
  if (['keep_committed', 'candidate_committed'].includes(event)) return 'light';
  if (['review_completed', 'delete_confirmed', 'entitlement_verified'].includes(event)) return 'success';
  return 'none';
}
export function upsellPolicy({trigger, pro = false, blocked = false, alreadyShownToday = false, explicit = false}) {
  if (pro || blocked) return 'none';
  if (explicit && ['pro_feature', 'home_pro', 'settings_pro', 'result_pro', 'limit_pro'].includes(trigger)) return 'open_paywall';
  if (trigger === 'result') return 'inline_link';
  if (trigger === 'quota40') return 'inline_notice';
  if (trigger === 'quota50' && !alreadyShownToday) return 'limit_screen';
  return 'none';
}
export function trialReminder({verified, trial, endsAtMs, nowMs, optedIn, permission, autoRenew}) {
  if (!verified || !trial || !optedIn || permission !== 'granted' || autoRenew !== true) return null;
  if (!Number.isFinite(endsAtMs) || !Number.isFinite(nowMs)) return null;
  const at = endsAtMs - 48 * 60 * 60 * 1000;
  return at > nowMs ? at : null;
}
