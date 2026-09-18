import { Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { StorageReading } from '../domain/types';
export async function readStorage(): Promise<StorageReading | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const free = Paths.availableDiskSpace, total = Paths.totalDiskSpace;
    if (!Number.isFinite(free) || !Number.isFinite(total) || free < 0 || total <= 0) return null;
    return { free, total, at: Date.now() };
  } catch { return null; }
}
