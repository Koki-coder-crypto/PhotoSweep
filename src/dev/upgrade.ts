import type { CompressionAdapter, CompressionJob } from '../domain/compression';
const adapters = new Map<string, CompressionAdapter>();
export function upgradeAdapter(phase: CompressionJob['phase']): CompressionAdapter {
  if (adapters.has(phase)) return adapters.get(phase)!;
  const job: CompressionJob = { id: 'catalog-compression', assetId: 'demo-8', phase, inputBytes: 240000000, outputBytes: 85000000, progress: 0.45,
    ...(phase === 'saved' ? { savedId: 'demo-copy' } : {}), ...(phase === 'failed' ? { message: '変換に失敗しました。原本は残っています。' } : {}) };
  const result: CompressionAdapter = { start: async () => job, status: async () => job, cancel: async () => {}, save: async () => ({ ...job, phase: 'saving' }) };
  adapters.set(phase, result); return result;
}
