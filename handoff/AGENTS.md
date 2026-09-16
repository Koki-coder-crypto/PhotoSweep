# PhotoSweep handoff instructions
This directory is a design and implementation handoff, not the runnable app root.
Read START_HERE.md and docs/00_PRODUCT_BRIEF.md before writing app code.
The application belongs to Koki-coder-crypto/PhotoSweep. Preserve its existing instructions and uncommitted changes.
Read docs/08_REPO_AUDIT.md, design/screens.json, and docs/09_IMPLEMENTATION_TASKS.md.
Use the Pop V3 visual language, not the obsolete green lifetime-purchase concept.
Do not render complete screenshots as app screens. Build accessible native React Native components.
Do not claim tests, StoreKit validation, builds, native deletion or revenue are verified without fresh evidence.
All deletion requires explicit selection, a visible preview, and the platform confirmation. Never gate safety or selected-photo deletion behind payment.
Trial eligibility, prices, product IDs, entitlement and renewal state come from verified store data, never local timers or isPro booleans.
No push, deployment, paid cloud work, external analytics, credential changes or live purchases without explicit approval.
Keep font files, private photos and secrets out of commits. Use demonstration assets only in development fixtures.
