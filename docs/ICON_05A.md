# PhotoSweep icon 05A

The user selected 05A (coral broom on dusty blue) on 2026-09-18.

Updated the master, 1024px iOS/Web icon and 512px launch-screen asset. Home, onboarding and loading already use the shared BrandMark and now display the selected artwork. Version remains 1.3.0; the new internal build is 4. No app data migration or feature change.

Validation:
- Master 1254×1254 RGB; icon 1024×1024 RGB; splash 512×512 RGB. All opaque, without baked-in corner masks.
- TypeScript check passed.
- iOS Hermes export passed.
- Release bundle check passed: no development catalog, mock products or demo photos.
- Browser onboarding shows the selected icon at its actual in-app size.
- Device launch and home-screen appearance still require iPhone confirmation.

Build: https://expo.dev/accounts/koki_123/projects/photosweep/builds/0eba5eb0-859a-4fda-9ba0-e9c8f14b50a2

Install over the existing app without uninstalling it to retain its local records. Verify the home-screen icon and launch screen, then confirm that existing review history and candidates remain available.

Build and IPA inspection results are recorded in local artifacts/icon05a-* files. Design provenance and the full generation prompt are in assets/brand/README.md.
