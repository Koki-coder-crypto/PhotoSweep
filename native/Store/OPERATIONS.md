# PhotoSweep commercial operations

## Billing and proceeds
PhotoSweep uses Apple StoreKit 2 directly. No RevenueCat or external purchase server is used. Apple collects production purchases and pays proceeds to the bank account registered in App Store Connect, subject to its agreement, taxes, thresholds and payment schedule. TestFlight and Xcode StoreKit tests do not generate proceeds.

Monthly and lifetime prices shown to customers come from StoreKit. Japan configuration: monthly JPY 1,500, lifetime JPY 6,000; eligible monthly customers receive the configured one-week free trial. Legacy weekly/annual rights remain supported. Free daily allowances remain 30 photos and 5 videos.

## Weekly checks
- App Store Connect → Sales and Trends: compare paid purchases, subscriptions, refunds and estimated proceeds. Do not confuse downloads or trial starts with paid sales.
- Analytics → Monetization / Subscriptions: review trial conversion, renewal, cancellations and recovery where data is available. No custom tracking is required.
- Payments and Financial Reports: reconcile actual payable amounts and payment status separately from estimated sales. Check bank/tax/agreement alerts when payments are delayed.
- TestFlight feedback and crash reports: inspect new crashes and confirm the affected build before reproducing.
- Review photosweep.support@gmail.com. Never request customers' photos, passwords or receipt contents to troubleshoot a purchase.

## Purchase support
1. Ask for app version, visible error and plan type only.
2. Ask the customer to use Settings → Restore purchases with the Apple Account used for purchasing.
3. Pending approval is not a completed purchase. Recheck its status; returning to plans does not cancel the earlier Apple request. Do not tell customers to repeatedly buy.
4. Subscription cancellation is through Apple's subscription management; a cancellation can retain access until expiry. Refund decisions are handled by Apple.
5. Never manually promise a refund or grant access based on an email claiming payment.

## Device release gate (not completed)
- Install the new TestFlight build over the current version. Confirm history and free quota remain.
- Confirm monthly and lifetime StoreKit prices and trial eligibility. Test cancellation, a completed purchase, Pro access after restart, and Restore purchases. TestFlight purchases are free.
- Confirm test-media deletion; compare compressed video orientation, sound and quality; keep originals until verification.
- Record build, device, date, observed result and failures. Xcode tests do not replace this check.
- Submit only the verified build and completed products. Keep manual release; review the product page, pricing and regions with the owner before releasing.

## Distribution privacy
148 territories are configured, excluding EU27. Automatic new territories are disabled. Revisit DSA requirements before adding EU distribution. Do not publish private review-contact information in support pages.
