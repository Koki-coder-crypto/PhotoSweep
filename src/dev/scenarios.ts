import { onboardingState, type IntroStep } from "../domain/onboarding";
import { initialState } from "../domain/review";
import { clock } from "../domain/policy";
import { config } from "../config";
import type {
  Entitlement,
  Permission,
  ReviewState,
  StoreProduct,
} from "../domain/types";
import screens from "../../handoff/design/screens.json";
import variants from "../../handoff/design/state_variants.json";
export const scenarios = [
  ...[
    ["O01", "はじめる", "カードが集まる導入"],
    ["O02", "見比べる練習", "選択・候補への移動"],
    ["O03", "スワイプの練習", "左右の操作・ボタン・スキップ"],
    ["O04", "写真アクセス", "写真アクセスは説明の後に要求"],
    ["O05", "解析結果", "実際の件数・待たずに先へ"],
    ["O06", "導入後のPro案内", "購入・無料・キャンセルを共通の完了へ"],
    ["N01", "似ている写真", "端末内解析でまとめた写真の比較と選択"],
    ["N02", "同じ画像", "元画像の一致を確認したグループ"],
    ["N03", "すべての写真", "複数選択からOS確認へ直接進む"],
    ["N04", "買い切りプラン", "自動更新なし・総額表示"],
  ].map(([id, title, note]) => ({
    id: id!,
    parent: id!,
    title: title!,
    note: note!,
  })),
  ...screens.map((s) => ({
    id: s.id,
    parent: s.id,
    title: s.title,
    note: s.notes,
  })),
  ...variants.map((v) => ({
    id: `${v.parent}:${v.name}`,
    parent: v.parent,
    title: v.name,
    note: v.rule,
  })),
];
export function scenarioData(id: string) {
  const parent = id.split(":")[0] || "S03",
    variant = id.split(":")[1];
  const c = clock();
  const state = initialState(c);
  state.onboarded = true;
  state.guided = true;
  let entitlement: Entitlement = { kind: "free", verified: true },
    permission: Permission = "full",
    eligibility: StoreProduct["eligibility"] = "eligible";
  let purchaseState:
    | "idle"
    | "pending"
    | "failed"
    | "cancelled"
    | "verified"
    | "restored"
    | "none" = "idle";
  const inReview = [
    "S08",
    "S09",
    "S10",
    "S11",
    "S12",
    "S13",
    "S15",
    "S16",
    "S17",
    "S39",
    "S40",
  ].includes(parent);
  if (inReview) {
    state.session = {
      id: "catalog-session",
      ids: Array.from({ length: 20 }, (_, i) => `demo-${i}`),
      cursor: 8,
      target: 20,
      scope: { order: "newest" },
      startedAt: c.now,
      status: "active",
      steps: [],
    };
    for (let i = 0; i < 8; i++) {
      const choice = i < 3 ? "candidate" : "keep";
      state.decisions[`demo-${i}`] = {
        choice,
        at: c.now,
        sessionId: state.session.id,
      };
      state.session.steps.push({ id: `demo-${i}`, choice, cursor: i });
      state.used.push(`demo-${i}`);
    }
  }
  if (parent === "S12") {
    state.session!.cursor = 20;
    state.session!.status = "summary";
    state.history = [
      { id: state.session!.id, at: c.now, kept: 14, candidates: 6 },
    ];
  }
  if (["S15", "S16", "S40"].includes(parent))
    state.deletion = {
      id: "catalog-job",
      ids: ["demo-0", "demo-1", "demo-2"],
      at: c.now,
      status:
        parent === "S15" ? "pending" : parent === "S16" ? "done" : "partial",
      deleted:
        parent === "S16"
          ? ["demo-0", "demo-1", "demo-2"]
          : parent === "S40"
            ? ["demo-0"]
            : [],
      remaining: parent === "S16" ? [] : ["demo-1", "demo-2"],
    };
  if (parent === "S17")
    state.used = Array.from({ length: 50 }, (_, i) => `demo-${i}`);
  if (["S21", "S23", "S24", "S25", "S26", "S27", "S32"].includes(parent))
    entitlement = {
      kind: ["S26", "S27"].includes(parent) ? "active" : "trial",
      verified: true,
      productId: config.products.annual,
      autoRenew: parent !== "S27",
      expiresAt: c.now + 7 * 86400000,
    };
  if (parent === "S20") eligibility = "ineligible";
  if (parent === "S48") eligibility = "unknown";
  if (parent === "S21") purchaseState = "verified";
  if (parent === "S30") purchaseState = "pending";
  if (parent === "S31") purchaseState = "failed";
  if (parent === "S32") purchaseState = "restored";
  if (parent === "S47") purchaseState = "none";
  if (parent === "S28") entitlement = { kind: "expired", verified: true };
  if (parent === "S37") permission = "limited";
  if (parent === "S38") permission = "denied";
  if (parent === "S36")
    state.history = [
      { id: "one", at: c.now, kept: 14, candidates: 6 },
      { id: "two", at: c.now - 86400000, kept: 17, candidates: 3 },
    ];
  if (
    variant === "free_remaining_lt_20" ||
    variant === "daily_quota_previously_used"
  )
    state.used = Array.from({ length: 43 }, (_, i) => `past-${i}`);
  if (variant === "free_remaining_lt_20")
    state.session = {
      ...state.session!,
      ids: [
        "demo-8",
        "demo-9",
        "demo-10",
        "demo-11",
        "demo-12",
        "demo-13",
        "demo-14",
      ],
      cursor: 0,
      target: 7,
      steps: [],
    };
  if (variant === "all_kept") {
    state.history = [
      { id: state.session!.id, at: c.now, kept: 20, candidates: 0 },
    ];
    state.decisions = Object.fromEntries(
      Object.entries(state.decisions).map(([id, d]) => [
        id,
        { ...d, choice: "keep" },
      ]),
    );
  }
  if (variant === "all_failed_or_unconfirmed")
    state.deletion!.status = "unknown";
  if (variant === "delete_cancelled")
    state.deletion = {
      id: "cancelled",
      ids: ["demo-0"],
      at: c.now,
      status: "cancelled",
      deleted: [],
      remaining: ["demo-0"],
    };
  if (variant === "restricted") permission = "restricted";
  if (variant === "billing_grace")
    entitlement = {
      kind: "grace",
      verified: true,
      productId: config.products.annual,
      expiresAt: c.now + 86400000,
      autoRenew: true,
      billingRetry: true,
    };
  if (variant === "billing_retry_expired")
    entitlement = { kind: "expired", verified: true };
  if (variant === "verified_lifetime_legacy")
    entitlement = {
      kind: "legacy",
      verified: true,
      productId: config.products.legacy,
    };
  if (variant === "pro_filter_edit")
    entitlement = {
      kind: "active",
      verified: true,
      productId: config.products.monthly,
      expiresAt: c.now + 86400000,
      autoRenew: true,
    };
  if (parent.startsWith("O")) {
    const steps: IntroStep[] = [
      "welcome",
      "compare",
      "swipe",
      "permission",
      "discover",
      "pro",
    ];
    state.onboarding = {
      ...onboardingState(state),
      step: steps[Number(parent.slice(1)) - 1]!,
    };
    if (parent === "O04") permission = "unknown";
  }
  return {
    parent,
    variant,
    state,
    entitlement,
    permission,
    eligibility,
    purchaseState,
    empty: parent === "S45",
    failPhotos: parent === "S39",
    failBilling: parent === "S29" || variant === "purchase_disabled",
  };
}
