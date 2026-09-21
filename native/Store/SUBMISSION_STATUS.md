# Submission checkpoint — 2026-09-21

Not submitted. Manual release remains selected.

## Confirmed
- Build 20008 (590611e), delivery run 35571864604: successful. Apple build ID 7b2afc25-dffa-4d1d-93f6-6510c9c9c87c is VALID.
- Assigned 20008 to the existing internal TestFlight group; Apple confirms IN_BETA_TESTING. Japanese and English testing notes saved.
- Store version 2.0.0 now selects build 20008, replacing the outdated draft selection.
- Both US tax forms show Active. Bank account and paid agreement show Processing; Apple displays a 24-hour processing notice.
- App Privacy is published: no data collected. Public privacy URL verified in the page.
- English app name saved on Apple: PhotoSweep: Swipe & Compress. Local metadata now matches.

## Remaining
- EU DSA trader declaration: user asked what trader means; explanation and Apple's official guidance provided. No declaration made on their behalf.
- Store screenshot run 35572299372 attempt 2 failed in both locales at StoreCaptureTests.swift:63: selection button absent in duplicate comparison. This is not yet a confirmed production defect. Inspect failure screenshot/hierarchy before changing the app or weakening the test.
- Lightweight capture artifact (62 MB) download stalled, then the single retry failed with remote TCP connection closure. No full xcresult download or duplicate cloud build was started.
- Screenshots and IAP review images still need completion and upload.
- User reports purchase verification probably not performed. Other destructive-media and compression device checks are not individually confirmed; do not mark them passed.
- Paid agreement must finish processing; complete product metadata and final submission checks.

## Tax guidance correction
Previous assistant guidance favoring leaving treaty-benefit fields blank was not a determination of eligibility or optimal tax treatment. Acceptance of a tax form is not evidence that treaty benefits were evaluated. Do not alter the user's submitted declarations without informed instructions.
