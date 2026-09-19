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
| bae8c4b | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35410547004 | PASS: 17 unit cases, 3 UI cases and unsigned device Release. PhotoKit permission, keep/undo/rejudge, unchanged second quota charge and large-text relaunch passed. |
| 13a9ec1 | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35411327433 | PASS: native verification after the large-text layout and Reduce Motion follow-up. Physical-device feedback is still outstanding. |
| e4670b7 / build 20002 | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35413030919 | FAIL after successful native tests and signed archive: archive verifier rejected UIDeviceFamily. actool output explicitly targeted both iPhone and iPad. Export/upload did not run. Fix: put TARGETED_DEVICE_FAMILY=1 at the app target level, overriding generator defaults. |
| 14f5ad1 / build 20003 | https://github.com/Koki-coder-crypto/PhotoSweep/actions/runs/35414241135 | FAIL: 17 unit cases passed, photo-permission UI wait timed out. Diagnostic snapshot then contained the exact SpringBoard button "Allow Full Access". Replace custom 15-second predicate polling with XCTest element wait (30 seconds, then app-hosted fallback). Archive/upload did not run. |

PhotoKit follow-up passed after isolating OS photo authorization between UI cases with XCTest's reset API and deferring PhotoKit change observation until access is granted. The earlier failure showed the denied/settings branch was taken; the exact source of the prior privacy decision was not established.

Visual QA of `artifacts/native-bae8c4b/captures` confirmed readable default-size swipe controls and successful saved progress. The maximum text-size capture exposed a split month heading despite the controls being hittable. The follow-up stacks the heading/progress, reduces the card height at accessibility text sizes, and removes next-card scaling/failed-save spring under Reduce Motion. The follow-up native run passed; visual/device confirmation remains separate.

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

A dedicated App Manager delivery key was created with explicit user authorization. Its downloaded private file has not yet been located or installed in GitHub Secrets. Key identifiers, the existing distribution certificate and the existing ad hoc profile are installed in the `apple-distribution` environment. An App Store provisioning profile is still missing. No key/certificate contents are tracked in this repository. Browser interaction resumed successfully on September 19.

The user confirmed the private file was missing and authorized replacement. Key `64XR4Y4F32` is confirmed revoked; replacement `PhotoSweep GitHub Delivery v2` / `UMZ8ZP68ML` was created with the same App Manager role. Its Download button was left available for the user to save the file visibly, avoiding a repeat of the unverified download. The file is not yet present in Downloads. No replacement credential has been installed or authenticated. `install_delivery_key.py` verifies the exact app/bundle before installing Secrets via stdin; an ephemeral-key check passed JWT signature, five-minute lifetime, invalid-key rejection and redirect refusal. This is not evidence of live Apple authentication.

Subsequently the user saved the replacement file. Live Apple authentication succeeded for app 6813565278 and bundle com.kokicoder.photosweep; all three ASC secrets were installed via stdin. App Store profile S9ZHSZA67D was created against the existing matching distribution certificate 553368FCYU, validated for team/bundle/type/expiry/certificate, and installed in IOS_PROFILE_BASE64. A local check confirmed the export options use the actual certificate fingerprint and reject ad hoc profiles. Apple returned no existing uploaded builds before delivery build 20002. The delivery workflow now supports an explicit immutable release tag and runs the full native suite on the distribution revision before archive/upload. Signing/upload is not yet claimed successful.

User confirmed operator, support and review contacts are all undecided and requested Terra for subsequent implementation. Public pages/submission remain blocked on accurate information; no contact details were fabricated.

Monthly and lifetime products are now registered under the production IDs. Saved Japan prices are JPY 1,500/month and JPY 6,000 lifetime; the monthly introductory offer is one week free for eligible subscribers. Japanese/English product names and descriptions, both subscription-group localizations and all current product territories are saved. See `Store/product-setup.json` for IDs and outstanding steps. Product registration is not Sandbox verification, approval or availability for public sale.

## Website

Eight original Japanese/English informational pages are prepared in `Store/website.json`. `python native/Store/build_website.py --preview` produces a local, explicitly marked preview under ignored `artifacts/native-site`. Production generation fails without a formal operator name and support email. No GitHub Pages site has been published.
