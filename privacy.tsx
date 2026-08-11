import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../src/lib/theme';

export default function Privacy() {
  return <View style={styles.page}>
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22}/></Pressable><Text style={styles.title}>Privacy</Text><View style={{width:44}}/></View>
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.h1}>Privacy Policy</Text><Text style={styles.updated}>Effective: August 11, 2026</Text>
      <Text style={styles.p}>PhotoSweep is designed to analyze your photo library on your device. PhotoSweep does not upload your photos to our servers.</Text>
      <Text style={styles.h2}>Photo library access</Text><Text style={styles.p}>The app requests access to photos so it can display cleanup candidates and delete only the items you explicitly confirm. Apple may allow you to grant access to only selected photos.</Text>
      <Text style={styles.h2}>Data we store on device</Text><Text style={styles.p}>PhotoSweep stores basic app preferences such as onboarding completion, premium entitlement state, free-cleanup usage, and an estimate of space you have reclaimed. This information stays in local app storage.</Text>
      <Text style={styles.h2}>Purchases</Text><Text style={styles.p}>Payments are processed by Apple through the App Store. Apple provides transaction information necessary to determine whether PhotoSweep Pro is active. We do not receive your full payment-card details.</Text>
      <Text style={styles.h2}>Analytics and advertising</Text><Text style={styles.p}>Version 1.0 does not include advertising SDKs or cross-app tracking. If analytics are introduced later, this policy and the App Store privacy disclosure will be updated before collection begins.</Text>
      <Text style={styles.h2}>Deletion and consent</Text><Text style={styles.p}>You can revoke photo access at any time in iOS Settings. Deleting the app removes PhotoSweep's local preferences. Photos deleted through the app are handled by iOS and normally remain in Recently Deleted according to Apple's system behavior.</Text>
      <Text style={styles.h2}>Contact</Text><Text style={styles.p}>Support contact before release: configure the public support email and privacy-policy URL in App Store Connect.</Text>
    </ScrollView>
  </View>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#fff'},header:{paddingTop:58,paddingHorizontal:20,paddingBottom:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderColor:colors.line},back:{width:44,height:44,borderRadius:15,backgroundColor:colors.soft,alignItems:'center',justifyContent:'center'},title:{fontWeight:'900',fontSize:16},body:{padding:24,paddingBottom:60},h1:{fontSize:30,fontWeight:'900'},updated:{fontSize:12,color:colors.muted,marginTop:5,marginBottom:20},h2:{fontSize:17,fontWeight:'900',marginTop:18,marginBottom:6},p:{fontSize:14,color:colors.muted,lineHeight:22}});
