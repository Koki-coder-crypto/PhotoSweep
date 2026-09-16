---
name: photosweep-delivery-check
description: Check PhotoSweep implementation against the POP V3 screen map, native-photo safety, subscription lifecycle, and evidence-based delivery checklist. Use before reporting a PhotoSweep implementation complete.
---
# PhotoSweep delivery check
This is a project-authored checklist, not an installed or audited third-party plugin.
1. Locate the handoff's START_HERE.md and docs/10_TEST_PLAN.md.
2. Read actual changed application functions and their tests. A copied algorithm inside a test is not coverage of production code.
3. Confirm all S01-S48 states and documented variants are reachable by a valid flow; no 48-screen flat stack is required.
4. Verify live store data, trial eligibility, no fake price fallback, transparent cancellation, legacy entitlements, and safety routes on the free plan.
5. Verify candidate-only swipes, explicit native deletion, cancel/partial failure, iCloud caveats, limited access, crash recovery and quota persistence.
6. Verify reduced motion, non-destructive rewards, sound off by default, labeled 44pt targets, readable full renewal prices and Dynamic Type.
7. Execute available checks. Record commands, status, environment and evidence paths. Native device checks not run remain NOT_RUN.
8. Report remaining blockers and real owner actions. Never label HTML previews or mocks as an iOS release.
