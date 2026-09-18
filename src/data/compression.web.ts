import type { CompressionAdapter } from '../domain/compression';
const unavailable = async (): Promise<never> => { throw new Error('動画圧縮はiPhoneで利用できます。'); };
export const compression: CompressionAdapter = { start: unavailable, status: async () => ({ id: '', assetId: '', phase: 'idle' }), cancel: async () => {}, save: unavailable };
