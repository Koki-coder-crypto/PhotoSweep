import { useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { reviewPrompt } from '../data/reviewPrompt';
import { mayRequestReview } from '../domain/media';
import { useApp } from './AppContext';
export function useReviewPrompt(jobId?: string) {
  const app = useApp(), latest = useRef(app); latest.current = app;
  const interacted = useRef(false);
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    interacted.current = false;
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') cancelled = true; });
    const timer = setTimeout(() => {
      void (async () => {
        const current = latest.current;
        if (cancelled || interacted.current || Platform.OS !== 'ios' || current.preview || current.busy || current.purchaseState === 'pending' || current.state.deletion?.id !== jobId || current.state.deletion?.status !== 'done' || !mayRequestReview(current.state, '1.3.0', Date.now())) return;
        if (!await reviewPrompt.available() || cancelled || interacted.current) return;
        await current.mutate(s => ({ ...s, reviewPrompt: { at: Date.now(), version: '1.3.0' } }));
        if (!cancelled && !interacted.current) await reviewPrompt.request();
      })().catch(() => {});
    }, 2150);
    return () => { cancelled = true; clearTimeout(timer); listener.remove(); };
  }, [jobId]));
  return () => { interacted.current = true; };
}
