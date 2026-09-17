import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "../src/state/AppContext";
import { useReducedMotion } from "react-native-reanimated";
import { Root } from "../src/ui/Root";
export { ErrorBoundary } from "expo-router";
export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" />
          <Root>
            <Navigator />
          </Root>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
function Navigator() {
  const app = useApp();
  const reduced = useReducedMotion() || app.state.settings.reduceMotion;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reduced ? "none" : "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      <Stack.Screen
        name="zoom"
        options={{
          presentation: "fullScreenModal",
          animation: reduced ? "none" : "fade",
        }}
      />
    </Stack>
  );
}
