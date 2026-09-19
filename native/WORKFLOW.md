# Credit-aware native delivery workflow

Requested by the user on 2026-09-19. Optimize verified progress, not the number of changes or tool calls. Do not reduce data, deletion or purchase safety to save credits.

## What caused avoidable work

- Repeated full browser snapshots and speculative navigation instead of one inspected form and a definitive save result.
- Full native CI on documentation/marketing edits, and starting another run before the previous result was reviewed.
- Downloading an 89 MB xcresult bundle to diagnose one failed UI assertion.
- Repeated manual CI polls and rereading files already summarized.
- Expanding website, metadata and UI polish simultaneously while device delivery had a concrete credential blocker.

## Execution loop

1. Read `work-state.json` and the affected source only. Pick one bounded critical-path outcome.
2. `python tools/native_harness.py plan --base <last-reviewed-commit>` selects local, unit or full checks. Unknown inputs select full.
3. Make one coherent patch, then `python tools/native_harness.py check`. An identical fingerprint reuses only the local source-check result, never cloud/device evidence.
4. Push once when the patch is reviewable. Do not launch cloud CI for documentation-only work. Core/test-only changes use native unit tests; UI/services/build changes retain all native tests. Run all tests again on the actual distribution revision before signing/submission.
5. Use `status` for one compact CI result. It caches unchanged requests for 120 seconds. While CI runs, do independent work that is already necessary; do not repeatedly poll or narrate unchanged state.
6. On failure, run `failure --run ID`. Download only `native-diagnostics` first, then `native-ui-captures` for the relevant screenshot. Download the full `native-xcresult` only when a specific unanswered question requires it. Retry failed artifact downloads at most once.
7. Record the exact revision, run and result. Update `work-state.json` at a handoff or meaningful milestone, not after every click.

## Browser work

- Prefer a supported API/CLI. Once a form is loaded, use scoped fields; inspect a compact confirmation after saving. A disabled button alone is not evidence of success if a validation error is present.
- Stop after one failed attempt and one evidence-based recovery. Do not cycle through guessed names, URLs or repeated snapshots. Record the blocker and switch to independent critical-path work.
- Group missing user information. Never invent operator/legal/contact details, and never ask for credential contents in chat.
- No screenshots of credentials, broad secret searches or credentials in git/logs.

## Current critical path

1. Fix the PhotoKit permission UI test from actual evidence and verify the native revision.
2. Produce one signed, fully ported device build using the existing app identity; obtain iPhone feedback. TestFlight also needs the API private file and App Store profile.
3. Configure real products and validate Sandbox behavior.
4. Complete formal contact/legal information and actual final screenshot captures; submit only when the release checklist passes.

The user allows feature additions and specifically prioritizes a complete SwiftUI migration with smooth, satisfying presentation. Additions are permitted when they advance that outcome; batch them into reviewable milestones instead of scattering work across unrelated screens. Avoid repeated metadata experiments while delivery is blocked. Use a single agent by default. Do not create background work or upgrade models to compensate for an external blocker. Honor any later explicit user budget or priority.

## Evidence boundary

Local check != compiler pass. Unit pass != UI pass. Simulator pass != iPhone/Sandbox pass. Unsigned build != signed distribution. App registration != review submission. Submission != approval. Approval != manual release.

Useful commands:

```
python tools/native_harness.py check
python tools/native_harness.py status
python tools/native_harness.py failure --run RUN_ID
python native/check_release.py
```
