import { config } from "../config.ts";
import type { Clock, Entitlement, ReviewState, StoreProduct } from "./types.ts";
export function clock(at = new Date()): Clock {
  return {
    now: at.getTime(),
    day: `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}`,
    timezoneOffset: at.getTimezoneOffset(),
  };
}
export function hasPro(e: Entitlement, now: number): boolean {
  return (
    e.verified &&
    (e.kind === "legacy" ||
      ("expiresAt" in e && Number.isFinite(e.expiresAt) && e.expiresAt > now))
  );
}
export function remaining(s: ReviewState): number {
  return Math.max(0, config.freeDaily - new Set(s.used).size);
}
export function mayDecide(
  s: ReviewState,
  id: string,
  e: Entitlement,
  now: number,
): boolean {
  return hasPro(e, now) || s.used.includes(id) || remaining(s) > 0;
}
export function refreshDay(s: ReviewState, c: Clock): ReviewState {
  // Persist a high-water calendar day. Changing timezone cannot itself mint a new allowance.
  const changedZone = c.timezoneOffset !== s.timezoneOffset;
  const block =
    changedZone && c.day > s.blockResetThrough ? c.day : s.blockResetThrough;
  const canAdvance =
    c.now >= s.lastWallTime && !changedZone && c.day > s.day && c.day > block;
  return {
    ...s,
    day: canAdvance ? c.day : s.day,
    used: canAdvance ? [] : s.used,
    lastWallTime: Math.max(s.lastWallTime, c.now),
    timezoneOffset: c.timezoneOffset,
    blockResetThrough: block,
  };
}
export function batchSize(
  s: ReviewState,
  e: Entitlement,
  now: number,
  available: number,
): number {
  return Math.max(
    0,
    Math.min(
      available,
      hasPro(e, now)
        ? s.settings.batch
        : Math.min(config.freeBatch, remaining(s)),
    ),
  );
}
export function productCTA(p?: StoreProduct): {
  enabled: boolean;
  trial: boolean;
  label: string;
  disclosure: string;
} {
  if (!p || !p.displayPrice || p.eligibility === "unknown")
    return {
      enabled: false,
      trial: false,
      label: "購入条件を確認中",
      disclosure:
        "確認が終わるまで申し込みはできません。無料のまま利用できます。",
    };
  const period = p.period === "year" ? "年" : "月";
  const trial = p.eligibility === "eligible" && p.trialDays > 0;
  return {
    enabled: true,
    trial,
    label: trial
      ? `${p.trialDays}日間無料で試す`
      : `${p.displayPrice} / ${period}で登録する`,
    disclosure: `${trial ? `無料体験後は` : `登録時に`}${p.displayPrice} / ${period}。解約しない限り自動更新されます。`,
  };
}
export function trialReminderAt(
  e: Entitlement,
  optedIn: boolean,
  granted: boolean,
  now: number,
): number | null {
  if (!optedIn || !granted || e.kind !== "trial" || !e.verified || !e.autoRenew)
    return null;
  const at = e.expiresAt - 48 * 60 * 60 * 1000;
  return at > now ? at : null;
}
export function validateScopeDates(
  start: string,
  end: string,
): { start?: number; end?: number; error?: string } {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const [y, m, d] = value.split("-").map(Number) as [number, number, number];
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y &&
      date.getMonth() === m - 1 &&
      date.getDate() === d
      ? date.getTime()
      : NaN;
  };
  const a = parse(start),
    b = parse(end);
  if (!Number.isFinite(a) || !Number.isFinite(b))
    return { error: "日付を YYYY-MM-DD で入力してください。" };
  if (a > b) return { error: "終了日は開始日以降にしてください。" };
  const exclusive = new Date(b);
  exclusive.setDate(exclusive.getDate() + 1);
  return { start: a, end: exclusive.getTime() };
}
