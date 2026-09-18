import React from 'react';
import { AppState, Button, Platform, type AppStateStatus } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { useReviewPrompt } from '../src/state/useReviewPrompt';
import { useApp } from '../src/state/AppContext';
import { reviewPrompt } from '../src/data/reviewPrompt';
import { model } from './app-model';
jest.mock('../src/state/AppContext', () => ({ useApp: jest.fn() }));
jest.mock('../src/data/reviewPrompt', () => ({ reviewPrompt: { available: jest.fn(async () => true), request: jest.fn(async () => {}) } }));
function View() { const cancel = useReviewPrompt('confirmed'); return <Button title="continue" onPress={cancel} />; }
let app: ReturnType<typeof model>;
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); Platform.OS = 'ios';
  app = model(); app.preview = false;
  app.state.deletion = { id: 'confirmed', ids: ['x'], deleted: ['x'], remaining: [], at: Date.now(), status: 'done' };
  const outcome = { id: 'confirmed', at: Date.now(), photoCount: 1, videoCount: 0, knownBytes: 10, unknownCount: 0, estimated: false };
  app.state.outcomes = [outcome, { ...outcome, id: 'yesterday', at: Date.now() - 86400000 }];
  app.mutate = jest.fn(async fn => { app.state = fn(app.state); return app.state; });
  jest.mocked(useApp).mockReturnValue(app);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
async function elapse() { await act(async () => { jest.advanceTimersByTime(2200); }); }
test('official request follows persisted attempt and cannot repeat on the same version', async () => {
  const view = render(<View />); await elapse();
  expect(app.state.reviewPrompt?.version).toBe('1.3.0');
  expect(reviewPrompt.request).toHaveBeenCalledTimes(1);
  view.unmount(); render(<View />); await elapse();
  expect(reviewPrompt.request).toHaveBeenCalledTimes(1);
});
test('interaction cancels a scheduled request', async () => {
  const view = render(<View />); fireEvent.press(view.getByText('continue')); await elapse();
  expect(reviewPrompt.request).not.toHaveBeenCalled(); expect(app.mutate).not.toHaveBeenCalled();
});
test('leaving the result screen cancels the request', async () => {
  const view = render(<View />); view.unmount(); await elapse(); expect(reviewPrompt.request).not.toHaveBeenCalled();
});
test('background transition cancels the request', async () => {
  let changed: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => { changed = handler; return { remove: jest.fn() }; });
  render(<View />); changed?.('background'); await elapse(); expect(reviewPrompt.request).not.toHaveBeenCalled();
});
test.each(['pending', 'partial', 'unknown', 'cancelled'] as const)('no review request for %s deletion', async status => {
  app.state.deletion!.status = status; render(<View />); await elapse(); expect(reviewPrompt.request).not.toHaveBeenCalled();
});
test('purchase pending does not interrupt the user with a review request', async () => {
  app.purchaseState = 'pending'; render(<View />); await elapse(); expect(reviewPrompt.request).not.toHaveBeenCalled();
});
