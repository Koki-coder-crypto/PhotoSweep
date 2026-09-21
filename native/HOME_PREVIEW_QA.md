# Organize media cards — device verification

The home now shows up to three actual assets per category. Similar/duplicate previews belong to one real analysis group. Empty categories do not borrow unrelated pictures. No reference recording or personal reference image is bundled.

One mostly visible video card may play its first three seconds on a muted loop. PhotoKit network access is disabled for this preview. Low Power Mode, Reduce Motion, backgrounding, another tab, navigation away, and memory warnings stop previews. Explicit playback in the existing collection detail remains separate.

## iPhone 15, update in place

1. In TestFlight install the new build without deleting PhotoSweep. Check saved decisions and candidates remain.
2. On Organize, check category photos match your library. Similar/duplicate pairs must show related pictures; screenshots and recordings must belong to their categories.
3. With a locally available video, scroll its card mostly into view. Confirm a muted beginning plays, loops around three seconds, and does not interrupt other audio. Only one card should play at a time.
4. Open a category, switch tabs, lock the phone, and return. Playback must stop while away and resume only for a visible eligible card. Repeat scrolling and tab switching; check for heat, stalls, or a crash.
5. Enable Low Power Mode and Reduce Motion separately. Cards should remain useful as still previews. For iCloud-only videos, a still/availability state is acceptable; there must be no automatic original download.
6. Check large text and VoiceOver: category name, count, and navigation remain usable.

Simulator PhotoKit screenshot tests and metadata tests do not establish actual iPhone playback, power, memory, or audio-interruption behavior. Record those separately. Existing deletion, compression and Sandbox release checks still apply.
