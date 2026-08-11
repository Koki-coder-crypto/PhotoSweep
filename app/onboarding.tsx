import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { colors } from '../src/lib/theme';
import { useAppStore } from '../src/store/AppStore';

export default function Onboarding() {
  const { setOnboarded } = useAppStore();
  return <View style={styles.page}>
    <LinearGradient colors={['#EAFBF4', '#EDF4FF', '#FFFFFF']} style={styles.hero}>
      <View style={styles.logo}><Ionicons name="sparkles" size={30} color={colors.ink} /></View>
      <Text style={styles.eyebrow}>PHOTOSWEEP</Text>
      <Text style={styles.title}>More room.{`\n`}Less clutter.</Text>
      <Text style={styles.subtitle}>Review the photos you probably don’t need — privately, on your iPhone.</Text>
    </LinearGradient>
    <View style={styles.body}>
      {[
        ['shield-checkmark-outline', 'Private by design', 'Your photos are analyzed on-device.'],
        ['albums-outline', 'Smart review', 'Find similar bursts, old photos and space hogs.'],
        ['trash-bin-outline', 'You stay in control', 'Nothing is removed until you confirm it.']
      ].map(([icon, t, d]) => <View key={t} style={styles.row}>
        <View style={styles.icon}><Ionicons name={icon as any} size={22} color={colors.ink} /></View>
        <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{t}</Text><Text style={styles.rowText}>{d}</Text></View>
      </View>)}
      <PrimaryButton title="Clean up my library" onPress={() => { setOnboarded(true); router.replace('/home'); }} style={{ marginTop: 12 }} />
      <Text style={styles.foot}>No account required.</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' }, hero: { flex: 1.05, paddingHorizontal: 28, paddingTop: 90, justifyContent: 'center' },
  logo: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 22, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 18 },
  eyebrow: { fontSize: 12, letterSpacing: 2, fontWeight: '900', color: colors.muted }, title: { fontSize: 44, lineHeight: 48, letterSpacing: -1.8, fontWeight: '900', color: colors.ink, marginTop: 8 },
  subtitle: { fontSize: 17, lineHeight: 25, color: colors.muted, marginTop: 14, maxWidth: 330 }, body: { flex: 1, padding: 24, gap: 18 },
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' }, icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontWeight: '800', fontSize: 15, color: colors.ink }, rowText: { color: colors.muted, fontSize: 13, marginTop: 3 }, foot: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: -5 }
});
