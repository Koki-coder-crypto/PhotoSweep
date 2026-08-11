import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export function Pill({ children }: PropsWithChildren) {
  return <View style={styles.pill}><Text style={styles.text}>{children}</Text></View>;
}
const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', backgroundColor: colors.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  text: { color: colors.ink, fontSize: 12, fontWeight: '700' }
});
