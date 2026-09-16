import { Tabs } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from "../../src/ui/components";
import { palette as p } from "../../src/ui/theme";
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.purple,
        tabBarInactiveTintColor: "#9A8DAD",
        tabBarStyle: {
          backgroundColor: "#fff",
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
        name="candidates"
        options={{
          title: "候補",
          tabBarIcon: ({ color }) => (
            <Icon name="albums-outline" color={color} size={23} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "マイページ",
          tabBarIcon: ({ color }) => (
            <Icon name="person-outline" color={color} size={23} />
          ),
        }}
      />
    </Tabs>
  );
}
