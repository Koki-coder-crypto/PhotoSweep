import { Asset } from "expo-asset";
import type {
  BillingAdapter,
  Entitlement,
  Permission,
  Photo,
  PhotoRepository,
  StoreProduct,
} from "../domain/types";
import { config } from "../config";
const assets = [
  require("../../handoff/design/assets/dog.jpg"),
  require("../../handoff/design/assets/sea.jpg"),
];
export function demoLibrary(count = 146): Photo[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - Math.floor(i / 40));
    date.setDate(Math.max(1, 28 - (i % 28)));
    return {
      id: `demo-${i}`,
      uri: Asset.fromModule(assets[i % 2]).uri,
      width: 1000,
      height: 1400,
      createdAt: date.getTime(),
      screenshot: i % 4 === 0,
    };
  });
}
export function demoPhotos(
  options: {
    permission?: Permission;
    empty?: boolean;
    fail?: boolean;
    deletion?: "confirmed" | "cancelled" | "unknown";
  } = {},
): PhotoRepository {
  let permission: Permission = options.permission || "full";
  let items = options.empty ? [] : demoLibrary();
  return {
    async permission(request) {
      if (request && permission === "unknown") permission = "full";
      return permission;
    },
    selectMore: async () => {},
    async page(scope, after, limit = 100) {
      if (options.fail) throw new Error("写真を読み込めませんでした。");
      const filtered = items
        .filter(
          (p) =>
            (!scope.screenshotsOnly || p.screenshot) &&
            (!scope.month ||
              `${new Date(p.createdAt).getFullYear()}-${String(new Date(p.createdAt).getMonth() + 1).padStart(2, "0")}` ===
                scope.month) &&
            (!scope.start || p.createdAt >= scope.start) &&
            (!scope.end || p.createdAt < scope.end),
        )
        .sort((a, b) =>
          scope.order === "oldest"
            ? a.createdAt - b.createdAt
            : b.createdAt - a.createdAt,
        );
      const offset = Number(after || 0);
      return {
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
        next:
          offset + limit < filtered.length ? String(offset + limit) : undefined,
      };
    },
    async resolve(id) {
      const p = items.find((p) => p.id === id);
      if (!p || options.fail) throw new Error("写真を読み込めませんでした。");
      return p;
    },
    async inspect(ids) {
      return {
        present: ids.filter((id) => items.some((p) => p.id === id)),
        missing: ids.filter((id) => !items.some((p) => p.id === id)),
        inaccessible: [],
      };
    },
    async deleteRequested(ids) {
      const result = options.deletion || "confirmed";
      if (result === "confirmed")
        items = items.filter((p) => !ids.includes(p.id));
      return result;
    },
    subscribe: () => () => {},
  };
}
export function demoBilling(
  options: {
    entitlement?: Entitlement;
    eligibility?: StoreProduct["eligibility"];
    fail?: boolean;
    unavailable?: boolean;
    purchase?: "cancelled" | "pending";
  } = {},
): BillingAdapter {
  let entitlement: Entitlement = options.entitlement || {
    kind: "free",
    verified: true,
  };
  const callbacks = new Set<() => void>();
  return {
    async loadProducts() {
      if (options.unavailable)
        throw new Error(
          "この端末では購入できません。無料の写真整理は引き続き利用できます。",
        );
      if (options.fail) throw new Error("料金を読み込めませんでした。");
      return [
        {
          id: config.products.annual,
          period: "year",
          displayPrice: "￥2,400",
          price: 2400,
          currency: "JPY",
          eligibility: options.eligibility || "eligible",
          trialDays: 7,
        },
        {
          id: config.products.monthly,
          period: "month",
          displayPrice: "￥480",
          price: 480,
          currency: "JPY",
          eligibility: options.eligibility || "eligible",
          trialDays: 7,
        },
      ];
    },
    entitlement: async () => entitlement,
    async purchase(productId) {
      if (options.purchase) return options.purchase;
      entitlement = {
        kind: options.eligibility === "ineligible" ? "active" : "trial",
        verified: true,
        productId,
        expiresAt: Date.now() + 7 * 86400000,
        autoRenew: true,
      };
      callbacks.forEach((fn) => fn());
      return "verified";
    },
    restore: async () => entitlement,
    manage: async () => {},
    subscribe(fn) {
      callbacks.add(fn);
      return () => {
        callbacks.delete(fn);
      };
    },
    dispose: () => {},
  };
}
