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
  exitDirection,
}: {
  photo: Photo;
  next?: Photo;
  disabled: boolean;
  reduceMotion: boolean;
  onDecision(choice: Choice): Promise<void>;
  onZoom(): void;
  onError(): void;
  previewDrag?: number;
  exitDirection?: Choice;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const cardWidth = Math.min(width - 44, 450);
  const cardHeight = Math.max(
    190,
    Math.min((height * 0.30) / Math.min(fontScale, 1.3), 480),
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
  useEffect(() => {
    if (exitDirection) {
      locked.value = true;
      x.value = withTiming(reduced ? 0 : (exitDirection === 'keep' ? 1 : -1) * cardWidth * 1.35, { duration: reduced ? 0 : 220 });
    } else { locked.value = false; x.value = previewDrag * cardWidth; }
  }, [exitDirection, reduced, cardWidth]);
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
    .onEnd((e) => {
      if (locked.value) return;
      const flick = Math.abs(e.velocityX) > 1000 && Math.abs(x.value) > 28 && Math.sign(e.velocityX) === Math.sign(x.value);
      if (Math.abs(e.translationX) < Math.abs(e.translationY) * 1.2 || Math.abs(x.value) < cardWidth * 0.26 && !flick) {
        x.value = reduced ? 0 : withSpring(0, { damping: 25, stiffness: 260, mass: 1 });
        return;
      }
      locked.value = true;
      const choice: Choice = x.value > 0 ? "keep" : "candidate";
      runOnJS(commit)(choice);
      x.value = withTiming(reduced ? 0 : Math.sign(x.value) * cardWidth * 1.35, { duration: reduced ? 0 : 220 });
    })
    .onFinalize(() => {
      if (!locked.value) x.value = reduced ? 0 : withSpring(0, { damping: 22, stiffness: 240 });
    });
  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      {
        rotate: `${reduced ? 0 : Math.max(-12, Math.min(12, (x.value / cardWidth) * 24))}deg`,
      },
    ],
  }));
  const behind = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1 : 0.965 + Math.min(1, Math.abs(x.value) / (cardWidth * 0.26)) * 0.035 }, { translateY: reduced ? 0 : 12 * (1 - Math.min(1, Math.abs(x.value) / (cardWidth * 0.26))) }] }));
  const keep = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, x.value / (cardWidth * 0.24))),
  }));
  const candidate = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -x.value / (cardWidth * 0.24))),
  }));
  return (
    <View
      style={{ width: cardWidth, height: cardHeight + 14, alignSelf: "center" }}
    >
      <Animated.View
        style={[{
          position: "absolute",
          inset: 0,
          top: 13,
          bottom: -2,
          backgroundColor: p.surface,
          borderRadius: 20,
          overflow: "hidden",
        }, behind]}
      >
        {next ? (
          <Image
            source={{ uri: next.uri }}
            style={{ flex: 1, opacity: 0.75 }}
            contentFit="cover"
            cachePolicy="memory"
            accessibilityElementsHidden
          />
        ) : null}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              flex: 1,
              borderRadius: 20,
              backgroundColor: p.surface,
              padding: 0,
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.3)",
            },
            animated,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={photo.kind === "video" ? "動画を再生する" : "写真を拡大する"}
            onPress={onZoom}
            disabled={disabled}
            style={{
              flex: 1,
              borderRadius: 20,
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
                backgroundColor: "rgba(7,11,25,0.7)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon name={photo.kind === "video" ? "play" : "expand-outline"} size={18} color="#fff" />
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
