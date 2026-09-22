# Review response — 2.0.0 (20010)

Draft only. Do not send or resubmit until a physical-device recording has been received, checked against the submitted build, and attached in App Store Connect. Record the actual model, OS version, filename and recording navigation timestamps at that point. The reviewer specifically requires the latest OS. Do not claim the video exists before receipt.

The following six answers are ready to combine with item 1 (the verified recording reference) in both the review reply and App Review Notes. Keep the notes within Apple's length limit. Preserve the saved reviewer contact and manual release setting.

## 2. Purpose and target audience

PhotoSweep is a consumer iPhone app for people who want to review and organize their own photo and video library. It helps users compare duplicate/similar photos, sort by month with swipe gestures, review large videos, and create smaller copies of supported videos. Users choose what to retain and confirm deletions. It is not a device-wide cleaner and does not promise a particular increase in free storage.

## 3. Setup and feature access

No app account, registration, or sign-in is required, so no demo credentials are needed. Allow full or limited Photos access to disposable sample photos/videos. For comparison, include duplicate copies of a photo; for compression, use a locally available standard SDR video. There is no public posting or messaging feature.

Organize opens photo/video categories and duplicate/similar comparisons. Swipe opens month selection and sorting: right keeps an item, left stages a deletion candidate. To delete lets users review candidates before iOS deletion confirmation. Deleted media follows Apple's Photos/Recently Deleted behavior. No personal media needs to be supplied by the developer.

## 4. External services, tools and platforms

Core features use Apple's on-device frameworks: PhotoKit for authorized media access, Core Graphics and CryptoKit for local image fingerprints and file hashes, AVFoundation for video conversion/playback, and StoreKit 2/App Store for purchases and verified entitlements. SQLite stores sorting records on the device. Apple iCloud Photos may download originals when the user requests them. GitHub Pages hosts the public support, privacy and terms pages. There is no developer-operated media server, third-party authentication, advertising/behavioral analytics SDK, external AI service, or third-party payment processor.

## 5. Regional differences

Core features are the same across available regions. The interface supports Japanese and English, with English fallback for other languages. StoreKit supplies regional currency/pricing and eligible offers. The app currently excludes EU storefronts; this is an availability choice, not a different feature set. Photos access and iCloud availability depend on the user's device settings.

## 6. Regulated services and third-party material

PhotoSweep is a personal photo/video utility and does not provide services in a highly regulated industry. It does not distribute protected third-party content. It operates on the user's authorized library. Store screenshots use public-domain sample media, with source/licence records retained. The app branding is PhotoSweep's own; competitor branding and claims are not used.

## 7. In-App Purchase

PhotoSweep Pro Monthly is a one-month auto-renewable subscription; PhotoSweep Pro Lifetime is a non-consumable one-time purchase. Both unlock unlimited sorting, date/order/batch options, and compression of supported SDR videos into up-to-1080p/720p copies. The Japanese storefront configuration is JPY 1,500/month or JPY 6,000 lifetime, with a one-week monthly trial for eligible users; the actual offer and price shown are supplied by StoreKit.

For non-Pro users, scroll to See PhotoSweep Pro at the bottom of Organize, or open Settings > Plan > See PhotoSweep Pro. The paywall displays plans, price/period, renewal terms, Restore purchases, and Terms/Privacy links. Existing Pro users can view their entitlement and restore purchases through Settings > Plan. Free users can newly sort 30 photos and 5 videos daily; reviewing candidates, deleting, undoing and rejudging do not use an additional allowance. Monthly, lifetime and the subscription group remain included with this app submission.
