import { requireNativeModule } from 'expo-modules-core';
import type { CompressionAdapter, CompressionJob } from '../domain/compression';
const native = requireNativeModule<{
  compressionStart(id: string, preset: string): Promise<CompressionJob>;
  compressionStatus(): Promise<CompressionJob>;
  compressionCancel(): Promise<void>;
  compressionSave(id: string): Promise<CompressionJob>;
}>('PhotoSweepAccess');
export const compression: CompressionAdapter = {
  start: (id, preset) => native.compressionStart(id, preset),
  status: () => native.compressionStatus(), cancel: () => native.compressionCancel(), save: id => native.compressionSave(id),
};
