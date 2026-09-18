import { Videos, Compress } from "../screens/videos";
import { upgradeAdapter } from "./upgrade";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AppProvider, useApp } from "../state/AppContext";
import * as Main from "../screens/primary";
import * as Billing from "../screens/billing";
import * as Settings from "../screens/settings";
import { Collection } from "../screens/collection";
import { palette as p, styles as s } from "../ui/theme";
import { demoBilling, demoPhotos } from "./adapters";
import { scenarioData, scenarios } from "./scenarios";
const views: Record<string, React.ComponentType> = {
  U01: Main.Review,
  U02: Videos,
  U03: Main.DeletionResult,
  U04: () => <Compress adapter={upgradeAdapter('idle')} initialId="demo-8" />,
  U05: () => <Compress adapter={upgradeAdapter('encoding')} initialId="demo-8" />,
  U06: () => <Compress adapter={upgradeAdapter('ready')} initialId="demo-8" />,
  U07: () => <Compress adapter={upgradeAdapter('saved')} initialId="demo-8" />,
  U08: () => <Compress adapter={upgradeAdapter('unknown')} initialId="demo-8" />,
  U09: () => <Compress adapter={upgradeAdapter('failed')} initialId="demo-8" />,
  U10: Main.Quota,
  U11: Main.Home,
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
  S09: () => <Main.Review previewDrag={-0.32} />,
  S10: () => <Main.Review previewDrag={0.32} />,
  S11: Main.Zoom,
  S12: Main.Summary,
  S13: Main.Candidates,
  S14: Main.Candidates,
  S15: Main.DeletionResult,
  S16: Main.DeletionResult,
  S17: Main.Quota,
  S18: Billing.Paywall,
  S19: () => <Billing.Paywall initialPeriod="lifetime" />,
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
function Fixture({ id }: { id: string }) {
  const overrides = useMemo(() => {
    const data = scenarioData(id);
    const photos = demoPhotos({
      videos: id.startsWith("U"),
      permission: data.permission,
      empty: data.empty,
      fail: data.failPhotos,
    });
    if (data.variant === "list_loading")
      photos.page = () => new Promise(() => {});
    return {
      state: data.state,
      purchaseState: data.purchaseState,
      photos,
      billing: demoBilling({
        entitlement: data.entitlement,
        eligibility: data.eligibility,
        fail: data.failBilling,
        unavailable: data.variant === "purchase_disabled",
        purchase: data.parent === "S46" ? "cancelled" : undefined,
      }),
    };
  }, [id]);
  const data = scenarioData(id);
  const Component = views[data.parent] || Main.Home;
  return (
    <AppProvider key={id} overrides={overrides}>
      <Loaded>
        {data.variant === "reset_history_confirm" ? (
          <Settings.History initialConfirm />
        ) : (
          <Component />
        )}
      </Loaded>
    </AppProvider>
  );
}
function Loaded({ children }: React.PropsWithChildren) {
  const app = useApp();
  return app.ready ? children : <ActivityIndicator color={p.purple} />;
}
export function Catalog() {
  const params = useLocalSearchParams<{ screen?: string }>();
  const [selected, setSelected] = useState(params.screen || "S03");
  const [showList, setShowList] = useState(!params.screen);
  const definition = scenarios.find((s) => s.id === selected);
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="画面カタログの一覧を切り替え"
        onPress={() => setShowList(!showList)}
        style={{ padding: 14, paddingTop: 20, backgroundColor: p.dark }}
      >
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
          DEV CATALOG · {selected} · {definition?.title} ▾
        </Text>
        <Text style={{ color: "#C6BDE0", fontSize: 10, marginTop: 4 }}>
          デモ状態です。OS・購入・実写真の検証ではありません。
        </Text>
      </Pressable>
      {showList ? (
        <ScrollView
          style={{ maxHeight: 230 }}
          contentContainerStyle={{
            padding: 12,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {scenarios.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => {
                setSelected(item.id);
                setShowList(false);
              }}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: selected === item.id ? p.purple : p.lavender,
                minHeight: 44,
              }}
            >
              <Text
                style={{
                  color: selected === item.id ? "#fff" : p.purple,
                  fontSize: 11,
                }}
              >
                {item.id} {item.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={{ flex: 1 }}>
        <Fixture id={selected} />
      </View>
    </View>
  );
}
