import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Compress, Videos } from '../src/screens/videos';
import { useApp } from '../src/state/AppContext';
import { model } from './app-model';
import type { CompressionAdapter, CompressionJob } from '../src/domain/compression';
jest.mock('../src/state/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../src/data/compression', () => ({ compression: {} }));
const use = jest.mocked(useApp);
beforeEach(() => { jest.clearAllMocks(); });
function adapter(phase: CompressionJob['phase']): CompressionAdapter {
  const job: CompressionJob = { id: 'j', assetId: 'demo-8', phase, inputBytes: 1000, outputBytes: 500, ...(phase === 'saved' ? { savedId: 'saved-copy' } : {}) };
  return { status: jest.fn(async () => job), start: jest.fn(async () => job), cancel: jest.fn(async () => {}), save: jest.fn(async () => ({ ...job, phase: 'saving' as const })) };
}
test.each(['preparing', 'encoding', 'ready', 'saving', 'unknown', 'failed', 'cancelled', 'not-smaller'] as const)('compression %s never offers original deletion', async phase => {
  use.mockReturnValue(model()); const a = adapter(phase); render(<Compress adapter={a} initialId="demo-8" />);
  await waitFor(() => expect(a.status).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: '原本を削除候補にする' })).toBeNull();
});
test('only confirmed saved output exposes original staging; it never deletes directly', async () => {
  const app = model('S23'); use.mockReturnValue(app); render(<Compress adapter={adapter('saved')} />);
  const button = await screen.findByRole('button', { name: '原本を削除候補にする' });
  await act(async () => fireEvent.press(button));
  expect(app.stageCandidates).toHaveBeenCalledWith(['demo-8']); expect(app.deletePhotos).not.toHaveBeenCalled();
});
test('free user sees Pro before native compression starts', async () => {
  use.mockReturnValue(model()); const a = adapter('idle'); render(<Compress adapter={a} />);
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Proで動画を圧縮する' })));
  expect(router.push).toHaveBeenCalledWith('/paywall?source=compression'); expect(a.start).not.toHaveBeenCalled();
});
test('pending save removes save button and unknown offers only reconciliation', async () => {
  use.mockReturnValue(model('S23')); const a = adapter('unknown'); render(<Compress adapter={a} />);
  await screen.findByText('保存結果を確認できません');
  expect(screen.queryByRole('button', { name: '圧縮動画を保存する' })).toBeNull();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: '保存結果を再確認' })));
  expect(a.save).not.toHaveBeenCalled();
});
test('videos are selected into candidates without deleting or calling billing', async () => {
  const app = model(); app.photos = [{ ...app.photos[0]!, kind: 'video', duration: 64 }]; use.mockReturnValue(app);
  render(<Videos />); fireEvent.press(screen.getByRole('button', { name: '削除候補に選ぶ' }));
  await act(async () => fireEvent.press(screen.getByRole('button', { name: '1本を候補に入れる' })));
  expect(app.stageCandidates).toHaveBeenCalledWith(['demo-0']); expect(app.deletePhotos).not.toHaveBeenCalled();
});
