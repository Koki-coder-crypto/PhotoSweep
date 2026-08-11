import { Asset } from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PhotoTile } from '../src/components/PhotoGrid';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { formatBytes } from '../src/lib/format';
import { FREE_DELETE_LIMIT } from '../src/lib/monetization';
import { colors } from '../src/lib/theme';
import { useAppStore } from '../src/store/AppStore';

export default function Review() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const {
    scan,
    selectedIds,
    toggleSelected,
    clearSelected,
    addFreedBytes,
    setScan,
    isPro,
    freeDeletesUsed,
    addFreeDeletes,
  } = useAppStore();

  if (!scan) return null;

  const reviewKind = kind === 'large' || kind === 'old' || kind === 'similar' ? kind : 'similar';
  const photos = reviewKind === 'large'
    ? scan.large
    : reviewKind === 'old'
      ? scan.old
      : scan.similarGroups.flatMap(group => group.photos);
  const visiblePhotos = photos.slice(0, 500);
  const selected = visiblePhotos.filter(photo => selectedIds.has(photo.id));
  const bytes = selected.reduce((sum, photo) => sum + photo.estimatedBytes, 0);
  const title = reviewKind === 'large' ? 'Space hogs' : reviewKind === 'old' ? 'Older photos' : 'Similar candidates';
  const desc = reviewKind === 'similar'
    ? 'Grouped by nearby capture time, framing and resolution. These are suggestions, not guaranteed duplicates.'
    : reviewKind === 'large'
      ? 'High-resolution photos that are likely using the most space.'
      : 'Photos older than a year — an easy place to revisit memories you may no longer need.';
  const remainingFree = Math.max(0, FREE_DELETE_LIMIT - freeDeletesUsed);

  const remove = () => {
    if (!selected.length) return;
    if (!isPro && selected.length > remainingFree) {
      Alert.alert(
        'Free cleanup limit reached',
        `You can delete ${remainingFree} more photo${remainingFree === 1 ? '' : 's'} on the free plan. Pro unlocks unlimited cleanups.`,
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'See Pro', onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }

    Alert.alert(
      'Delete selected photos?',
      `${selected.length} photo${selected.length === 1 ? '' : 's'} will be deleted from your photo library. iOS may keep them in Recently Deleted for a period of time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Asset.delete(selected.map(photo => new Asset(photo.id)));
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              addFreedBytes(bytes);
              if (!isPro) addFreeDeletes(selected.length);

              const deleted = new Set(selected.map(photo => photo.id));
              setScan({
                ...scan,
                photos: scan.photos.filter(photo => !deleted.has(photo.id)),
                large: scan.large.filter(photo => !deleted.has(photo.id)),
                old: scan.old.filter(photo => !deleted.has(photo.id)),
                similarGroups: scan.similarGroups
                  .map(group => {
                    const remaining = group.photos.filter(photo => !deleted.has(photo.id));
                    return {
                      ...group,
                      photos: remaining,
                      estimatedSavingsBytes: Math.max(0, group.estimatedSavingsBytes - bytes),
                    };
                  })
                  .filter(group => group.photos.length >= 2),
                estimatedLibraryBytes: Math.max(0, scan.estimatedLibraryBytes - bytes),
              });
              clearSelected();
              Alert.alert('Cleanup complete', `About ${formatBytes(bytes)} selected for removal.`);
            } catch (error) {
              Alert.alert('Couldn’t delete', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const header = (
    <View style={styles.listHeader}>
      <Text style={styles.big}>{photos.length.toLocaleString()} photos</Text>
      <Text style={styles.desc}>{desc}</Text>
      {!isPro && (
        <View style={styles.freeMeter}>
          <Ionicons name="sparkles-outline" size={18} />
          <Text style={styles.freeText}>{remainingFree} free deletions remaining</Text>
          <Pressable onPress={() => router.push('/paywall')}><Text style={styles.upgrade}>Unlock</Text></Pressable>
        </View>
      )}
      <View style={styles.tip}>
        <Ionicons name="checkmark-circle-outline" size={18} />
        <Text style={styles.tipText}>Tap photos you want to remove. Nothing is deleted until you confirm.</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { clearSelected(); router.back(); }} style={styles.back}>
          <Ionicons name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headTitle}>{title}</Text>
        <View style={{ width: 44 }} />
      </View>
      <FlatList
        data={visiblePhotos}
        keyExtractor={item => item.id}
        numColumns={3}
        renderItem={({ item }) => <PhotoTile photo={item} selected={selectedIds.has(item.id)} onToggle={toggleSelected} />}
        ListHeaderComponent={header}
        ListFooterComponent={photos.length > visiblePhotos.length ? <Text style={styles.more}>Showing the first 500 results to keep review fast.</Text> : null}
        contentContainerStyle={styles.content}
        initialNumToRender={24}
        maxToRenderPerBatch={30}
        windowSize={7}
        removeClippedSubviews
      />
      <View style={styles.bottom}>
        <View>
          <Text style={styles.selected}>{selected.length} selected</Text>
          <Text style={styles.bytes}>{formatBytes(bytes)} estimated</Text>
        </View>
        <PrimaryButton title="Delete" onPress={remove} disabled={!selected.length} style={{ width: 140 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.line },
  back: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  headTitle: { fontSize: 16, fontWeight: '900' },
  content: { paddingHorizontal: 18, paddingBottom: 130 },
  listHeader: { paddingTop: 20 },
  big: { fontSize: 32, fontWeight: '900', letterSpacing: -1.2 },
  desc: { fontSize: 14, color: colors.muted, lineHeight: 21, marginTop: 7, marginBottom: 14 },
  freeMeter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, marginBottom: 12 },
  freeText: { flex: 1, fontSize: 12, fontWeight: '700' },
  upgrade: { fontSize: 12, fontWeight: '900', textDecorationLine: 'underline' },
  tip: { flexDirection: 'row', gap: 9, backgroundColor: colors.soft, padding: 14, borderRadius: 16, marginBottom: 16 },
  tipText: { fontSize: 12, color: colors.muted, flex: 1, lineHeight: 18 },
  more: { textAlign: 'center', color: colors.muted, fontSize: 12, marginVertical: 18 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.line, padding: 18, paddingBottom: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selected: { fontWeight: '900', fontSize: 15 },
  bytes: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
