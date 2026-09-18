import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react-native";
import { useApp, type AppModel } from "../src/state/AppContext";
import { Button } from "../src/ui/components";
import * as Main from "../src/screens/primary";
import * as Billing from "../src/screens/billing";
import * as Settings from "../src/screens/settings";
import { scenarioData, scenarios } from "../src/dev/scenarios";
import type { Photo } from "../src/domain/types";
import { config } from "../src/config";
import { Collection } from "../src/screens/collection";
import { router } from "expo-router";
import { emptyAnalysis } from "../src/domain/analysis";
jest.mock("../src/state/AppContext", () => ({ useApp: jest.fn() }));
const mockUseApp = jest.mocked(useApp);
import { model, photos } from "./app-model";
const views: Record<string, React.ComponentType> = {
  O01: Main.Welcome,
  O02: Main.Welcome,
  O03: Main.Welcome,
  O04: Main.Welcome,
  O05: Main.Welcome,
  O06: Main.Welcome,
  N01: () => <Collection initialKind="similar" />,
  N02: () => <Collection initialKind="duplicate" />,
  N03: () => <Collection initialKind="all" />,
  N04: () => <Billing.Paywall initialPeriod="lifetime" />,
  S01: Main.Welcome,
  S02: Main.PermissionScreen,
  S03: Main.Home,
  S04: Main.Months,
  S05: Main.Screenshots,
  S06: Main.Filter,
  S07: Main.Guide,
  S08: Main.Review,
  S09: Main.Review,
  S10: Main.Review,
  S11: Main.Zoom,
  S12: Main.Summary,
  S13: Main.Candidates,
  S14: Main.Candidates,
  S15: Main.DeletionResult,
  S16: Main.DeletionResult,
  S17: Main.Quota,
  S18: Billing.Paywall,
  S19: Billing.Paywall,
  S20: Billing.Paywall,
  S21: Billing.Paywall,
  S22: Settings.NotificationsScreen,
  S23: Main.Home,
  S24: Main.Filter,
  S25: Billing.Plan,
  S26: Billing.Plan,
  S27: Billing.Plan,
  S28: Billing.Plan,
  S29: Billing.Paywall,
  S30: Billing.Paywall,
  S31: Billing.Paywall,
  S32: Billing.Paywall,
  S33: Settings.SettingsScreen,
  S34: Settings.Feedback,
  S35: Settings.NotificationsScreen,
  S36: Settings.History,
  S37: Main.Home,
  S38: Main.Home,
  S39: Main.Review,
  S40: Main.DeletionResult,
  S41: Settings.Help,
  S42: Settings.RestorePhoto,
  S43: Settings.Privacy,
  S44: Settings.Terms,
  S45: Main.Home,
  S46: Billing.Paywall,
  S47: Billing.Paywall,
  S48: Billing.Paywall,
};
for (const scenario of scenarios)
  test(`${scenario.id} actual screen mounts with its documented domain state`, async () => {
    mockUseApp.mockReturnValue(model(scenario.id));
    const Component = views[scenario.parent]!;
    render(<Component />);
    await act(async () => {});
    expect(screen.toJSON()).not.toBeNull();
  });
test("a disabled purchase button cannot dispatch a purchase", async () => {
  const app = model("S48");
  mockUseApp.mockReturnValue(app);
  render(<Billing.Paywall />);
  fireEvent.press(screen.getByRole("button", { name: "購入条件を確認中" }));
  expect(app.purchase).not.toHaveBeenCalled();
});
test("switching plan passes the monthly product ID, with full price disclosure", async () => {
  const app = model("S18");
  mockUseApp.mockReturnValue(app);
  render(<Billing.Paywall />);
  fireEvent.press(screen.getByRole("radio", { name: "月額プラン ￥480" }));
  expect(screen.getByText(/無料体験後は￥480 \/ 月/)).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "7日間無料で試す" }));
  expect(app.purchase).toHaveBeenCalledWith(config.products.monthly);
});
test("ineligible customers see a paid registration, never a free-trial CTA", () => {
  mockUseApp.mockReturnValue(model("S20"));
  render(<Billing.Paywall />);
  expect(screen.queryByRole("button", { name: "7日間無料で試す" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "￥2,400 / 年で登録する" }),
  ).toBeTruthy();
});
test("candidate deletion is available with zero free allowance and uses visible IDs", async () => {
  const app = model("S13");
  app.state.used = Array.from({ length: 50 }, (_, i) => String(i));
  mockUseApp.mockReturnValue(app);
  render(<Main.Candidates />);
  await act(async () =>
    fireEvent.press(screen.getByRole("button", { name: "3枚を削除" })),
  );
  expect(app.deletePhotos).toHaveBeenCalledWith(["demo-0", "demo-1", "demo-2"]);
  expect(app.purchase).not.toHaveBeenCalled();
});
test("remaining candidates can be removed without requesting native deletion", async () => {
  const app = model("S13");
  mockUseApp.mockReturnValue(app);
  render(<Main.Candidates />);
  await act(async () =>
    fireEvent.press(
      screen.getAllByRole("button", { name: "この写真を候補から外す" })[0]!,
    ),
  );
  expect(app.removeCandidate).toHaveBeenCalledWith("demo-0");
  expect(app.deletePhotos).not.toHaveBeenCalled();
});
test("keep and candidate buttons act on the displayed asset; undo is accessible", async () => {
  const app = model("S08");
  mockUseApp.mockReturnValue(app);
  render(<Main.Review />);
  await act(async () =>
    fireEvent.press(screen.getByRole("button", { name: "写真を残す" })),
  );
  expect(app.choose).toHaveBeenCalledWith("demo-8", "keep");
  await act(async () =>
    fireEvent.press(screen.getByRole("button", { name: "前の操作を戻す" })),
  );
  expect(app.undo).toHaveBeenCalled();
});
test("disabled generic buttons report disabled state and do not fire", () => {
  const action = jest.fn();
  render(<Button title="保存中" disabled onPress={action} />);
  expect(screen.getByRole("button", { name: "保存中" })).toBeDisabled();
  fireEvent.press(screen.getByRole("button", { name: "保存中" }));
  expect(action).not.toHaveBeenCalled();
});
test("home never offers another 20 photos when the free allowance is exhausted", () => {
  const app = model("S03");
  app.state.used = Array.from({ length: 50 }, (_, i) => `old-${i}`);
  mockUseApp.mockReturnValue(app);
  render(<Main.Home />);
  expect(screen.queryByText("まず20枚だけ。")).toBeNull();
  expect(screen.getByText("今日あと0枚")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: /スクリーンショット、/ }),
  ).toBeTruthy();
});
test("screenshot grid gates new selections exceeding the remaining free allowance", async () => {
  const app = model("S03");
  app.state.used = Array.from({ length: 43 }, (_, i) => `old-${i}`);
  mockUseApp.mockReturnValue(app);
  render(<Main.Screenshots />);
  fireEvent.press(screen.getByRole("button", { name: "すべて選択" }));
  expect(screen.getByText(/今日の無料分：あと7枚/)).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "37枚を削除" }));
  });
  expect(app.stageCandidates).not.toHaveBeenCalled();
  expect(app.deletePhotos).not.toHaveBeenCalled();
  expect(router.push).toHaveBeenCalledWith("/paywall?source=selection");
});

test("group selection protects the recommended photo and persists before the OS request", async () => {
  const app = model();
  app.photos = photos.slice(0, 3);
  app.analysis = {
    ...emptyAnalysis,
    status: "complete",
    groups: [
      {
        id: "g",
        kind: "duplicate",
        ids: ["demo-0", "demo-1", "demo-2"],
        recommended: "demo-0",
      },
    ],
  };
  const order: string[] = [];
  app.stageCandidates = jest.fn(async () => {
    order.push("saved");
  });
  app.deletePhotos = jest.fn(async () => {
    order.push("OS");
  });
  mockUseApp.mockReturnValue(app);
  render(<Collection initialKind="duplicate" />);
  expect(screen.getByRole("button", { name: "0枚を削除" })).toBeDisabled();
  fireEvent.press(screen.getByRole("button", { name: "おすすめ以外を選択" }));
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "2枚を削除" }));
  });
  expect(app.stageCandidates).toHaveBeenCalledWith(["demo-1", "demo-2"]);
  expect(order).toEqual(["saved", "OS"]);
});
test("failed grid save never requests an OS deletion", async () => {
  const app = model();
  app.photos = photos.slice(0, 2);
  app.stageCandidates = jest.fn(async () => {
    throw new Error("disk full");
  });
  mockUseApp.mockReturnValue(app);
  render(<Collection initialKind="all" />);
  fireEvent.press(screen.getByRole("button", { name: "すべて選択" }));
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "2枚を削除" }));
  });
  expect(app.deletePhotos).not.toHaveBeenCalled();
  expect(app.notify).toHaveBeenCalledWith("disk full");
});
test("an unresolved deletion remains reachable when permission hides every candidate", () => {
  const app = model("S40");
  app.photos = [];
  app.state.deletion = {
    id: "unknown",
    ids: ["private"],
    deleted: [],
    remaining: ["private"],
    at: Date.now(),
    status: "unknown",
  };
  mockUseApp.mockReturnValue(app);
  render(<Main.Candidates />);
  expect(screen.getByRole("button", { name: "削除結果を確認" })).toBeTruthy();
});
test("lifetime plan selection shows the full one-time price and purchases its own SKU", async () => {
  const app = model();
  app.products = [
    {
      id: config.products.weekly,
      period: "week",
      displayPrice: "￥1,500",
      price: 1500,
      currency: "JPY",
      eligibility: "eligible",
      trialDays: 7,
    },
    {
      id: config.products.lifetime,
      period: "lifetime",
      displayPrice: "￥6,000",
      price: 6000,
      currency: "JPY",
      eligibility: "ineligible",
      trialDays: 0,
    },
  ];
  mockUseApp.mockReturnValue(app);
  render(<Billing.Paywall />);
  fireEvent.press(
    screen.getByRole("radio", { name: "買い切りプラン ￥6,000" }),
  );
  await act(async () => {
    fireEvent.press(screen.getByRole("button", { name: "￥6,000で買い切り" }));
  });
  expect(app.purchase).toHaveBeenCalledWith(config.products.lifetime);
});
