import React, { useEffect, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useApp } from "../state/AppContext";
import { Button, Page, StateView } from "./components";
import { palette as p, styles as s } from "./theme";
import { BrandMark } from "./BrandMark";
export function Root({ children }: PropsWithChildren) {
  const app = useApp();
  useEffect(() => {
    if (!app.message) return;
    const timer = setTimeout(app.clearMessage, 6000);
    return () => clearTimeout(timer);
  }, [app.message]);
  if (app.bootError)
    return (
      <Page>
        <StateView
          title="記録を読み込めませんでした"
          description={app.bootError}
        >
          <Button title="記録を消さずに再試行" onPress={app.retryBoot} />
        </StateView>
      </Page>
    );
  if (!app.ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: p.bg,
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
        }}
      >
        <BrandMark size={88} />
        <Text style={s.heading}>PhotoSweep</Text>
        <ActivityIndicator color={p.purple} />
      </View>
    );
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.bg,
      }}
    >
      <View
        style={{
          flex: 1,
          width: "100%",
          maxWidth: Platform.OS === "web" ? 480 : undefined,
          alignSelf: "center",
        }}
      >
        {children}
        {app.message ? (
          <Pressable
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            accessibilityLabel={app.message}
            onPress={app.clearMessage}
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              bottom: 90,
              padding: 18,
              backgroundColor: p.dark,
              borderRadius: 18,
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, lineHeight: 22 }}>
              {app.message}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
