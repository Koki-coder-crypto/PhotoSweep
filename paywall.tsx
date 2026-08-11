import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ErrorCode, getAvailablePurchases, useIAP } from 'expo-iap';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { PRODUCTS } from '../src/lib/monetization';
import { colors } from '../src/lib/theme';
import { useAppStore } from '../src/store/AppStore';

export default function Paywall() {
  const { setIsPro } = useAppStore();
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    autoFinishTransactions: false,
    onPurchaseSuccess: async purchase => {
      try {
        if (purchase.productId !== PRODUCTS.lifetime) {
          throw new Error('Unexpected App Store product.');
        }
        await finishTransaction({ purchase, isConsumable: false });
        setIsPro(true);
        Alert.alert('PhotoSweep Pro unlocked', 'Unlimited cleanups are yours for good.');
        router.back();
      } catch (error) {
        Alert.alert(
          'Couldn’t finish purchase',
          error instanceof Error ? error.message : 'Please use Restore Purchases and try again.',
        );
      } finally {
        setBuying(false);
      }
    },
    onPurchaseError: error => {
      setBuying(false);
      if (error.code !== ErrorCode.UserCancelled) {
        Alert.alert('Purchase failed', error.message || 'Please try again.');
      }
    },
  });

  useEffect(() => {
    if (connected) {
      void fetchProducts({ skus: [PRODUCTS.lifetime], type: 'in-app' });
    }
  }, [connected, fetchProducts]);

  const product = useMemo(
    () => products.find(item => item.id === PRODUCTS.lifetime),
    [products],
  );
  const price = product?.displayPrice ?? '¥2,480';

  const buy = async () => {
    if (!product || buying) return;
    try {
      setBuying(true);
      await requestPurchase({
        request: {
          apple: { sku: PRODUCTS.lifetime, quantity: 1 },
          google: { skus: [PRODUCTS.lifetime] },
        },
        type: 'in-app',
      });
    } catch (error) {
      setBuying(false);
      Alert.alert('Purchase failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const restore = async () => {
    if (!connected || restoring) return;
    try {
      setRestoring(true);
      const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      const owned = purchases.some(purchase => purchase.productId === PRODUCTS.lifetime);
      setIsPro(owned);
      Alert.alert(
        owned ? 'Purchase restored' : 'Nothing to restore',
        owned ? 'PhotoSweep Pro is unlocked again.' : 'No PhotoSweep Pro purchase was found for this Apple ID.',
      );
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.page}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={styles.close}>
        <Ionicons name="close" size={22} />
      </Pressable>
      <LinearGradient colors={['#CFFFEA', '#DCEBFF', '#FFFFFF']} style={styles.hero}>
        <View style={styles.gem}><Ionicons name="diamond" size={30} /></View>
        <Text style={styles.title}>PhotoSweep Pro</Text>
        <Text style={styles.sub}>One purchase. A calmer camera roll for good.</Text>
      </LinearGradient>
      <View style={styles.body}>
        {[
          'Unlimited photo removals',
          'Full similar-candidate review',
          'Large & older photo filters',
          'Future Pro cleanup tools',
        ].map(item => (
          <View key={item} style={styles.row}>
            <Ionicons name="checkmark-circle" size={22} />
            <Text style={styles.rowText}>{item}</Text>
          </View>
        ))}
        <View style={styles.plan}>
          <View>
            <Text style={styles.planTop}>LIFETIME UNLOCK</Text>
            <Text style={styles.price}>{price}</Text>
            <Text style={styles.small}>One-time purchase. No subscription.</Text>
          </View>
          <View style={styles.best}><Text style={styles.bestText}>PAY ONCE</Text></View>
        </View>
        <PrimaryButton
          title={buying ? 'Processing…' : product ? 'Unlock PhotoSweep Pro' : 'Preparing App Store…'}
          onPress={buy}
          disabled={buying || !connected || !product}
        />
        <Text style={styles.legal}>Payment is charged to your Apple ID after confirmation. This is a non-consumable, one-time purchase.</Text>
        <View style={styles.links}>
          <Pressable onPress={restore}><Text style={styles.link}>{restoring ? 'Restoring…' : 'Restore Purchases'}</Text></Pressable>
          <Pressable onPress={() => router.push('/terms')}><Text style={styles.link}>Terms</Text></Pressable>
          <Pressable onPress={() => router.push('/privacy')}><Text style={styles.link}>Privacy</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page:{flex:1,backgroundColor:'#fff'},close:{position:'absolute',zIndex:2,top:58,right:20,width:42,height:42,borderRadius:14,backgroundColor:'rgba(255,255,255,.8)',alignItems:'center',justifyContent:'center'},hero:{height:305,padding:28,paddingTop:100,justifyContent:'center'},gem:{width:58,height:58,borderRadius:18,backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},title:{fontSize:37,fontWeight:'900',letterSpacing:-1.3,marginTop:18},sub:{fontSize:15,color:colors.muted,marginTop:8},body:{padding:24,gap:15},row:{flexDirection:'row',gap:11,alignItems:'center'},rowText:{fontSize:15,fontWeight:'700'},plan:{borderWidth:2,borderColor:colors.ink,borderRadius:20,padding:17,marginTop:5,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},planTop:{fontSize:10,fontWeight:'900',letterSpacing:1.3},price:{fontSize:22,fontWeight:'900',marginTop:4},small:{fontSize:11,color:colors.muted,marginTop:3,maxWidth:220},best:{backgroundColor:colors.ink,borderRadius:99,paddingHorizontal:10,paddingVertical:6},bestText:{color:'#fff',fontSize:9,fontWeight:'900'},legal:{fontSize:10,color:colors.muted,lineHeight:15,textAlign:'center'},links:{flexDirection:'row',justifyContent:'center',gap:18},link:{fontSize:11,fontWeight:'800',textDecorationLine:'underline'}
});
