import type {
  Choice,
  Clock,
  Entitlement,
  ReviewPersistence,
  ReviewState,
  Scope,
} from "./types.ts";
import {
  batchSize,
  hasPro,
  mayDecide,
  refreshDay,
  remaining,
} from "./policy.ts";
export class ReviewError extends Error {
  constructor(
    public code: "quota" | "busy" | "empty" | "stale" | "locked",
    message: string,
  ) {
    super(message);
  }
}
export function initialState(c: Clock): ReviewState {
  return {
    version: 1,
    onboarded: false,
    guided: false,
    decisions: {},
    day: c.day,
    lastWallTime: c.now,
    timezoneOffset: c.timezoneOffset,
    blockResetThrough: "",
    used: [],
    quotaNoticeDay: "",
    settings: {
      haptics: true,
      sound: false,
      reduceMotion: false,
      weekly: false,
      trialReminder: false,
      batch: 20,
    },
    deletedCount: 0,
    history: [],
  };
}
export function startSession(
  s: ReviewState,
  ids: string[],
  scope: Scope,
  e: Entitlement,
  c: Clock,
  sessionId: string,
): ReviewState {
  const base = refreshDay(s, c);
  if (
    base.deletion?.status === "pending" ||
    base.deletion?.status === "unknown"
  )
    throw new ReviewError("locked", "削除結果を先に確認してください。");
  const available = [...new Set(ids)].filter((id) => !base.decisions[id]);
  const target = batchSize(base, e, c.now, available.length);
  if (!target)
    throw new ReviewError(
      available.length ? "quota" : "empty",
      available.length
        ? "今日の無料分を整理しました。"
        : "この範囲の写真は見直し済みです。",
    );
  const safeScope = hasPro(e, c.now)
    ? scope
    : {
        ...(scope.month ? { month: scope.month } : {}),
        ...(scope.screenshotsOnly ? { screenshotsOnly: true } : {}),
        order: "newest" as const,
      };
  return {
    ...base,
    session: {
      id: sessionId,
      ids: available.slice(0, target),
      cursor: 0,
      target,
      scope: safeScope,
      startedAt: c.now,
      status: "active",
      steps: [],
    },
  };
}
function withSummary(s: ReviewState): ReviewState {
  const session = s.session;
  if (!session || session.cursor < session.ids.length) return s;
  const kept = session.steps.filter((x) => x.choice === "keep").length;
  const candidates = session.steps.filter(
    (x) => x.choice === "candidate",
  ).length;
  return {
    ...s,
    session: { ...session, status: "summary" },
    history: [
      ...s.history.filter((h) => h.id !== session.id),
      { id: session.id, at: session.startedAt, kept, candidates },
    ],
  };
}
export function decide(
  s: ReviewState,
  assetId: string,
  choice: Choice | "skip",
  e: Entitlement,
  c: Clock,
): ReviewState {
  const base = refreshDay(s, c),
    session = base.session;
  if (
    !session ||
    session.status === "summary" ||
    session.ids[session.cursor] !== assetId
  )
    throw new ReviewError("stale", "写真の状態が変わりました。");
  if (
    base.deletion?.status === "pending" ||
    base.deletion?.status === "unknown"
  )
    throw new ReviewError("locked", "削除結果を確認中です。");
  if (choice !== "skip" && !mayDecide(base, assetId, e, c.now))
    throw new ReviewError(
      "quota",
      "今日の無料分を整理しました。候補の確認・削除は引き続き使えます。",
    );
  const previous = base.decisions[assetId];
  const used =
    choice !== "skip" && !hasPro(e, c.now) && !base.used.includes(assetId)
      ? [...base.used, assetId]
      : base.used;
  return withSummary({
    ...base,
    used,
    quotaNoticeDay:
      !hasPro(e, c.now) && used.length >= 50 && base.used.length < 50
        ? base.day
        : base.quotaNoticeDay,
    decisions:
      choice === "skip"
        ? base.decisions
        : {
            ...base.decisions,
            [assetId]: { choice, at: c.now, sessionId: session.id },
          },
    session: {
      ...session,
      status: "active",
      cursor: session.cursor + 1,
      steps: [
        ...session.steps,
        {
          id: assetId,
          ...(previous ? { previous } : {}),
          ...(choice === "skip" ? {} : { choice }),
          cursor: session.cursor,
        },
      ],
    },
  });
}
export function undo(s: ReviewState): ReviewState {
  if (s.deletion?.status === "pending" || s.deletion?.status === "unknown")
    throw new ReviewError("locked", "削除結果を確認中です。");
  const session = s.session,
    step = session?.steps.at(-1);
  if (!session || !step) return s;
  const decisions = { ...s.decisions };
  if (step.previous) decisions[step.id] = step.previous;
  else delete decisions[step.id];
  return {
    ...s,
    decisions,
    history: s.history.filter((h) => h.id !== session.id),
    session: {
      ...session,
      cursor: step.cursor,
      steps: session.steps.slice(0, -1),
      status: "active",
    },
  };
}
export function removeCandidate(s: ReviewState, id: string): ReviewState {
  if (s.deletion?.status === "pending" || s.deletion?.status === "unknown")
    throw new ReviewError("locked", "削除結果を確認中です。");
  const decision = s.decisions[id];
  if (!decision || decision.choice !== "candidate") return s;
  return {
    ...s,
    decisions: { ...s.decisions, [id]: { ...decision, choice: "keep" } },
  };
}
// A grid selection is committed atomically before any OS deletion request.
export function stageCandidates(
  s: ReviewState,
  ids: string[],
  e: Entitlement,
  c: Clock,
): ReviewState {
  const base = refreshDay(s, c);
  if (
    base.deletion?.status === "pending" ||
    base.deletion?.status === "unknown"
  )
    throw new ReviewError("locked", "前の削除結果を確認してください。");
  const unique = [...new Set(ids)];
  if (!unique.length) throw new ReviewError("empty", "写真を選んでください。");
  const pro = hasPro(e, c.now);
  const fresh = unique.filter(
    (id) => !base.decisions[id] && !base.used.includes(id),
  );
  if (!pro && fresh.length > remaining(base))
    throw new ReviewError("quota", "今日の無料枚数を超えています。");
  const decisions = { ...base.decisions };
  unique.forEach((id) => {
    decisions[id] = {
      choice: "candidate",
      at: c.now,
      sessionId: `selection-${c.now}`,
    };
  });
  const used = pro ? base.used : [...base.used, ...fresh];
  return {
    ...base,
    decisions,
    used,
    quotaNoticeDay:
      !pro && remaining({ ...base, used }) === 0
        ? base.day
        : base.quotaNoticeDay,
  };
}
export function beginDeletion(
  s: ReviewState,
  ids: string[],
  jobId: string,
  now: number,
): ReviewState {
  if (s.deletion?.status === "pending" || s.deletion?.status === "unknown")
    throw new ReviewError("locked", "前の削除結果を確認してください。");
  const unique = [...new Set(ids)];
  if (
    !unique.length ||
    unique.some((id) => s.decisions[id]?.choice !== "candidate")
  )
    throw new ReviewError(
      "stale",
      "候補が変わりました。もう一度確認してください。",
    );
  return {
    ...s,
    deletion: {
      id: jobId,
      ids: unique,
      at: now,
      status: "pending",
      deleted: [],
      remaining: unique,
    },
  };
}
export function reconcileDeletion(
  s: ReviewState,
  result: { kind: "cancelled" | "unknown" | "confirmed"; deleted?: string[] },
): ReviewState {
  const job = s.deletion;
  if (!job || !["pending", "unknown"].includes(job.status)) return s;
  if (result.kind !== "confirmed")
    return { ...s, deletion: { ...job, status: result.kind } };
  const deleted = [...new Set(result.deleted || [])];
  if (deleted.some((id) => !job.ids.includes(id)))
    throw new Error("削除依頼にない写真が結果に含まれています。");
  const decisions = { ...s.decisions };
  deleted.forEach((id) => {
    delete decisions[id];
  });
  const remaining = job.ids.filter((id) => !deleted.includes(id));
  // Invalidate undo after native deletion; it must never resurrect a removed asset.
  return {
    ...s,
    decisions,
    deletedCount: s.deletedCount + deleted.length,
    session: s.session
      ? {
          ...s.session,
          steps: [],
          status: "paused",
          ids: s.session.ids.filter((id) => !deleted.includes(id)),
          cursor: Math.max(
            0,
            s.session.cursor -
              s.session.ids
                .slice(0, s.session.cursor)
                .filter((id) => deleted.includes(id)).length,
          ),
        }
      : undefined,
    deletion: {
      ...job,
      status: remaining.length ? "partial" : "done",
      deleted,
      remaining,
    },
  };
}
export class ReviewController {
  private busy = false;
  constructor(
    public state: ReviewState,
    private persistence: ReviewPersistence,
  ) {}
  async mutate(
    transform: (state: ReviewState) => ReviewState,
  ): Promise<ReviewState> {
    if (this.busy) throw new ReviewError("busy", "保存しています。");
    this.busy = true;
    try {
      const next = transform(this.state);
      await this.persistence.save(this.state, next);
      this.state = next;
      return next;
    } finally {
      this.busy = false;
    }
  }
}
