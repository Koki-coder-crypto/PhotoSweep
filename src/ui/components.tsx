import React, { type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
  type ColorValue,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { palette as p, styles as s } from "./theme";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 22,
  color = p.purple,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
  testID,
}: {
  title: string;
  onPress(): void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "keep";
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  testID?: string;
}) {
  const color =
    variant === "primary" || variant === "danger"
      ? "#fff"
      : variant === "keep"
        ? p.green
        : p.purple;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{
        disabled: !!disabled || !!loading,
        busy: !!loading,
      }}
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        c.button,
        {
          backgroundColor:
            variant === "primary"
              ? p.purple
              : variant === "danger"
                ? p.rose
                : variant === "keep"
                  ? p.mint
                  : variant === "ghost"
                    ? "transparent"
                    : p.surface,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: p.border,
          opacity: disabled || loading ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.975 : 1 }],
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : icon ? (
        <Icon name={icon} color={color} size={19} />
      ) : null}
      <Text style={[c.buttonText, { color }]}>{title}</Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  disabled = false,
  color = p.purple,
  background = p.lavender,
  size = 48,
}: {
  name: IconName;
  label: string;
  onPress(): void;
  disabled?: boolean;
  color?: string;
  background?: string;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: background,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={name} size={size > 60 ? 30 : 21} color={color} />
    </Pressable>
  );
}
export function Chip({
  children,
  color = p.purple,
  background = p.lavender,
}: PropsWithChildren<{ color?: string; background?: string }>) {
  return (
    <View style={[c.chip, { backgroundColor: background }]}>
      <Text style={{ color, fontSize: 11, fontWeight: "800" }}>{children}</Text>
    </View>
  );
}
export function Page({
  children,
  title,
  back = false,
  scroll = true,
  style,
  footer,
}: PropsWithChildren<{
  title?: string;
  back?: boolean;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  const contents = scroll ? (
    <ScrollView
      contentContainerStyle={[s.content, style, !footer && { paddingBottom: Math.max(32, insets.bottom + 12) }]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.content, { flex: 1 }, style]}>{children}</View>
  );
  return (
    <SafeAreaView style={s.page} edges={["top", "left", "right"]}>
      {title ? (
        <View style={c.header}>
          {back ? (
            <IconButton
              name="chevron-back"
              label="戻る"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
            />
          ) : (
            <View style={{ width: 44 }} />
          )}
          <Text
            style={[s.label, { fontSize: 16, flex: 1, textAlign: "center" }]}
          >
            {title}
          </Text>
          <View style={{ width: 44 }} />
        </View>
      ) : null}
      {contents}
      {footer ? (
        <SafeAreaView edges={["bottom"]} style={c.footer}>
          {footer}
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}
export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function StateView({
  icon = "sparkles-outline",
  title,
  description,
  children,
  tone = "purple",
  badge,
}: PropsWithChildren<{
  icon?: IconName;
  title: string;
  description: string;
  tone?: "purple" | "green" | "rose";
  badge?: React.ReactNode;
}>) {
  const color =
    tone === "green" ? p.green : tone === "rose" ? p.rose : p.purple;
  const background =
    tone === "green" ? p.mint : tone === "rose" ? p.pink : p.lavender;
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 32,
        gap: 22,
      }}
    >
      {badge || (
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 35,
            backgroundColor: background,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={icon} color={color} size={46} />
        </View>
      )}
      <Text
        accessibilityRole="header"
        style={[s.title, { textAlign: "center", fontSize: 27 }]}
      >
        {title}
      </Text>
      <Text style={[s.body, { textAlign: "center", maxWidth: 340 }]}>
        {description}
      </Text>
      {children ? (
        <View style={{ alignSelf: "stretch", gap: 10, marginTop: 12 }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
export function Stat({
  value,
  label,
  mint = false,
}: {
  value: string;
  label: string;
  mint?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 24,
        padding: 20,
        backgroundColor: mint ? p.mint : p.lavender,
        gap: 8,
      }}
    >
      <Text style={s.caption}>{label}</Text>
      <Text
        style={{
          color: mint ? p.green : p.purple,
          fontWeight: "800",
          fontSize: 30,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
export function Progress({
  value,
  color = p.purple,
}: {
  value: number;
  color?: string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(Math.min(1, Math.max(0, value)) * 100),
      }}
      style={{
        height: 6,
        borderRadius: 3,
        backgroundColor: p.border,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 6,
          width: `${Math.min(1, Math.max(0, value)) * 100}%`,
          borderRadius: 3,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
export function Row({
  icon,
  title,
  subtitle,
  onPress,
  end,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?(): void;
  end?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 16,
        minHeight: 64,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: p.lavender,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={20} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.label}>{title}</Text>
        {subtitle ? <Text style={s.caption}>{subtitle}</Text> : null}
      </View>
      {end ||
        (onPress ? (
          <Icon name="chevron-forward" size={17} color={p.muted} />
        ) : null)}
    </Pressable>
  );
}
const c = StyleSheet.create({
  button: {
    minHeight: 54,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    flexShrink: 1,
    lineHeight: 22,
  },
  chip: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footer: {
    backgroundColor: p.bg,
    paddingHorizontal: 22,
    paddingTop: 12,
    gap: 10,
    borderTopColor: p.border,
    borderTopWidth: 1,
  },
});
