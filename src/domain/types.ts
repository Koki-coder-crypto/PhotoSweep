export type Choice = "keep" | "candidate";
export type MediaKind = "photo" | "video";
export interface AssetSize {
  bytes: number | null;
  quality: "measured-resource" | "estimated" | "unknown";
  basis: "original-resource" | "local-resource" | "unknown";
  modifiedAt: number;
}
export interface StorageReading { free: number; total: number; at: number }
export interface CleanupOutcome {
  id: string; at: number; photoCount: number; videoCount: number;
  knownBytes: number; unknownCount: number; estimated: boolean;
  freeBefore?: number; freeAfter?: number;
}
export type Permission =
  | "unknown"
  | "full"
  | "limited"
  | "denied"
  | "restricted";
export interface Photo {
  id: string;
  uri: string;
  width: number;
  height: number;
  createdAt: number;
  screenshot: boolean;
  modifiedAt?: number;
  favorite?: boolean;
  kind?: MediaKind;
  duration?: number;
  screenRecording?: boolean;
}
export interface Scope {
  month?: string;
  screenshotsOnly?: boolean;
  mediaKind?: MediaKind;
  recordingsOnly?: boolean;
  start?: number;
  end?: number;
  order: "newest" | "oldest";
}
export interface PhotoPage {
  items: Photo[];
  next?: string;
  total?: number;
}
export interface PhotoRepository {
  permission(request?: boolean): Promise<Permission>;
  selectMore(): Promise<void>;
  page(scope: Scope, after?: string, limit?: number): Promise<PhotoPage>;
  resolve(id: string): Promise<Photo>;
  inspect(
    ids: string[],
  ): Promise<{ present: string[]; missing: string[]; inaccessible: string[] }>;
  deleteRequested(
    ids: string[],
  ): Promise<"confirmed" | "cancelled" | "unknown">;
  subscribe(callback: () => void): () => void;
  fingerprints?(ids: string[]): Promise<PhotoFingerprint[]>;
  contentDigests?(ids: string[]): Promise<{ id: string; digest: string }[]>;
  size?(id: string): Promise<AssetSize>;
}
export interface PhotoFingerprint {
  id: string;
  hash: string;
  quality: number;
  favorite: boolean;
  exactEligible: boolean;
}
export type Entitlement =
  | { kind: "free" | "unknown" | "expired" | "revoked"; verified: boolean }
  | {
      kind: "trial" | "active" | "grace";
      verified: true;
      productId: string;
      expiresAt: number;
      autoRenew: boolean;
      billingRetry?: boolean;
    }
  | { kind: "legacy"; verified: true; productId: string };
export interface StoreProduct {
  id: string;
  period: "week" | "month" | "year" | "lifetime";
  displayPrice: string;
  price: number;
  currency: string;
  eligibility: "eligible" | "ineligible" | "unknown";
  trialDays: number;
  groupId?: string;
}
export interface BillingAdapter {
  loadProducts(): Promise<StoreProduct[]>;
  entitlement(): Promise<Entitlement>;
  purchase(productId: string): Promise<"pending" | "cancelled" | "verified">;
  restore(): Promise<Entitlement>;
  manage(): Promise<void>;
  subscribe(
    callback: (
      outcome?: "verified" | "cancelled" | "failed" | "pending",
    ) => void,
  ): () => void;
  dispose(): void;
}
export interface Decision {
  choice: Choice;
  at: number;
  sessionId: string;
}
export interface Session {
  id: string;
  ids: string[];
  cursor: number;
  target: number;
  scope: Scope;
  startedAt: number;
  status: "active" | "paused" | "summary";
  steps: { id: string; previous?: Decision; choice?: Choice; cursor: number }[];
}
export interface DeletionJob {
  id: string;
  ids: string[];
  at: number;
  status: "pending" | "unknown" | "cancelled" | "done" | "partial";
  deleted: string[];
  remaining: string[];
  snapshot?: Record<string, { kind: MediaKind; size?: AssetSize }>;
  freeBefore?: number;
}
export interface Settings {
  haptics: boolean;
  sound: boolean;
  reduceMotion: boolean;
  weekly: boolean;
  trialReminder: boolean;
  batch: 20 | 50 | 100;
}
export interface ReviewState {
  onboarding?: import('./onboarding').OnboardingState;
  version: 1 | 2;
  mediaKinds?: Record<string, MediaKind>;
  monthSessions?: Record<string, Session>;
  monthHintSeen?: boolean;
  sizes?: Record<string, AssetSize>;
  outcomes?: CleanupOutcome[];
  reviewPrompt?: { at: number; version: string };
  onboarded: boolean;
  guided: boolean;
  decisions: Record<string, Decision>;
  day: string;
  lastWallTime: number;
  timezoneOffset: number;
  blockResetThrough: string;
  used: string[];
  quotaNoticeDay: string;
  session?: Session;
  deletion?: DeletionJob;
  settings: Settings;
  deletedCount: number;
  history: { id: string; at: number; kept: number; candidates: number }[];
}
export interface ReviewPersistence {
  load(): Promise<ReviewState | null>;
  save(previous: ReviewState, next: ReviewState): Promise<void>;
}
export interface Clock {
  now: number;
  day: string;
  timezoneOffset: number;
}
