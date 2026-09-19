# PhotoSweep 2.0 validation ledger

This file records evidence, not desired outcomes. No TestFlight upload, iPhone test, Sandbox purchase, App Store submission or release has completed yet.

## Completed automated runs

| Commit | Evidence | Result |
|---|---|---|
| 28afcff | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35363740926 | 11 XCTest cases; unsigned device Release build passed |
| f1f0602 | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35364526348 | 13 unit cases, 2 UI cases, unsigned Release passed |
| a97ff27 | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35365310158 | 17 unit cases, 2 UI cases, unsigned Release passed |
| 1ec274f | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35366573043 | Workflow passed after media recovery/accessibility changes |
| c7c55ac | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35367489452 | FAIL: 17 unit + 2 earlier UI cases passed; new PhotoKit case could not locate OS permission button; Release skipped |
| e066415 | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35409980695 | FAIL: 17 unit + 2 earlier UI cases passed. Failure capture shows Settings, not a permission sheet; changing button-label lookup alone did not fix the case. |

Follow-up: isolate OS photo authorization between UI cases with XCTest's reset API and defer PhotoKit change observation until access is granted. The failure showed the denied/settings branch was taken; the exact source of the prior privacy decision is not established. This patch must pass native CI before being treated as resolved.

The 17 unit cases include 21 old-production-engine fixture comparisons within one parity case. They also cover WAL import, migration transaction rollback/retry, corrupt legacy data, quota boundaries, undo/rejudging, timezone/clock rollback, 1,000/10,000 items, deletion reconciliation and interrupted/unknown compression journals. They do not establish real media encoding quality or live StoreKit correctness.

The first two UI cases cover Japanese introduction and English introduction, tabs and relaunch. The additional PhotoKit test uses eight original, procedurally drawn landscape images from `make_qa_media.swift`. These images are injected into the simulator library, not shipped inside the product. Counts and decisions come from the production PhotoKit and persistence code. These captures are QA artifacts, not final storefront screenshots.

## Manual and external work still required

- Native signing certificate, App Store provisioning profile and secure delivery key installation.
- Actual upgrade over the installed Expo app on iPhone 15; do not uninstall first.
- 100 continuous gestures, haptic strength, image waits, VoiceOver and large text on device.
- Limited access, permission revocation, iCloud-only files and large real libraries.
- Deletion using disposable test media, OS cancellation and uncertain outcome recovery.
- SDR conversion, audio, portrait/landscape orientation, low space, background cancellation and saved-copy confirmation.
- Real monthly/lifetime products, eligible/ineligible trials, Sandbox purchase/cancel/pending/restore and legacy rights.
- Final same-binary Japanese/English screenshots (7 each), including actual compression and deletion results.
- Full development state catalogue, remaining product polish and release-binary audit.
- Formal operator/support/review-contact information, public legal/support pages and regional declarations.

## Apple registration status (2026-09-19 JST)

App ID 6813565278, existing Bundle ID com.kokicoder.photosweep, SKU photosweep-ios. Version 2.0.0 and manual release saved. Japanese/English version descriptions, promotional copy and keywords saved as drafts. Japanese subtitle and Utilities / Photo & Video category selection saved. The proposed English localized names received a name-conflict error and have not been confirmed saved; the current local English name remains a proposal.

A dedicated App Manager delivery key was created with explicit user authorization. Its downloaded private file has not yet been located or installed in GitHub Secrets. Key identifiers, the existing distribution certificate and the existing ad hoc profile are installed in the `apple-distribution` environment. An App Store provisioning profile is still missing. No key/certificate contents are tracked in this repository. Browser interaction later became blocked while a Windows file chooser was open; ask the user to close the chooser before continuing.

## Website

Eight original Japanese/English informational pages are prepared in `Store/website.json`. `python native/Store/build_website.py --preview` produces a local, explicitly marked preview under ignored `artifacts/native-site`. Production generation fails without a formal operator name and support email. No GitHub Pages site has been published.
