import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../src/lib/theme';

export default function Terms() {
  return <View style={styles.page}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22}/></Pressable><Text style={styles.title}>Terms</Text><View style={{width:44}}/></View>
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.h1}>Terms of Use</Text><Text style={styles.updated}>Effective: August 11, 2026</Text>
      <Text style={styles.p}>PhotoSweep helps you review and remove photos from your own device. You are responsible for reviewing selections before confirming deletion.</Text>
      <Text style={styles.h2}>PhotoSweep Pro</Text><Text style={styles.p}>PhotoSweep Pro is a one-time, non-consumable in-app purchase that unlocks the Pro features described on the purchase screen. The App Store price shown at the time of purchase is the controlling price.</Text>
      <Text style={styles.h2}>Restore Purchases</Text><Text style={styles.p}>Eligible purchases can be restored on devices signed into the same Apple ID using the Restore Purchases action in the app.</Text>
      <Text style={styles.h2}>Storage estimates</Text><Text style={styles.p}>Storage figures shown before deletion are estimates based on available photo metadata. Actual storage reclaimed can differ because of image encoding, iCloud optimization, and iOS storage behavior.</Text>
      <Text style={styles.h2}>Availability</Text><Text style={styles.p}>We may improve or change features over time. We will honor previously purchased Pro access in accordance with applicable App Store rules.</Text>
    </ScrollView>
  </View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#fff'},header:{paddingTop:58,paddingHorizontal:20,paddingBottom:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderColor:colors.line},back:{width:44,height:44,borderRadius:15,backgroundColor:colors.soft,alignItems:'center',justifyContent:'center'},title:{fontWeight:'900',fontSize:16},body:{padding:24,paddingBottom:60},h1:{fontSize:30,fontWeight:'900'},updated:{fontSize:12,color:colors.muted,marginTop:5,marginBottom:20},h2:{fontSize:17,fontWeight:'900',marginTop:18,marginBottom:6},p:{fontSize:14,color:colors.muted,lineHeight:22}});
