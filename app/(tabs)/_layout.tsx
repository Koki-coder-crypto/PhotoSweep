import { Tabs } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from "../../src/ui/components";
import { palette as p } from "../../src/ui/theme";
import { useApp } from '../../src/state/AppContext';
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const candidates = Object.values(app.state.decisions).filter(d => d.choice === 'candidate').length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.purple,
        tabBarInactiveTintColor: p.muted,
        tabBarStyle: {
          backgroundColor: p.bg,
          borderTopColor: p.border,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom || 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color }) => (
            <Icon name="home-outline" color={color} size={23} />
          ),
        }}
      />
      <Tabs.Screen
        name="swipe"
        options={{ title: 'スワイプ', tabBarIcon: ({color}) => <Icon name="swap-horizontal" color={color} size={24}/> }}
      />
      <Tabs.Screen
        name="candidates"
        options={{
          title: "削除候補",
          tabBarBadge: candidates || undefined,
          tabBarBadgeStyle: { backgroundColor: p.blue, color: '#fff' },
          tabBarIcon: ({ color }) => (
            <Icon name="trash-outline" color={color} size={23} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "マイページ",
          href: null,
          tabBarIcon: ({ color }) => (
            <Icon name="person-outline" color={color} size={23} />
          ),
        }}
      />
    </Tabs>
  );
}
