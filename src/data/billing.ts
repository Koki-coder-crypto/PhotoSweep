import * as IAP from "expo-iap";
import { requireNativeModule } from "expo-modules-core";
import { config } from "../config";
import type {
  BillingAdapter,
  Entitlement,
  StoreProduct,
} from "../domain/types";
import { entitlementFromStore } from "../domain/billing";
import { hasPro } from "../domain/policy";
const knownSkus = [...new Set(Object.values(config.products))];
export function createBillingAdapter(): BillingAdapter {
  const access = requireNativeModule<{ canPurchase(): Promise<boolean> }>(
    "PhotoSweepAccess",
  );
  let initialized: Promise<void> | undefined;
  const subscribers = new Set<
    (outcome?: "verified" | "cancelled" | "failed" | "pending") => void
  >();
  let pending:
    | {
        sku: string;
        resolve: (v: "verified" | "cancelled" | "pending") => void;
        reject: (e: Error) => void;
      }
    | undefined;
  const notify = (outcome?: "verified" | "cancelled" | "failed" | "pending") =>
    subscribers.forEach((fn) => fn(outcome));
  const updates = IAP.purchaseUpdatedListener(
    async (purchase) => {
      if (!knownSkus.includes(purchase.productId)) return;
      if (purchase.purchaseState === "pending") {
        pending?.resolve("pending");
        pending = undefined;
        notify("pending");
        return;
      }
      try {
        if (!(await IAP.isTransactionVerifiedIOS(purchase.productId)))
          throw new Error(
            "購入の確認を完了できませんでした。購入状況の確認か復元をお試しください。",
          );
        await IAP.finishTransaction({ purchase, isConsumable: false });
        if (pending?.sku === purchase.productId) {
          pending.resolve("verified");
          pending = undefined;
        }
        notify("verified");
      } catch (e) {
        pending?.reject(
          e instanceof Error ? e : new Error("購入を確認できません。"),
        );
        pending = undefined;
        notify("failed");
      }
    },
    { dedupeTransactionIOS: false },
  );
  const errors = IAP.purchaseErrorListener((error) => {
    if (error.code === IAP.ErrorCode.UserCancelled)
      pending?.resolve("cancelled");
    else if (
      error.code === IAP.ErrorCode.DeferredPayment ||
      error.code === IAP.ErrorCode.Pending
    )
      pending?.resolve("pending");
    else
      pending?.reject(new Error(error.message || "購入状況を確認できません。"));
    pending = undefined;
    notify(
      error.code === IAP.ErrorCode.UserCancelled
        ? "cancelled"
        : error.code === IAP.ErrorCode.DeferredPayment ||
            error.code === IAP.ErrorCode.Pending
          ? "pending"
          : "failed",
    );
  });
  const init = () =>
    (initialized ||= IAP.initConnection()
      .then(() => {})
      .catch((e) => {
        initialized = undefined;
        throw e;
      }));
  const entitlement = async (): Promise<Entitlement> => {
    await init();
    const options: Entitlement[] = [];
    for (const sku of knownSkus) {
      try {
        const purchase =
          (await IAP.currentEntitlementIOS(sku)) ||
          (await IAP.latestTransactionIOS(sku));
        if (!purchase) continue;
        if (purchase.productId !== sku) {
          options.push({ kind: "unknown", verified: false });
          continue;
        }
        const verified = await IAP.isTransactionVerifiedIOS(sku);
        const statuses =
          sku === config.products.legacy || sku === config.products.lifetime
            ? []
            : await IAP.subscriptionStatusIOS(sku);
        const status =
          statuses.find(
            (s) =>
              s.state === "subscribed" ||
              s.state === "active" ||
              s.state === "in-grace-period",
          ) || statuses[0];
        const mode = purchase.offerIOS?.paymentMode
          ?.toLowerCase()
          .replace(/[^a-z]/g, "");
        const offer = purchase.offerIOS?.type?.toLowerCase();
        options.push(
          entitlementFromStore(
            {
              verified,
              productId: sku,
              expiresAt: purchase.expirationDateIOS,
              revokedAt: purchase.revocationDateIOS,
              state: status?.state,
              autoRenew:
                status?.renewalInfo?.willAutoRenew ?? purchase.isAutoRenewing,
              graceExpiresAt: status?.renewalInfo?.gracePeriodExpirationDate,
              billingRetry: status?.renewalInfo?.isInBillingRetry ?? false,
              trial: offer === "introductory" && mode === "freetrial",
              legacy:
                sku === config.products.legacy ||
                sku === config.products.lifetime,
            },
            Date.now(),
          ),
        );
      } catch {
        options.push({ kind: "unknown", verified: false });
      }
    }
    return (
      options.find((e) => e.kind === "legacy") ||
      options
        .filter((e) => hasPro(e, Date.now()))
        .sort(
          (a, b) =>
            ("expiresAt" in b ? b.expiresAt : 0) -
            ("expiresAt" in a ? a.expiresAt : 0),
        )[0] ||
      options.find((e) => e.kind === "unknown") ||
      options[0] || { kind: "free", verified: true }
    );
  };
  return {
    async loadProducts() {
      await init();
      if (!(await access.canPurchase()))
        throw new Error(
          "この端末では購入できません。無料の写真整理は引き続き利用できます。",
        );
      const products = await IAP.fetchProducts({
        skus: knownSkus,
        type: "all",
      });
      const result: StoreProduct[] = [];
      for (const raw of products || []) {
        if (raw.platform !== "ios" || !knownSkus.includes(raw.id)) continue;
        if (
          raw.id === config.products.lifetime &&
          raw.type === "in-app" &&
          raw.typeIOS === "non-consumable" &&
          raw.displayPrice
        ) {
          result.push({
            id: raw.id,
            period: "lifetime",
            displayPrice: raw.displayPrice,
            price: raw.price || 0,
            currency: raw.currency,
            eligibility: "ineligible",
            trialDays: 0,
          });
          continue;
        }
        if (raw.type !== "subs") continue;
        const p = raw as IAP.ProductSubscriptionIOS;
        const period = p.subscriptionPeriodUnitIOS;
        if (
          (period !== "month" && period !== "year" && period !== "week") ||
          Number(p.subscriptionPeriodNumberIOS) !== 1 ||
          !p.displayPrice
        )
          continue;
        const groupId = p.subscriptionGroupIdIOS || undefined;
        let eligibility: StoreProduct["eligibility"] = "unknown";
        if (groupId) {
          try {
            eligibility = (await IAP.isEligibleForIntroOfferIOS(groupId))
              ? "eligible"
              : "ineligible";
          } catch {}
        }
        const intro = p.subscriptionOffers?.find(
          (o) => o.type === "introductory" && o.paymentMode === "free-trial",
        );
        const trialDays =
          intro?.period && ["day", "week"].includes(intro.period.unit)
            ? intro.period.value *
              (intro.period.unit === "week" ? 7 : 1) *
              (intro.periodCount || 1)
            : 0;
        result.push({
          id: p.id,
          period,
          displayPrice: p.displayPrice,
          price: p.price || 0,
          currency: p.currency,
          eligibility,
          trialDays,
          groupId,
        });
      }
      if (!result.length)
        throw new Error(
          "料金を読み込めませんでした。通信状況をご確認ください。",
        );
      const preferred = result.filter(
        (p) => p.period === "week" || p.period === "lifetime",
      );
      return preferred.length
        ? preferred.sort((a, b) =>
            a.period === "week" ? -1 : b.period === "week" ? 1 : 0,
          )
        : result;
    },
    entitlement,
    async purchase(sku) {
      await init();
      if (pending) return "pending";
      if (!(await access.canPurchase()))
        throw new Error("この端末では購入できません。");
      if (!knownSkus.includes(sku))
        throw new Error("この商品は購入できません。");
      return new Promise((resolve, reject) => {
        pending = { sku, resolve, reject };
        void IAP.requestPurchase({
          request: { apple: { sku } },
          type: sku === config.products.lifetime ? "in-app" : "subs",
        }).catch((e) => {
          if (e?.code === IAP.ErrorCode.UserCancelled) resolve("cancelled");
          else reject(e);
          pending = undefined;
        });
      });
    },
    async restore() {
      await init();
      await IAP.syncIOS();
      return entitlement();
    },
    async manage() {
      await init();
      await IAP.showManageSubscriptionsIOS();
      notify();
    },
    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    dispose() {
      updates.remove();
      errors.remove();
      pending?.resolve("pending");
      pending = undefined;
      void IAP.endConnection();
    },
  };
}
