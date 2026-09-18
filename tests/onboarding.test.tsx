import React, { useState, useRef } from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { useApp, type AppModel } from "../src/state/AppContext";
import { Onboarding, HomeOrientation } from "../src/screens/onboarding";
import { Paywall } from "../src/screens/billing";
import { model } from "./app-model";
import {
  onboardingState,
  updateOnboarding,
  finishOnboarding,
  type IntroStep,
} from "../src/domain/onboarding";
import { emptyAnalysis } from "../src/domain/analysis";
import { interactionFeedback } from "../src/data/feedback";
jest.mock("../src/state/AppContext", () => ({ useApp: jest.fn() }));
let app: AppModel,
  base: AppModel,
  fail = false;
function Harness({ home = false }: { home?: boolean }) {
  const [state, setState] = useState(base.state),
    ref = useRef(state);
  app = {
    ...base,
    state,
    mutate: jest.fn(async (fn) => {
      if (fail) throw Error("保存に失敗しました");
      const next = fn(ref.current);
      ref.current = next;
      setState(next);
      return next;
    }),
  };
  jest.mocked(useApp).mockImplementation(() => app);
  return home ? <HomeOrientation /> : <Onboarding />;
}
function setup(step: IntroStep, overrides: Partial<AppModel> = {}) {
  base = {
    ...model(),
    analysis: { ...emptyAnalysis, status: "complete" },
    ...overrides,
  };
  base.state = updateOnboarding(base.state, { step });
  return render(<Harness />);
}
async function press(name: string) {
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name }));
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  fail = false;
});
test("comparison practice persists selection, candidate confirmation and both swipe directions without touching real data", async () => {
  setup("compare");
  const used = app.state.used,
    decisions = app.state.decisions,
    session = app.state.session;
  await act(async () => {
    fireEvent.press(screen.getByRole("checkbox", { name: "練習用の写真2" }));
  });
  expect(onboardingState(app.state).selected).toEqual([1]);
  await press("1枚を候補へ");
  expect(onboardingState(app.state).compared).toBe(true);
  await press("スワイプも試す");
  await press("練習で写真を残す");
  await waitFor(() => expect(onboardingState(app.state).kept).toBe(true));
  await press("練習で削除候補にする");
  await waitFor(() => expect(onboardingState(app.state).candidate).toBe(true));
  expect(app.state.used).toEqual(used);
  expect(app.state.decisions).toEqual(decisions);
  expect(app.state.session).toEqual(session);
  expect(app.choose).not.toHaveBeenCalled();
  expect(app.stageCandidates).not.toHaveBeenCalled();
  expect(app.repository.deleteRequested).not.toHaveBeenCalled();
});
test("save failure leaves practice selection unchanged and exposes a retryable error", async () => {
  setup("compare");
  fail = true;
  await act(async () =>
    fireEvent.press(screen.getByRole("checkbox", { name: "練習用の写真2" })),
  );
  expect(onboardingState(app.state).selected).toEqual([]);
  expect(screen.getByText("保存に失敗しました")).toBeTruthy();
  fail = false;
  await act(async () =>
    fireEvent.press(screen.getByRole("checkbox", { name: "練習用の写真2" })),
  );
  expect(onboardingState(app.state).selected).toEqual([1]);
});
test("double start tap cannot skip comparison", async () => {
  setup("welcome");
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "はじめる" }));
    fireEvent.press(screen.getByRole("button", { name: "はじめる" }));
  });
  expect(onboardingState(app.state).step).toBe("compare");
});
test("pregranted permission is skipped and back returns to swipe without a permission loop", async () => {
  setup("permission");
  await waitFor(() => expect(onboardingState(app.state).step).toBe("discover"));
  await press("説明を一つ戻る");
  expect(onboardingState(app.state).step).toBe("swipe");
});
test.each(["denied", "restricted"] as const)(
  "%s permission can finish for free without a paywall",
  async (permission) => {
    setup("permission", { permission });
    await press("あとで");
    expect(onboardingState(app.state).completed).toBe(true);
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(app.purchase).not.toHaveBeenCalled();
  },
);
test("limited access permits discovery and does not request permission again", async () => {
  setup("permission", { permission: "limited" });
  await waitFor(() => expect(onboardingState(app.state).step).toBe("discover"));
  expect(app.repository.permission).not.toHaveBeenCalled();
});
test("permission is only requested by the explicit photo button", async () => {
  const repo = model().repository;
  jest.mocked(repo.permission).mockResolvedValue("limited");
  setup("permission", { permission: "unknown", repository: repo });
  expect(repo.permission).not.toHaveBeenCalled();
  await press("写真を選ぶ");
  expect(repo.permission).toHaveBeenCalledWith(true);
  expect(onboardingState(app.state).step).toBe("discover");
});
test.each([
  { photos: [] },
  { permission: "denied" as const },
  { libraryError: "error" },
  { analysis: { ...emptyAnalysis, status: "error" as const } },
  { analysis: { ...emptyAnalysis, status: "unavailable" as const } },
  {
    entitlement: {
      kind: "legacy" as const,
      verified: true,
      productId: "lifetime",
    },
  },
])(
  "discovery skips auto-upsell when no usable results or already Pro: %j",
  async (overrides) => {
    setup("discover", overrides);
    await press("次へ");
    expect(onboardingState(app.state).completed).toBe(true);
    expect(onboardingState(app.state).step).toBe("discover");
  },
);
test("ongoing analysis can continue immediately with provisional counts marked", async () => {
  setup("discover", {
    analysis: {
      ...emptyAnalysis,
      status: "scanning",
      processed: 1,
      total: 10000,
    },
  });
  expect(screen.getAllByText("0枚 · 解析中")).toHaveLength(2);
  await press("解析を続けて先へ");
  expect(onboardingState(app.state).step).toBe("pro");
});
test("store failure offers retry and free continuation without invented prices", async () => {
  setup("pro", { products: [], billingError: "料金を取得できません" });
  expect(screen.queryByText("￥1,500")).toBeNull();
  await press("料金を再読み込み");
  expect(app.loadBilling).toHaveBeenCalled();
  await press("無料のまま続ける");
  expect(onboardingState(app.state).completed).toBe(true);
});
test("replayed discovery finishes without upsell and retains existing position", async () => {
  base = model();
  base.state = {
    ...base.state,
    onboarding: {
      ...onboardingState(base.state),
      mode: "replay",
      step: "discover",
    },
  };
  render(<Harness />);
  await press("次へ");
  expect(onboardingState(app.state).completed).toBe(true);
});
test("returning Pro skips an interrupted onboarding paywall", async () => {
  setup("pro", {
    entitlement: { kind: "legacy", verified: true, productId: "lifetime" },
  });
  await waitFor(() => expect(onboardingState(app.state).completed).toBe(true));
  expect(app.purchase).not.toHaveBeenCalled();
});
test.each(["cancelled", "pending", "verified", "restored"] as const)(
  "onboarding purchase %s converges on persisted completion",
  async (purchaseState) => {
    setup("pro", {
      purchaseState,
      ...(["verified", "restored"].includes(purchaseState)
        ? {
            entitlement: {
              kind: "legacy",
              verified: true,
              productId: "lifetime",
            } as const,
          }
        : {}),
    });
    if (purchaseState === "pending") {
      expect(
        screen.queryByRole("button", { name: "7日間無料で試す" }),
      ).toBeNull();
      await press("閉じて整理に戻る");
    }
    if (purchaseState === "verified" || purchaseState === "restored")
      await press("整理をはじめる");
    await waitFor(() =>
      expect(onboardingState(app.state).completed).toBe(true),
    );
    expect(app.purchase).not.toHaveBeenCalled();
  },
);
test("completion save failure stays on paywall until free continuation is saved", async () => {
  setup("pro");
  fail = true;
  await press("無料のまま続ける");
  expect(onboardingState(app.state).completed).toBe(false);
  expect(screen.getByText("保存に失敗しました")).toBeTruthy();
  fail = false;
  await press("無料のまま続ける");
  expect(onboardingState(app.state).completed).toBe(true);
});
test("home orientation disappears only after its dismissal is saved", async () => {
  base = model();
  base.state = finishOnboarding(base.state);
  render(<Harness home />);
  expect(screen.getByText("まずは、ここから。")).toBeTruthy();
  await press("わかった、整理をはじめる");
  expect(screen.queryByText("まずは、ここから。")).toBeNull();
  expect(onboardingState(app.state).homeHintSeen).toBe(true);
});
