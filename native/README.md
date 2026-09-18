# PhotoSweep 2.0 native app

This target is a full screen and feature migration of 1.3. It is not a minimal replacement app to distribute before the port is complete. The React Native source stays in the repository solely for comparison and migration fixtures; no Node packages, Expo bridge, JS bundle or React Native runtime is linked by `native/project.yml`.

## Build

- Bundle: `com.kokicoder.photosweep`; team: `7LXRYTBS7L`; version: `2.0.0`; iPhone portrait; iOS 16.4+.
- On macOS with Xcode 26.3: `python3 native/generate_localizations.py`, `xcodegen generate --spec native/project.yml`, then open `native/PhotoSweep.xcodeproj`.
- `Native iOS verification` runs XCTest, UI tests and unsigned Release compilation on the public repository's standard `macos-15` runner. It never requests a paid runner. Artifacts expire in three days.
- Build failures or unexecuted device cases are not passes. Old Expo test counts are not native validation evidence.

## Screen mapping

| Existing route(s) | Native view |
|---|---|
| tabs/index, permission | HomeView, PermissionPanel |
| tabs/swipe, review, guide | SwipeView, inline swipe hint |
| months, filter | MonthListView, FilterView |
| collection, screenshots | CollectionView |
| tabs/candidates | CandidatesView |
| videos, compress | CollectionView, CompressionView |
| summary, result, quota | SummaryView, ResultView, QuotaLabel + explicit Pro sheet |
| onboarding | OnboardingView |
| paywall, plan | PaywallView, PlanView |
| settings, feedback, notifications | SettingsView |
| history | HistoryView |
| zoom | ZoomView / AVKit player |
| help, restore-photo, privacy, terms | HelpView, HelpDetailView |
| catalog | DEBUG-only CatalogView |

## Data safety

`SQLitePersistence` reads `Documents/SQLite/photosweep-v1.db` read-only and uses SQLite's backup API, including committed WAL pages. A native database stores a complete snapshot and migration marker in one transaction. The original database remains untouched. Corrupt legacy records block startup. Photo IDs and milliseconds remain unchanged. Free quota and timezone high-water marks are retained. Pending deletion records are never automatically sent to PhotoKit again.

Compression retains the original `ApplicationSupport/PhotoSweepCompression/job.json` location. Saving/unknown jobs cannot create another copy. StoreKit rights are independently verified. App data and purchase secrets are not sent to the public repository.

## Before distribution

App Store Connect registration, monthly/lifetime product configuration and secure signing credentials are not yet confirmed. The user has not supplied official operator/contact information. TestFlight, Sandbox purchases, real-device migration and haptic/quality evaluation must remain unverified until actually performed. Legal/contact placeholders prevent store submission; they are not publishable final disclosures.

The screenshot attachments produced by UI tests are QA evidence only. App Store promotional images must use verified final screens with licensed library media and actual result values; these QA captures must not be submitted as the seven-image storefront set.
