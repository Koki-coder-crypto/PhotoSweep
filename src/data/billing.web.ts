import type { BillingAdapter } from "../domain/types";
export function createBillingAdapter(): BillingAdapter {
  if (__DEV__) {
    const { demoBilling } =
      require("../dev/adapters") as typeof import("../dev/adapters");
    return demoBilling();
  }
  return {
    loadProducts: async () => [],
    entitlement: async () => ({ kind: "unknown", verified: false }),
    purchase: async () => {
      throw new Error("iPhoneでご利用ください。");
    },
    restore: async () => ({ kind: "unknown", verified: false }),
    manage: async () => {},
    subscribe: () => () => {},
    dispose: () => {},
  };
}
