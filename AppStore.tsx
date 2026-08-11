import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import type { ScanResult } from '../lib/photoScanner';

type Store = {
  hydrated: boolean;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  scan: ScanResult | null;
  setScan: (v: ScanResult | null) => void;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  freedBytes: number;
  addFreedBytes: (n: number) => void;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  freeDeletesUsed: number;
  addFreeDeletes: (n: number) => void;
};

const AppStoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboardedState] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [freedBytes, setFreedBytes] = useState(0);
  const [isPro, setIsProState] = useState(false);
  const [freeDeletesUsed, setFreeDeletesUsed] = useState(0);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('onboarded'),
      AsyncStorage.getItem('freedBytes'),
      AsyncStorage.getItem('isPro'),
      AsyncStorage.getItem('freeDeletesUsed'),
    ])
      .then(([o, f, p, d]) => {
        setOnboardedState(o === '1');
        setFreedBytes(Number(f || 0));
        setIsProState(p === '1');
        setFreeDeletesUsed(Number(d || 0));
      })
      .finally(() => setHydrated(true));
  }, []);

  const setOnboarded = (v: boolean) => {
    setOnboardedState(v);
    void AsyncStorage.setItem('onboarded', v ? '1' : '0');
  };
  const setIsPro = (v: boolean) => {
    setIsProState(v);
    void AsyncStorage.setItem('isPro', v ? '1' : '0');
  };
  const addFreedBytes = (n: number) => {
    setFreedBytes(prev => {
      const next = prev + n;
      void AsyncStorage.setItem('freedBytes', String(next));
      return next;
    });
  };
  const addFreeDeletes = (n: number) => {
    setFreeDeletesUsed(prev => {
      const next = prev + n;
      void AsyncStorage.setItem('freeDeletesUsed', String(next));
      return next;
    });
  };
  const toggleSelected = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const clearSelected = () => setSelectedIds(new Set());

  const value = useMemo(
    () => ({
      hydrated,
      onboarded,
      setOnboarded,
      scan,
      setScan,
      selectedIds,
      toggleSelected,
      clearSelected,
      freedBytes,
      addFreedBytes,
      isPro,
      setIsPro,
      freeDeletesUsed,
      addFreeDeletes,
    }),
    [hydrated, onboarded, scan, selectedIds, freedBytes, isPro, freeDeletesUsed],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used inside AppStoreProvider');
  return ctx;
}
