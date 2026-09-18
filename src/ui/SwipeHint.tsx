import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View } from 'react-native';
import { palette as p, styles as s } from './theme';
export function SwipeHint({ reduced, onDismiss }: { reduced: boolean; onDismiss(): void }) {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(os => {
      if (!active || reduced || os) return;
      Animated.sequence([
        Animated.timing(x, { toValue: -78, duration: 600, useNativeDriver: true }), Animated.delay(200),
        Animated.timing(x, { toValue: 0, duration: 250, useNativeDriver: true }), Animated.delay(50),
        Animated.timing(x, { toValue: 78, duration: 600, useNativeDriver: true }), Animated.delay(250),
        Animated.timing(x, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    });
    return () => { active = false; x.stopAnimation(); };
  }, [reduced, x]);
  return <Pressable accessibilityRole="button" accessibilityLabel="左は削除候補、右は残す。説明を閉じる" onPress={onDismiss} style={{ backgroundColor: p.surface, borderRadius: 18, padding: 14, gap: 10, alignItems: 'center' }}>
    <View style={[s.between, { width: '100%' }]}><Text style={{ color: p.rose }}>← 削除候補</Text><Text style={{ color: p.green }}>残す →</Text></View>
    <Animated.View style={{ transform: [{ translateX: x }], padding: 12, borderRadius: 12, backgroundColor: p.blue }}><Text style={s.label}>左右にスワイプ</Text></Animated.View>
    <Text style={s.caption}>最後に確認するまで削除されません。タップで閉じる</Text>
  </Pressable>;
}
