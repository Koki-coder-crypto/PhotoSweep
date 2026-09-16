import * as IAP from "expo-iap";
import { createBillingAdapter } from "../src/data/billing";
import { config } from "../src/config";
jest.mock("expo-modules-core", () => {
  const actual = jest.requireActual("expo-modules-core");
  return {
    ...actual,
    requireNativeModule: (name: string) =>
      name === "PhotoSweepAccess"
        ? { canPurchase: async () => true }
        : actual.requireNativeModule(name),
  };
});
jest.mock("expo-iap", () => ({
  initConnection: jest.fn(async () => true),
  endConnection: jest.fn(async () => {}),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  currentEntitlementIOS: jest.fn(async () => null),
  latestTransactionIOS: jest.fn(async () => null),
  subscriptionStatusIOS: jest.fn(async () => []),
  isTransactionVerifiedIOS: jest.fn(async () => true),
  fetchProducts: jest.fn(async () => []),
  isEligibleForIntroOfferIOS: jest.fn(async () => true),
  requestPurchase: jest.fn(async () => undefined),
  finishTransaction: jest.fn(async () => {}),
  syncIOS: jest.fn(async () => {}),
  showManageSubscriptionsIOS: jest.fn(async () => []),
  ErrorCode: {
    UserCancelled: "cancelled",
    DeferredPayment: "deferred",
    Pending: "pending",
  },
}));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(IAP.currentEntitlementIOS).mockResolvedValue(null);
  jest.mocked(IAP.latestTransactionIOS).mockResolvedValue(null);
  jest.mocked(IAP.isTransactionVerifiedIOS).mockResolvedValue(true);
});
test("StoreKit product display price, period and group eligibility are used directly", async () => {
  jest
    .mocked(IAP.fetchProducts)
    .mockResolvedValue([
      {
        id: config.products.annual,
        platform: "ios",
        type: "subs",
        displayPrice: "€19,99",
        price: 19.99,
        currency: "EUR",
        subscriptionPeriodUnitIOS: "year",
        subscriptionPeriodNumberIOS: "1",
        subscriptionGroupIdIOS: "group",
        subscriptionOffers: [
          {
            type: "introductory",
            paymentMode: "free-trial",
            period: { unit: "week", value: 1 },
            periodCount: 1,
          },
        ],
      },
    ] as any);
  const adapter = createBillingAdapter();
  const products = await adapter.loadProducts();
  expect(products[0]).toMatchObject({
    displayPrice: "€19,99",
    period: "year",
    eligibility: "eligible",
    trialDays: 7,
  });
  expect(IAP.isEligibleForIntroOfferIOS).toHaveBeenCalledWith("group");
  adapter.dispose();
});
test("a failing eligibility request stays unknown and a failed price request has no fallback", async () => {
  jest
    .mocked(IAP.fetchProducts)
    .mockResolvedValue([
      {
        id: config.products.annual,
        platform: "ios",
        type: "subs",
        displayPrice: "€19,99",
        price: 19.99,
        currency: "EUR",
        subscriptionPeriodUnitIOS: "year",
        subscriptionPeriodNumberIOS: "1",
        subscriptionGroupIdIOS: "group",
      },
    ] as any);
  jest
    .mocked(IAP.isEligibleForIntroOfferIOS)
    .mockRejectedValueOnce(new Error("offline"));
  const adapter = createBillingAdapter();
  expect((await adapter.loadProducts())[0]?.eligibility).toBe("unknown");
  jest.mocked(IAP.fetchProducts).mockRejectedValueOnce(new Error("offline"));
  await expect(adapter.loadProducts()).rejects.toThrow("offline");
  adapter.dispose();
});
test("one unavailable SKU does not discard a different verified active subscription", async () => {
  jest.mocked(IAP.currentEntitlementIOS).mockImplementation(async (sku) => {
    if (sku !== config.products.monthly) throw new Error("product unavailable");
    return {
      productId: sku,
      expirationDateIOS: Date.now() + 60000,
      isAutoRenewing: true,
    } as any;
  });
  const adapter = createBillingAdapter();
  expect((await adapter.entitlement()).kind).toBe("active");
  adapter.dispose();
});
test("unverified native transactions cannot grant an entitlement or be finished", async () => {
  const adapter = createBillingAdapter();
  jest
    .mocked(IAP.currentEntitlementIOS)
    .mockResolvedValue({
      productId: config.products.monthly,
      expirationDateIOS: Date.now() + 10000,
    } as any);
  jest.mocked(IAP.isTransactionVerifiedIOS).mockResolvedValue(false);
  expect(await adapter.entitlement()).toEqual({
    kind: "unknown",
    verified: false,
  });
  const callback = jest.mocked(IAP.purchaseUpdatedListener).mock.calls[0]![0];
  await callback({
    productId: config.products.monthly,
    purchaseState: "purchased",
  } as any);
  expect(IAP.finishTransaction).not.toHaveBeenCalled();
  adapter.dispose();
});
test("purchase passes the selected ID and resolves only after verified update", async () => {
  const adapter = createBillingAdapter();
  const pending = adapter.purchase(config.products.monthly);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(IAP.requestPurchase).toHaveBeenCalledWith({
    request: { apple: { sku: config.products.monthly } },
    type: "subs",
  });
  const callback = jest.mocked(IAP.purchaseUpdatedListener).mock.calls[0]![0];
  await callback({
    productId: config.products.monthly,
    purchaseState: "purchased",
  } as any);
  await expect(pending).resolves.toBe("verified");
  expect(IAP.finishTransaction).toHaveBeenCalledTimes(1);
  adapter.dispose();
});
test("deferred purchase remains pending and a later rejection is delivered to subscribers", async () => {
  const adapter = createBillingAdapter(),
    changed = jest.fn();
  adapter.subscribe(changed);
  const pending = adapter.purchase(config.products.monthly);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const error = jest.mocked(IAP.purchaseErrorListener).mock.calls[0]![0];
  error({ code: IAP.ErrorCode.DeferredPayment } as any);
  await expect(pending).resolves.toBe("pending");
  error({ code: IAP.ErrorCode.UserCancelled } as any);
  expect(changed).toHaveBeenLastCalledWith("cancelled");
  adapter.dispose();
});
test("restore synchronizes with Apple before reading entitlements and never starts a purchase", async () => {
  const adapter = createBillingAdapter();
  expect(await adapter.restore()).toEqual({ kind: "free", verified: true });
  expect(IAP.syncIOS).toHaveBeenCalledTimes(1);
  expect(IAP.requestPurchase).not.toHaveBeenCalled();
  adapter.dispose();
});
