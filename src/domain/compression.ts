export type CompressionPhase = 'idle' | 'preparing' | 'encoding' | 'ready' | 'saving' | 'saved' | 'unknown' | 'cancelled' | 'failed' | 'not-smaller';
export interface CompressionJob {
  id: string; assetId: string; phase: CompressionPhase; progress?: number;
  message?: string; inputUri?: string; outputUri?: string; inputBytes?: number; outputBytes?: number; savedId?: string;
}
export interface CompressionAdapter {
  start(assetId: string, preset: '1080' | '720'): Promise<CompressionJob>;
  status(): Promise<CompressionJob>;
  cancel(): Promise<void>;
  save(jobId: string): Promise<CompressionJob>;
}
export function mayStageOriginal(job: CompressionJob): boolean {
  return job.phase === 'saved' && !!job.savedId && job.savedId !== job.assetId;
}
