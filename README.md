# PhotoSweep

A privacy-first iPhone photo cleanup app built with Expo + React Native.

## Product
- On-device metadata scan; photos are not uploaded
- Similar-candidate review (not pixel-identical duplicate detection)
- Large-photo and older-photo review
- User-confirmed deletion only
- Free tier: 30 deletions
- Pro: one-time lifetime unlock

## Development
```bash
npm install
npm run typecheck
npx expo-doctor
npx eas build --platform ios --profile development
```

IAP requires a development build/TestFlight; it does not work in Expo Go.

See `docs/RELEASE_CHECKLIST.md` for release steps.
