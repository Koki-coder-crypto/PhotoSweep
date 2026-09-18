# Apple setup, in order

The current native target uses the same app identity as the installed preview: `com.kokicoder.photosweep`, team `7LXRYTBS7L`.

1. Sign in to App Store Connect using the developer account. Complete Apple's 2FA in Apple's UI only.
2. Check My Apps for an existing record with that exact Bundle ID. If none exists, add an **iOS** app named **PhotoSweep**, primary language **Japanese**, Bundle ID above, internal SKU **photosweep-ios**. Do not create a new Bundle ID to work around a registration issue.
3. Configure the app's in-app products. New sales: `com.kokicoder.photosweep.pro.monthly` (auto-renewing monthly subscription, proposed Japan price ¥1,500) and `com.kokicoder.photosweep.pro.lifetime` (non-consumable, proposed Japan price ¥6,000). Configure a 7-day free trial only on the monthly product for eligible subscribers. Retain old weekly/annual products for existing subscriptions and restore compatibility; don't silently migrate existing customers.
4. Secure signing for GitHub's `apple-distribution` environment: App Store Connect API key/issuer/key ID, Apple Distribution certificate/password, and an **App Store** provisioning profile matching the bundle/team. Secret values belong in protected GitHub Secrets, never repository files, chat, public issue text or logs. Native TestFlight workflow validates the profile identity before archiving.
5. Run native verification on the exact commit, then manually run **Native TestFlight delivery** on `codex/swiftui-2` with a unique build number (20002 or higher). This uploads to TestFlight only and does not submit to review or release the app.
6. On iPhone 15, update over the installed version. Do not uninstall first. Verify candidates, quotas, month positions and onboarding completion survived. Run the native device checklist and Sandbox purchase tests.
7. Supply the formal operator name, working support email and public support/privacy/terms URLs. Complete agreements/tax/bank details and legal regional declarations yourself using accurate information.
8. Only after all release evidence and 14 real screenshots are ready, submit with release mode **manual**. After approval, review listing/prices/regions with the user before publishing.

2026-09-19: App registered as **PhotoSweep：写真整理・動画圧縮**, app ID **6813565278**, SKU **photosweep-ios**, with the existing bundle. Version **2.0.0** and **manual release** saved; Japanese and English promotional text, descriptions and keywords saved as drafts. No submission or publication. Product availability, agreements, API access and signing are not yet confirmed. A successful unsigned build is not a TestFlight upload or a signature verification.
