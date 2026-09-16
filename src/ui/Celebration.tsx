import React, { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";
import { palette as p } from "./theme";
import { Icon } from "./components";

export function Celebration({ reduced }: { reduced: boolean }) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((osReduced) => {
      if (!alive || reduced || osReduced) return;
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      alive = false;
      progress.stopAnimation();
    };
  }, [progress, reduced]);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        width: 140,
        height: 140,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI) / 4;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: 7,
              height: 12,
              borderRadius: 3,
              backgroundColor: i % 2 ? p.purple : "#67BDA9",
              opacity: progress.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Math.cos(angle) * 28, Math.cos(angle) * 78],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Math.sin(angle) * 28, Math.sin(angle) * 78],
                  }),
                },
                { rotate: `${i * 45}deg` },
              ],
            }}
          />
        );
      })}
      <Animated.View
        style={{
          width: 112,
          height: 112,
          borderRadius: 35,
          backgroundColor: p.mint,
          alignItems: "center",
          justifyContent: "center",
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 0.65, 1],
                outputRange: [0.88, 1.03, 1],
              }),
            },
            { rotate: "-7deg" },
          ],
        }}
      >
        <Icon name="checkmark" color={p.green} size={46} />
      </Animated.View>
    </View>
  );
}
