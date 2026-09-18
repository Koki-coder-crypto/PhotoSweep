import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { formatBytes } from '../domain/media';
import { styles as s } from './theme';
export function ResultSize({ bytes, reduced, suffix = '' }: { bytes: number; reduced: boolean; suffix?: string }) {
  const os = useReducedMotion(), [shown, setShown] = useState(bytes);
  useEffect(() => {
    if (os || reduced) { setShown(bytes); return; }
    const start = Date.now(); setShown(0);
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 650);
      setShown(bytes * (1 - (1 - t) ** 3)); if (t === 1) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [bytes, os, reduced]);
  return <Text accessibilityLabel={formatBytes(bytes) + suffix} style={s.title}>{formatBytes(shown)}{suffix}</Text>;
}
