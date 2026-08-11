import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes } from '../src/lib/format';
import { scanLibrary } from '../src/lib/photoScanner';
import { colors } from '../src/lib/theme';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { useAppStore } from '../src/store/AppStore';

export default function Home() {
  const { scan, setScan, freedBytes, isPro } = useAppStore();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (permission.status !== 'granted') {
        Alert.alert('Photo access needed', 'Allow photo access so PhotoSweep can scan your library on-device. You can change this later in Settings.');
        return;
      }
      const result = await scanLibrary();
      setScan(result);
      if (permission.accessPrivileges === 'limited') {
        Alert.alert('Limited photo access', `PhotoSweep scanned ${result.photos.length.toLocaleString()} accessible photos. For a complete cleanup, allow access to all photos in iOS Settings.`);
      }
    } catch (e) {
      Alert.alert('Scan failed', e instanceof Error ? e.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  const cards = scan ? [
    { title: 'Similar candidates', value: `${scan.similarGroups.reduce((s,g)=>s+g.photos.length,0)} photos`, icon: 'copy-outline', bg: '#EAF8FF', path: '/review?kind=similar' },
    { title: 'Space hogs', value: `${scan.large.length} photos`, icon: 'resize-outline', bg: '#FFF3E8', path: '/review?kind=large' },
    { title: 'Older than a year', value: `${scan.old.length} photos`, icon: 'time-outline', bg: '#F2EEFF', path: '/review?kind=old' }
  ] : [];

  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <View style={styles.top}><View><Text style={styles.brand}>PhotoSweep</Text><Text style={styles.hello}>Your library, lighter.</Text></View><Pressable onPress={() => router.push('/settings')} style={styles.settings}><Ionicons name="settings-outline" size={22} /></Pressable></View>
    <LinearGradient colors={['#CFFFEA', '#DCEBFF']} style={styles.hero}>
      <Text style={styles.heroLabel}>{scan ? 'ESTIMATED LIBRARY SIZE' : 'READY WHEN YOU ARE'}</Text>
      <Text style={styles.heroValue}>{scan ? formatBytes(scan.estimatedLibraryBytes) : 'Make space'}</Text>
      <Text style={styles.heroText}>{scan ? `${scan.photos.length.toLocaleString()} photos scanned${scan.truncated ? ' (first 6,000)' : ''}` : 'A private scan finds the easiest wins first.'}</Text>
      <PrimaryButton title={busy ? 'Scanning…' : scan ? 'Scan again' : 'Scan my photos'} onPress={start} disabled={busy} style={{ marginTop: 22 }} />
      {busy && <ActivityIndicator style={{ marginTop: 14 }} />}
    </LinearGradient>

    <View style={styles.stats}><View><Text style={styles.statLabel}>Space reclaimed</Text><Text style={styles.statValue}>{formatBytes(freedBytes)}</Text></View><View style={styles.badge}><Ionicons name={isPro ? 'diamond' : 'sparkles'} size={14} /><Text style={styles.badgeText}>{isPro ? 'Pro' : 'Free'}</Text></View></View>

    {scan ? <>
      <Text style={styles.section}>Best places to start</Text>
      {cards.map(card => <Pressable key={card.title} onPress={() => router.push(card.path as any)} style={[styles.card,{backgroundColor:card.bg}]}>
        <View style={styles.cardIcon}><Ionicons name={card.icon as any} size={22} /></View>
        <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{card.title}</Text><Text style={styles.cardValue}>{card.value}</Text></View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>)}
      {!isPro && <Pressable onPress={() => router.push('/paywall')} style={styles.proCard}><View><Text style={styles.proEyebrow}>PHOTOSWEEP PRO</Text><Text style={styles.proTitle}>Unlimited cleanups</Text><Text style={styles.proText}>Finish the job without session limits.</Text></View><Ionicons name="arrow-forward-circle" size={34} /></Pressable>}
    </> : <View style={styles.empty}><Ionicons name="images-outline" size={28} color={colors.muted} /><Text style={styles.emptyTitle}>Nothing leaves your phone</Text><Text style={styles.emptyText}>PhotoSweep only reads the metadata and previews needed for sorting. Your library isn’t uploaded.</Text></View>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:'#fff'},content:{padding:22,paddingTop:68,paddingBottom:50},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brand:{fontSize:14,fontWeight:'900'},hello:{fontSize:28,fontWeight:'900',letterSpacing:-1.1,marginTop:4},settings:{width:44,height:44,borderRadius:15,backgroundColor:colors.soft,alignItems:'center',justifyContent:'center'},
  hero:{borderRadius:28,padding:24,marginTop:26},heroLabel:{fontSize:11,fontWeight:'900',letterSpacing:1.4,color:colors.muted},heroValue:{fontSize:42,fontWeight:'900',letterSpacing:-1.5,marginTop:9},heroText:{fontSize:14,color:colors.muted,marginTop:7},stats:{marginTop:20,borderWidth:1,borderColor:colors.line,borderRadius:20,padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},statLabel:{fontSize:12,color:colors.muted,fontWeight:'700'},statValue:{fontSize:23,fontWeight:'900',marginTop:3},badge:{flexDirection:'row',gap:6,backgroundColor:colors.soft,borderRadius:99,paddingHorizontal:11,paddingVertical:7},badgeText:{fontSize:12,fontWeight:'800'},section:{fontSize:19,fontWeight:'900',marginTop:30,marginBottom:12},card:{minHeight:92,borderRadius:22,padding:17,flexDirection:'row',alignItems:'center',gap:14,marginBottom:10},cardIcon:{width:46,height:46,borderRadius:15,backgroundColor:'rgba(255,255,255,.75)',alignItems:'center',justifyContent:'center'},cardTitle:{fontSize:16,fontWeight:'800'},cardValue:{fontSize:13,color:colors.muted,marginTop:4},proCard:{marginTop:10,borderRadius:22,backgroundColor:colors.ink,padding:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},proEyebrow:{fontSize:10,color:'#AAB2BD',letterSpacing:1.3,fontWeight:'900'},proTitle:{fontSize:19,color:'#fff',fontWeight:'900',marginTop:5},proText:{fontSize:12,color:'#BCC3CC',marginTop:3},empty:{marginTop:35,padding:26,borderRadius:24,backgroundColor:colors.soft},emptyTitle:{fontWeight:'900',fontSize:17,marginTop:13},emptyText:{fontSize:13,color:colors.muted,lineHeight:20,marginTop:7}
});
