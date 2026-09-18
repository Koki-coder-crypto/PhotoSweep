import { migrateMedia, registerMedia } from "../domain/media";
import { readStorage } from "../data/storage";
import { sessionSource } from "../domain/sessionSource";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { createPersistence } from "../data/persistence";
import { createPhotoRepository } from "../data/photos";
import { createBillingAdapter } from "../data/billing";
import { syncNotifications } from "../data/notifications";
import { decisionFeedback } from "../data/feedback";
import { clock, hasPro, refreshDay } from "../domain/policy";
import {
  initialState,
  ReviewController,
  startSession,
  decide,
  undo,
  removeCandidate,
  beginDeletion,
  reconcileDeletion,
  stageCandidates,
} from "../domain/review";
import { useLibraryAnalysis } from "./useLibraryAnalysis";
import { migrateOnboarding } from "../domain/onboarding";
import type { LibraryAnalysis } from "../domain/analysis";
import type {
  BillingAdapter,
  Choice,
  Entitlement,
  Permission,
  Photo,
  PhotoRepository,
  ReviewState,
  Scope,
  Settings,
  StoreProduct,
} from "../domain/types";

export interface AppModel {
  state: ReviewState;
  ready: boolean;
  bootError: string;
  retryBoot(): void;
  photos: Photo[];
  analysis?: LibraryAnalysis;
  permission: Permission;
  loading: boolean;
  libraryError: string;
  libraryTotal?: number;
  busy: boolean;
  message: string;
  clearMessage(): void;
  notify(message: string): void;
  entitlement: Entitlement;
  products: StoreProduct[];
  billingError: string;
  billingLoading: boolean;
  purchaseState:
    | "idle"
    | "pending"
    | "failed"
    | "cancelled"
    | "verified"
    | "restored"
    | "none";
  repository: PhotoRepository;
  preview: boolean;
  reload(request?: boolean): Promise<void>;
  selectMore(): Promise<void>;
  mutate(fn: (s: ReviewState) => ReviewState): Promise<ReviewState>;
  start(scope?: Scope): Promise<void>;
  choose(id: string, choice: Choice | "skip"): Promise<void>;
  undo(): Promise<void>;
  removeCandidate(id: string): Promise<void>;
  deletePhotos(ids: string[]): Promise<void>;
  stageCandidates(ids: string[]): Promise<void>;
  reconcile(): Promise<void>;
  loadBilling(): Promise<void>;
  refreshEntitlement(): Promise<void>;
  purchase(id: string): Promise<void>;
  restore(): Promise<void>;
  manage(): Promise<void>;
  dismissPurchaseResult(): void;
  settings(patch: Partial<Settings>): Promise<void>;
}
const Context = createContext<AppModel | null>(null);
const textError = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "処理を完了できませんでした。もう一度お試しください。";
export function AppProvider({
  children,
  overrides,
}: PropsWithChildren<{
  overrides?: {
    state?: ReviewState;
    photos?: PhotoRepository;
    billing?: BillingAdapter;
    purchaseState?: AppModel["purchaseState"];
  };
}>) {
  const [repository] = useState(
    () => overrides?.photos || createPhotoRepository(),
  );
  const [billing] = useState(
    () => overrides?.billing || createBillingAdapter(),
  );
  const controller = useRef<ReviewController | null>(null);
  const [state, setState] = useState(
    () => overrides?.state || initialState(clock()),
  );
  const [ready, setReady] = useState(false),
    [bootError, setBootError] = useState(""),
    [bootAttempt, setBootAttempt] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]),
    [permission, setPermission] = useState<Permission>("unknown");
  const [loading, setLoading] = useState(false),
    [libraryError, setLibraryError] = useState(""),
    [libraryTotal, setLibraryTotal] = useState<number>();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [entitlement, setEntitlement] = useState<Entitlement>({
    kind: "unknown",
    verified: false,
  });
  const entitlementRef = useRef(entitlement);
  entitlementRef.current = entitlement;
  const [products, setProducts] = useState<StoreProduct[]>([]),
    [billingError, setBillingError] = useState(""),
    [billingLoading, setBillingLoading] = useState(false);
  const [purchaseState, setPurchaseState] = useState<AppModel["purchaseState"]>(
    overrides?.purchaseState || "idle",
  );
  const generation = useRef(0),
    deletionRunning = useRef(false),
    purchaseRunning = useRef(false),
    starting = useRef(false);
  const activeWrites = useRef(0);
  const analysis = useLibraryAnalysis(repository, photos, permission, loading);
  const mutate = useCallback(async (fn: (s: ReviewState) => ReviewState) => {
    if (!controller.current) throw new Error("保存の準備中です。");
    activeWrites.current++;
    setBusy(true);
    try {
      const next = await controller.current.mutate(fn);
      setState(next);
      return next;
    } catch (e) {
      setMessage(textError(e));
      throw e;
    } finally {
      activeWrites.current--;
      setBusy(activeWrites.current > 0 || starting.current);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void (async () => {
      setBootError("");
      const persistence = overrides
        ? { load: async () => overrides.state || null, save: async () => {} }
        : await createPersistence();
      const saved = await persistence.load();
      let next = saved || initialState(clock());
      if (!saved && !overrides) {
        next.onboarded = (await AsyncStorage.getItem("onboarded")) === "1";
      }
      const refreshed = migrateOnboarding(refreshDay(migrateMedia(next), clock()));
      await persistence.save(next, refreshed);
      if (!active) return;
      controller.current = new ReviewController(refreshed, persistence);
      setState(refreshed);
      setReady(true);
    })().catch((e) => {
      if (active) setBootError(textError(e));
    });
    return () => {
      active = false;
    };
  }, [bootAttempt, overrides]);
  const reload = useCallback(
    async (request = false) => {
      const token = ++generation.current;
      setLoading(true);
      setLibraryError("");
      try {
        const p = await repository.permission(request);
        if (token !== generation.current) return;
        setPermission(p);
        if (p !== "full" && p !== "limited") {
          setPhotos([]);
          setLibraryTotal(undefined);
          return;
        }
        const collected = new Map<string, Photo>();
        let after: string | undefined;
        do {
          const page = await repository.page({ order: "newest" }, after, 250);
          if (token !== generation.current) return;
          page.items.forEach((p) => collected.set(p.id, p));
          setPhotos([...collected.values()]);
          setLibraryTotal(page.total);
          if (page.next && page.next === after)
            throw new Error("写真一覧を更新してください。");
          after = page.next;
        } while (after);
      } catch (e) {
        if (token === generation.current) setLibraryError(textError(e));
      } finally {
        if (token === generation.current) setLoading(false);
      }
    },
    [repository],
  );
  const refreshEntitlement = useCallback(async () => {
    try {
      const e = await billing.entitlement();
      const verified =
        e.kind === "unknown" && hasPro(entitlementRef.current, Date.now())
          ? entitlementRef.current
          : e;
      setEntitlement(verified);
      entitlementRef.current = verified;
    } catch {
      setEntitlement((previous) =>
        hasPro(previous, Date.now())
          ? previous
          : { kind: "unknown", verified: false },
      );
    }
  }, [billing]);
  const reconcile = useCallback(async () => {
    const job = controller.current?.state.deletion;
    if (
      !job ||
      !["pending", "unknown"].includes(job.status) ||
      deletionRunning.current
    )
      return;
    try {
      const check = await repository.inspect(job.ids);
      await mutate((s) =>
        reconcileDeletion(
          s,
          check.inaccessible.length
            ? { kind: "unknown" }
            : { kind: "confirmed", deleted: check.missing },
        ),
      );
    } catch {
      setMessage("削除結果を確認できませんでした。候補は保持されています。");
    }
  }, [repository, mutate]);
  useEffect(() => {
    if (!ready) return;
    void reload();
    void refreshEntitlement();
    if (!overrides) void reconcile();
    const changed = repository.subscribe(() => {
      void reload();
    });
    const returned = AppState.addEventListener("change", (status) => {
      if (status !== "active") return;
      void mutate((s) => refreshDay(s, clock())).catch(() => {});
      void reload();
      void refreshEntitlement();
      void reconcile();
    });
    const billingChanged = billing.subscribe((outcome) => {
      if (outcome) setPurchaseState(outcome);
      void refreshEntitlement();
    });
    const timer = setInterval(() => {
      void mutate((s) => refreshDay(s, clock())).catch(() => {});
    }, 60000);
    return () => {
      generation.current++;
      changed();
      returned.remove();
      billingChanged();
      clearInterval(timer);
    };
  }, [
    ready,
    reload,
    refreshEntitlement,
    reconcile,
    mutate,
    repository,
    billing,
  ]);
  useEffect(() => () => billing.dispose(), [billing]);
  useEffect(() => {
    if (!ready || loading || !repository.size || overrides) return;
    let cancelled = false;
    const ordered = [...photos].sort((a, b) => {
      const rank = (photo: Photo) => controller.current?.state.decisions[photo.id]?.choice === 'candidate' ? 0 : photo.kind === 'video' ? 1 : 2;
      return rank(a) - rank(b);
    });
    void (async () => {
      for (const photo of ordered) {
        if (cancelled) break;
        const cached = controller.current?.state.sizes?.[photo.id];
        if (cached && cached.modifiedAt === (photo.modifiedAt || 0)) continue;
        while ((activeWrites.current || starting.current || deletionRunning.current) && !cancelled)
          await new Promise(resolve => setTimeout(resolve, 150));
        if (cancelled) break;
        const size = await repository.size!(photo.id);
        if (cancelled) break;
        // Do not let metadata work compete with an explicit user save.
        let stored = false, attempts = 0;
        while (!stored && !cancelled && attempts++ < 3) {
          try {
            await mutate(s => ({ ...s, sizes: { ...s.sizes, [photo.id]: { ...size, modifiedAt: photo.modifiedAt || 0 } } }));
            stored = true;
          } catch { await new Promise(resolve => setTimeout(resolve, 500)); }
        }
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [ready, loading, photos, repository, mutate, overrides]);
  useEffect(() => {
    if (ready && !overrides)
      void syncNotifications(state.settings, entitlement).catch(() => {});
  }, [ready, state.settings, entitlement, overrides]);
  const loadBilling = async () => {
    setBillingLoading(true);
    setBillingError("");
    try {
      setProducts(await billing.loadProducts());
    } catch (e) {
      setProducts([]);
      setBillingError(textError(e));
    } finally {
      setBillingLoading(false);
    }
  };
  const start = async (scope: Scope = { order: "newest" }) => {
    if (starting.current) throw new Error("写真を準備しています。");
    if (!controller.current) throw new Error("保存の準備中です。");
    starting.current = true;
    setBusy(true);
    try {
      const current = controller.current!.state;
      const pro = hasPro(entitlementRef.current, Date.now());
      const safe: Scope = pro
        ? scope
        : {
            month: scope.month,
            mediaKind: scope.mediaKind, recordingsOnly: scope.recordingsOnly,
            screenshotsOnly: scope.screenshotsOnly,
            order: "newest",
          };
      const { ids, photos: found } = await sessionSource(repository, current, safe, entitlementRef.current, clock());
      await mutate((s) =>
        startSession(
          registerMedia(s, found),
          ids,
          safe,
          entitlementRef.current,
          clock(),
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ),
      );
    } finally {
      starting.current = false;
      setBusy(activeWrites.current > 0);
    }
  };
  const choose = async (id: string, choice: Choice | "skip") => {
    const next = await mutate((s) =>
      ({ ...decide(registerMedia(s, photos), id, choice, entitlementRef.current, clock()), monthHintSeen: true }),
    );
    if (choice !== "skip") void decisionFeedback(next.settings);
  };
  const deletePhotos = async (ids: string[]) => {
    if (deletionRunning.current) return;
    deletionRunning.current = true;
    try {
      const before = await repository.inspect(ids);
      if (before.present.length !== ids.length)
        throw new Error(
          "写真のアクセス範囲が変わりました。一覧を更新して候補を確認してください。",
        );
      const diskBefore = await readStorage();
      await mutate((s) => {
        const base = registerMedia(s, photos);
        const next = beginDeletion(base, ids, `${Date.now()}-${Math.random().toString(36).slice(2)}`, Date.now());
        return { ...next, deletion: { ...next.deletion!, freeBefore: diskBefore?.free,
          snapshot: Object.fromEntries(ids.map(id => { const photo = photos.find(p => p.id === id); const size = base.sizes?.[id]; return [id, { kind: base.mediaKinds?.[id] || "photo", ...(size && size.modifiedAt === (photo?.modifiedAt || 0) ? { size } : {}) }]; })) } };
      });
      const result = await repository.deleteRequested(ids);
      if (result === "cancelled") {
        await mutate((s) => reconcileDeletion(s, { kind: "cancelled" }));
        setMessage("削除をキャンセルしました。");
        return;
      }
      const check = await repository.inspect(ids);
      // The OS explicitly confirmed the transaction. Missing limited-access assets are then confirmed by that transaction.
      const permissionAfter = await repository.permission();
      const confirmedIds =
        result === "confirmed" &&
        (permissionAfter === "full" || permissionAfter === "limited")
          ? ids.filter((id) => !check.present.includes(id))
          : check.missing;
      const unknown = result !== "confirmed" && check.inaccessible.length > 0;
      const next = await mutate((s) =>
        reconcileDeletion(
          s,
          unknown
            ? { kind: "unknown" }
            : { kind: "confirmed", deleted: confirmedIds },
        ),
      );
      const diskAfter = await readStorage();
      if (diskAfter && next.deletion?.deleted.length) await mutate(s => ({ ...s, outcomes: s.outcomes?.map(x => x.id === next.deletion?.id ? { ...x, freeAfter: diskAfter.free } : x) }));
      // Update visible cards as soon as the confirmed transaction is saved.
      // A slower library refresh must not leave deleted thumbnails on screen.
      if (next.deletion?.deleted.length) {
        const removed = new Set(next.deletion.deleted);
        generation.current++;
        setPhotos((previous) =>
          previous.filter((photo) => !removed.has(photo.id)),
        );
        setLibraryTotal((previous) =>
          previous === undefined
            ? undefined
            : Math.max(0, previous - removed.size),
        );
      }
      if (
        next.deletion?.status === "done" &&
        next.settings.haptics &&
        Platform.OS !== "web"
      )
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
    } catch (e) {
      const requested =
        controller.current?.state.deletion?.status === "pending";
      if (requested)
        await mutate((s) => reconcileDeletion(s, { kind: "unknown" })).catch(
          () => {},
        );
      setMessage(textError(e));
      if (!requested) throw e;
    } finally {
      deletionRunning.current = false;
      void reload();
    }
  };
  const purchase = async (id: string) => {
    if (purchaseRunning.current || purchaseState === "pending") return;
    purchaseRunning.current = true;
    setPurchaseState("pending");
    try {
      const result = await billing.purchase(id);
      setPurchaseState(result);
      await refreshEntitlement();
    } catch (e) {
      setPurchaseState("failed");
      setBillingError(textError(e));
    } finally {
      purchaseRunning.current = false;
    }
  };
  const restore = async () => {
    if (purchaseRunning.current) return;
    purchaseRunning.current = true;
    setPurchaseState("pending");
    try {
      const e = await billing.restore();
      setEntitlement(e);
      entitlementRef.current = e;
      setPurchaseState(hasPro(e, Date.now()) ? "restored" : "none");
    } catch (e) {
      setPurchaseState("failed");
      setBillingError(textError(e));
    } finally {
      purchaseRunning.current = false;
    }
  };
  const value: AppModel = {
    state,
    ready,
    bootError,
    retryBoot: () => setBootAttempt((x) => x + 1),
    photos,
    analysis,
    permission,
    loading,
    libraryError,
    libraryTotal,
    busy,
    message,
    clearMessage: () => setMessage(""),
    notify: setMessage,
    entitlement,
    products,
    billingError,
    billingLoading,
    purchaseState,
    repository,
    preview: Platform.OS === "web",
    reload,
    mutate,
    start,
    choose,
    undo: async () => {
      await mutate(undo);
    },
    dismissPurchaseResult: () =>
      setPurchaseState((current) => (current === "pending" ? current : "idle")),
    removeCandidate: async (id) => {
      await mutate((s) => removeCandidate(s, id));
    },
    deletePhotos,
    stageCandidates: async (ids) => {
      await mutate((s) =>
        stageCandidates(registerMedia(s, photos), ids, entitlementRef.current, clock()),
      );
    },
    reconcile,
    loadBilling,
    refreshEntitlement,
    purchase,
    restore,
    manage: async () => {
      try {
        await billing.manage();
        await refreshEntitlement();
      } catch (e) {
        setMessage(textError(e));
      }
    },
    selectMore: async () => {
      await repository.selectMore();
      await reload();
    },
    settings: async (patch) => {
      await mutate((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("AppProvider is missing");
  return value;
}
