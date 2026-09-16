/** Design contracts only. Port to app domains; implement with the installed SDK's documented APIs. */
export type AssetId = string;
export type ReviewChoice = 'keep' | 'candidate';
export type PhotoPermission = 'unknown' | 'full' | 'limited' | 'denied' | 'restricted';
export type NativeDeletionResult =
  | { kind:'confirmed'; deletedIds: AssetId[]; stillPresentIds: AssetId[] }
  | { kind:'cancelled' }
  | { kind:'failed'; userMessage: string }
  | { kind:'unknown'; jobId: string };
export type Entitlement =
  | { kind:'free' | 'unknown' | 'expired' | 'revoked'; verified:boolean }
  | { kind:'trial_active' | 'subscribed'; verified:true; expiresAtMs:number; autoRenew:boolean; productId:string }
  | { kind:'grace'; verified:true; graceExpiresAtMs:number; productId:string }
  | { kind:'legacy_lifetime'; verified:true; productId:string };
export interface PhotoRepository {
  permission(): Promise<PhotoPermission>;
  page(scope: {month?:string; screenshotsOnly?:boolean; after?:string; limit:number}): Promise<{ids:AssetId[];next?:string;total?:number}>;
  /** Never treat an asset id as a usable image URL without SDK resolution. */
  resolvePreview(id:AssetId): Promise<{uri:string;width:number;height:number}>;
  /** Use explicit user-confirmed ids and the platform's confirmation. */
  deleteRequested(ids:AssetId[]): Promise<NativeDeletionResult>;
}
export interface BillingAdapter {
  /** Price, period and offer are native store data, not product spec constants. */
  products(): Promise<Array<{id:string;displayPrice:string;period:'month'|'year'}>>;
  introEligibility(productId:string):Promise<'eligible'|'ineligible'|'unknown'>;
  currentEntitlement():Promise<Entitlement>;
  purchase(productId:string):Promise<'pending'|'cancelled'|'verify_required'>;
  restore():Promise<Entitlement>;
  openSubscriptionManagement():Promise<void>;
}
export interface ReviewPersistence {
  /** Decision + candidate membership + day quota + cursor must be atomic/idempotent. */
  commitDecision(event:{eventId:string;assetId:AssetId;choice:ReviewChoice;sessionId:string;dayKey:string}):Promise<void>;
  undo(eventId:string):Promise<void>;
  checkpoint():Promise<void>;
}
