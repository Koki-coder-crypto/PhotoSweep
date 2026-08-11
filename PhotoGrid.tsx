import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PhotoItem } from '../lib/photoScanner';
import { colors } from '../lib/theme';

type Props = { photo: PhotoItem; selected: boolean; onToggle: (id: string) => void };

export function PhotoTile({ photo, selected, onToggle }: Props) {
  return (
    <View style={styles.slot}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`Select ${photo.filename}`}
        onPress={() => onToggle(photo.id)}
        style={styles.cell}
      >
        <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />
        <View style={[styles.check, selected && styles.checkActive]}>
          {selected && <Ionicons name="checkmark" size={15} color="#fff" />}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: '33.333%', padding: 2 },
  cell: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.soft },
  image: { width: '100%', height: '100%' },
  check: { position: 'absolute', top: 7, right: 7, width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: colors.ink, borderColor: colors.ink },
});
