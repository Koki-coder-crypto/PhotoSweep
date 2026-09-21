# Current checkpoint — 2026-09-22 JST

Not yet submitted. Build 20010 is VALID, in the existing TestFlight group and selected on the App Store version draft. Manual release remains enabled.

- User explicitly confirmed purchase, restart, restore, record preservation, test deletion, and compressed video quality/audio/orientation on 20010.
- Both paid products are READY_TO_SUBMIT. Their real paywall review images are uploaded and COMPLETE.
- Fourteen marketing screenshots are still incomplete. Capture 35614996513 showed a missing app-side Pro entitlement despite a UI-runner test transaction, and a Japanese analysis button label change. Capture-only correction 753d442 is running in 35617069084; it does not change the distributed application.
- Automatic 100+ sorting/undo actions, 30 home/swipe round trips and AccessibilityXXXL controls passed on 20010. Physical haptics/VoiceOver and remaining permission checks are not claimed as passed.
- No additional features or duplicate signed build are being introduced. Finish actual screenshot evidence and remaining verification before review submission.

Older checkpoints below are retained as history, not current status.

# Submission checkpoint — 2026-09-21

Not submitted. Manual release remains selected.

## Confirmed
- Build 20008 (590611e), delivery run 35571864604: successful. Apple build ID 7b2afc25-dffa-4d1d-93f6-6510c9c9c87c is VALID.
- Assigned 20008 to the existing internal TestFlight group; Apple confirms IN_BETA_TESTING. Japanese and English testing notes saved.
- Store version 2.0.0 now selects build 20008, replacing the outdated draft selection.
- Both US tax forms, bank account and paid agreement now show Active.
- App Privacy is published: no data collected. Public privacy URL verified in the page.
- English app name saved on Apple: PhotoSweep: Swipe & Compress. Local metadata now matches.

## Remaining
- User authorized excluding the EU to avoid public home address/phone disclosure. Saved the combined DSA option on the basis of no planned EU distribution; no public contact details entered. DSA shows Active. App availability read back through API: 148 of 175 territories enabled, all 27 EU territories excluded, Japan enabled, automatic new-territory availability disabled. Revisit DSA before any future EU expansion.
- Store screenshot run 35572299372 attempt 2 failed in both locales at StoreCaptureTests.swift:63: selection button absent in duplicate comparison. This is not yet a confirmed production defect. Inspect failure screenshot/hierarchy before changing the app or weakening the test.
- Lightweight capture artifact (62 MB) download stalled, then the single retry failed with remote TCP connection closure. No full xcresult download or duplicate cloud build was started.
- Screenshots and IAP review images still need completion and upload.
- User reports purchase verification probably not performed. Other destructive-media and compression device checks are not individually confirmed; do not mark them passed.
- Paid agreement is Active; product review images and final submission checks remain.

## Tax guidance correction
Previous assistant guidance favoring leaving treaty-benefit fields blank was not a determination of eligibility or optimal tax treatment. Acceptance of a tax form is not evidence that treaty benefits were evaluated. Do not alter the user's submitted declarations without informed instructions.

## Commercial hardening — 2026-09-21
- b99596e: independent verified-entitlement policy, deterministic legacy/lifetime/grace selection, coalesced refresh, pending recheck/retry, visible payment restrictions. Six policy/migration tests added.
- Build 20009 delivery run 35606569930 started; no pass claimed until it completes.
- StoreKit integration and capture diagnostic run 35607158206 started. Actual failed capture hierarchy shows an empty duplicate collection, not a mismatched button label. Compact evidence recovered via run 35606822086 without rebuilding the old app.
- App price saved and read back: JPN 0, equalized free prices. Mac and Vision availability unchecked and saved. EU exclusion unchanged.
- Monthly price read back: JPN 1500. One-week introductory free trial configured. Products still MISSING_METADATA pending review screenshots.
- Operations and device purchase/restore instructions added. Physical-device results remain outstanding; application remains PREPARE_FOR_SUBMISSION / MANUAL.

## Follow-up verification
- 20009: native delivery run 35606569930 SUCCESS, 29 unit + 3 UI tests passed. Apple build b867f9ad-1399-4421-9c72-02e2eae684ed is VALID / IN_BETA_TESTING, assigned to the existing internal group. Bilingual test notes saved. Store draft still selects 20008 pending final candidate.
- Run 35607158206: lifetime purchase/restore/refund, pending approval/relaunch and declined-pending recovery all PASS. Separate photo diagnostic FAIL: 10 assets with single resources, 8 readable digests (batch bound), but zero fingerprints; PhotoKit error 3303 with fast thumbnail requests.
- c5153bf requests bounded high-quality local thumbnails instead. No iCloud bulk download. Source checks pass; capture run 35609289939 and full delivery 20010 run 35609343455 pending.
- Capture attempt 35609086694 was canceled early to correct test navigation / retained compression handling before continuing; no production source difference from its replacement.
- Device purchase/restore instructions sent. All physical-device gates remain unconfirmed.


## Commercial hardening / 20010 verification
- Direct StoreKit 2 retained; no RevenueCat, purchase server or analytics SDK added.
- 20010, app revision 8e25d20: 29 unit and 3 UI tests passed; signed upload succeeded in run 35609343455. Apple processing is pending at this checkpoint.
- StoreKit integration: lifetime purchase/restore/refund, pending approval/relaunch, and declined-pending recheck/user retry passed in run 35607158206. Simulator tests do not establish actual device purchase success or revenue.
- Bounded PhotoKit fingerprint requests fixed; dedicated imported-photo analysis test passed in 35609289939.
- Screenshot capture failed on the unrendered bottom home Pro action. Hierarchy evidence confirmed LazyVStack virtualization; test-only scrolling fix is running in 35611307866. Fourteen final screenshots and product review images are not complete yet.
- Free app download price saved and read back; Mac and Vision distribution disabled. Existing 148 non-EU territories and manual release retained.
- Japanese operating guide: OPERATIONS_JA.md. Physical purchase/restore and final media checks remain unconfirmed. Do not submit until the release gate passes.
