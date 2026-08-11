# Release checklist

## Code-side complete
- [x] Expo Router structure
- [x] Photo permission handling including limited access
- [x] Metadata-only photo scanning with 6,000-photo safety cap
- [x] Similar candidate / large / older review modes
- [x] Explicit deletion confirmation
- [x] Free deletion allowance and Pro gate
- [x] One-time non-consumable Pro purchase + restore flow
- [x] In-app Privacy Policy and Terms
- [x] Static Privacy and Support pages for GitHub Pages
- [x] EAS build profiles
- [x] GitHub Actions quality, EAS build, and Pages workflows
- [x] App Store metadata and review notes

## Requires account-owner authentication
- [ ] Push source to GitHub (current ChatGPT GitHub integration denies write API with HTTP 403)
- [ ] Enable GitHub Pages on the repository
- [ ] Create/link Expo EAS project and authenticate Expo account
- [ ] Verify bundle identifier ownership: com.kokicoder.photosweep
- [ ] Create App Store Connect app record
- [ ] Complete agreements, tax, and banking if not already complete
- [ ] Create non-consumable IAP: com.kokicoder.photosweep.pro.lifetime
- [ ] Set launch price (hypothesis: ¥2,480)
- [ ] Build with EAS and install via TestFlight on a physical iPhone
- [ ] Test full/limited photo access, iCloud optimized photos, delete flow, purchase and restore
- [ ] Capture final App Store screenshots from the TestFlight build
- [ ] Complete App Privacy questionnaire based on final SDK behavior
- [ ] Submit build + IAP for App Review
