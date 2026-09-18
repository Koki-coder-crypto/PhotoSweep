# Store preparation — not yet submission-ready

Store copy is original and follows PhotoSweep's implemented feature boundaries. No competitor name, endorsement, invented download count, lossless claim or guaranteed storage increase is used. App Store Connect prices remain authoritative. Operator/contact/URLs must be supplied before these drafts are published.

| Claim / screenshot | Native implementation | Required evidence before submission | JA headline | EN headline |
|---|---|---|---|---|
| Organize home | RootHome.swift, PhotoLibrary.swift | Real accessible library; loaded counts | 大きい動画から、すっきり。 | Start with the big files. |
| Similar comparison | Analysis.swift, Collections.swift | Licensed samples; actual PhotoKit groups | 見比べて、残す一枚を。 | Compare. Keep your favorite. |
| Monthly swipe | SwipeView.swift, ReviewEngine.swift | Month progress derived from saved decisions | あの月の写真を、左右に。 | Your month. One swipe at a time. |
| Large videos | PhotoSweepMedia.swift, Collections.swift | Public API measured sizes; unknowns labeled | 大きい動画が、ひと目で。 | Find the videos taking space. |
| Compression comparison | PhotoSweepCompression.swift, CompressionView.swift | Real SDR export + playback; clearly show Pro | 残したい動画を、小さく。 | A smaller copy. Still your moment. |
| Candidate confirmation | CandidatesView | Actual selected media before system confirmation | 消す前に、もう一度。 | One last look before deleting. |
| Deletion result | ResultView, ReviewEngine.reconcile | Completed PhotoKit deletion; true measured values | 整理した成果を、見える形に。 | See what you've cleared. |

Capture each of the seven screens in Japanese and English on the final native simulator build. Primary canvas: 1290×2796 opaque PNG. Do not recreate an app UI with image generation, replace actual numbers with marketing numbers, or reuse a user's reference-video photos. Record the media licence/source and binary revision alongside captures.

The current UI-test attachments are **QA evidence**, not the 14 final store screenshots. They must not be advertised as completed store artwork.

Before store submission, recheck Apple's then-current screenshot acceptance rules, subscription disclosures, privacy labels, age rating, encryption declaration and country-specific operator requirements. The repository's old Expo release documents are not the authority for the 2.0 binary.
