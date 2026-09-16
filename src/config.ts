export const config = {
  freeDaily: 50,
  freeBatch: 20,
  proBatches: [20, 50, 100] as const,
  products: {
    monthly:
      process.env.EXPO_PUBLIC_MONTHLY_PRODUCT_ID ||
      "com.kokicoder.photosweep.pro.monthly",
    annual:
      process.env.EXPO_PUBLIC_ANNUAL_PRODUCT_ID ||
      "com.kokicoder.photosweep.pro.annual",
    legacy: "com.kokicoder.photosweep.pro.lifetime",
  },
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "",
  supportUrl: process.env.EXPO_PUBLIC_SUPPORT_URL || "",
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL || "",
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL || "",
  operator: process.env.EXPO_PUBLIC_OPERATOR_NAME || "",
};
