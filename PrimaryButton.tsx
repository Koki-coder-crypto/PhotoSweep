import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../lib/theme';

type Props = { title: string; onPress: () => void; disabled?: boolean; style?: ViewStyle };
export function PrimaryButton({ title, onPress, disabled, style }: Props) {
  return <Pressable disabled={disabled} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} style={({ pressed }) => [styles.button, style, disabled && styles.disabled, pressed && !disabled && { transform: [{ scale: 0.985 }] }]}>
    <Text style={styles.text}>{title}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 56, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  disabled: { opacity: 0.35 },
  text: { color: colors.white, fontWeight: '800', fontSize: 16 }
});
