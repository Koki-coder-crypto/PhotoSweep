import { router } from 'expo-router';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../src/lib/theme';
import { formatBytes } from '../src/lib/format';
import { FREE_DELETE_LIMIT } from '../src/lib/monetization';
import { useAppStore } from '../src/store/AppStore';

export default function Settings() {
  const { freedBytes, isPro, freeDeletesUsed } = useAppStore();
  const rows = [
    { icon: 'diamond-outline', title: 'Plan', value: isPro ? 'PhotoSweep Pro' : `${Math.max(0, FREE_DELETE_LIMIT - freeDeletesUsed)} free deletions left`, action: () => router.push('/paywall') },
    { icon: 'shield-checkmark-outline', title: 'Privacy', value: 'On-device analysis', action: () => router.push('/privacy') },
    { icon: 'document-text-outline', title: 'Terms of Use', value: '', action: () => router.push('/terms') },
    { icon: 'images-outline', title: 'Photo access', value: 'iOS Settings', action: () => Linking.openSettings() },
  ];

  return <View style={styles.page}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22}/></Pressable><Text style={styles.title}>Settings</Text><View style={{width:44}}/></View>
    <View style={styles.body}>
      <View style={styles.reclaimed}><Text style={styles.label}>TOTAL SPACE RECLAIMED</Text><Text style={styles.value}>{formatBytes(freedBytes)}</Text><Text style={styles.note}>Storage figures are estimates until iOS finishes processing deletions.</Text></View>
      {rows.map(row => <Pressable accessibilityRole="button" key={row.title} onPress={row.action} style={styles.row}><View style={styles.left}><Ionicons name={row.icon as any} size={20}/><Text style={styles.rowT}>{row.title}</Text></View><View style={styles.right}>{row.value ? <Text style={styles.rowV}>{row.value}</Text> : null}<Ionicons name="chevron-forward" size={17} color={colors.muted}/></View></Pressable>)}
      <Text style={styles.version}>PhotoSweep 1.0.0</Text>
    </View>
  </View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#fff'},header:{paddingTop:58,paddingHorizontal:20,paddingBottom:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderColor:colors.line},back:{width:44,height:44,borderRadius:15,backgroundColor:colors.soft,alignItems:'center',justifyContent:'center'},title:{fontWeight:'900',fontSize:16},body:{padding:22},reclaimed:{borderRadius:24,backgroundColor:colors.soft,padding:22,marginBottom:20},label:{fontSize:10,letterSpacing:1.3,fontWeight:'900',color:colors.muted},value:{fontSize:31,fontWeight:'900',marginTop:7},note:{fontSize:11,color:colors.muted,lineHeight:16,marginTop:6},row:{minHeight:64,borderBottomWidth:1,borderColor:colors.line,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},left:{flexDirection:'row',gap:12,alignItems:'center'},rowT:{fontSize:15,fontWeight:'700'},right:{flexDirection:'row',gap:7,alignItems:'center'},rowV:{fontSize:12,color:colors.muted,maxWidth:160,textAlign:'right'},version:{textAlign:'center',fontSize:11,color:colors.muted,marginTop:32}});
