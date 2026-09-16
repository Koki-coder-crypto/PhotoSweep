import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { Choice, Photo } from "../domain/types";
import { palette as p, styles as s } from "./theme";
import { Icon } from "./components";
export function PhotoCard({
  photo,
  next,
  disabled,
  reduceMotion,
  onDecision,
  onZoom,
  onError,
  previewDrag = 0,
}: {
  photo: Photo;
  next?: Photo;
  disabled: boolean;
  reduceMotion: boolean;
  onDecision(choice: Choice): Promise<void>;
  onZoom(): void;
  onError(): void;
  previewDrag?: number;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const cardWidth = Math.min(width - 44, 450);
  const cardHeight = Math.max(
    250,
    Math.min((height * 0.48) / Math.min(fontScale, 1.3), 480),
  );
  const x = useSharedValue(previewDrag * cardWidth),
    locked = useSharedValue(false);
  const [osReduced, setReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => sub.remove();
  }, []);
  const reduced = reduceMotion || osReduced;
  const commit = async (choice: Choice) => {
    try {
      await onDecision(choice);
    } catch {
      x.value = reduced ? 0 : withSpring(0);
      locked.value = false;
    }
  };
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-12, 12])
    .failOffsetY([-24, 24])
    .onUpdate((e) => {
      if (!locked.value) x.value = e.translationX;
    })
    .onEnd(() => {
      if (locked.value) return;
      if (Math.abs(x.value) < cardWidth * 0.3) {
        x.value = reduced ? 0 : withSpring(0, { damping: 20 });
        return;
      }
      locked.value = true;
      const choice: Choice = x.value > 0 ? "keep" : "candidate";
      x.value = withTiming(
        reduced ? x.value : Math.sign(x.value) * (width + 120),
        { duration: reduced ? 120 : 190 },
        (done) => {
          if (done) runOnJS(commit)(choice);
        },
      );
    });
  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      {
        rotate: `${reduced ? 0 : Math.max(-7, Math.min(7, (x.value / cardWidth) * 14))}deg`,
      },
    ],
  }));
  const keep = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, x.value / (cardWidth * 0.22))),
  }));
  const candidate = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -x.value / (cardWidth * 0.22))),
  }));
  return (
    <View
      style={{ width: cardWidth, height: cardHeight + 14, alignSelf: "center" }}
    >
      <View
        style={{
          position: "absolute",
          inset: 0,
          top: 13,
          bottom: -2,
          backgroundColor: "#DED6F0",
          borderRadius: 28,
          transform: [{ rotate: "3deg" }, { scale: 0.96 }],
          overflow: "hidden",
        }}
      >
        {next ? (
          <Image
            source={{ uri: next.uri }}
            style={{ flex: 1, opacity: 0.35 }}
            contentFit="cover"
            cachePolicy="memory"
            accessibilityElementsHidden
          />
        ) : null}
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              flex: 1,
              borderRadius: 28,
              backgroundColor: "#fff",
              padding: 7,
              boxShadow: "0 12px 32px rgba(49, 28, 96, 0.12)",
            },
            animated,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="写真を拡大する"
            onPress={onZoom}
            disabled={disabled}
            style={{
              flex: 1,
              borderRadius: 22,
              overflow: "hidden",
              backgroundColor: p.lavender,
            }}
          >
            <Image
              source={{ uri: photo.uri }}
              style={{ flex: 1 }}
              contentFit="contain"
              transition={reduced ? 0 : 120}
              cachePolicy="memory"
              onError={onError}
              accessibilityLabel="仕分け中の写真"
            />
            <View
              style={{
                position: "absolute",
                bottom: 12,
                right: 12,
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255,255,255,0.88)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon name="expand-outline" size={18} />
            </View>
          </Pressable>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: 22,
                top: 24,
                borderRadius: 14,
                padding: 13,
                backgroundColor: p.mint,
              },
              keep,
            ]}
          >
            <Text style={[s.label, { color: p.green }]}>✓ 残す</Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                right: 22,
                top: 24,
                borderRadius: 14,
                padding: 13,
                backgroundColor: p.pink,
              },
              candidate,
            ]}
          >
            <Text style={[s.label, { color: p.rose }]}>候補へ</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
