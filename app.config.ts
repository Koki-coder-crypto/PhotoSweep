import type { ExpoConfig } from "expo/config";
const projectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "f834d7a8-7b18-470e-847e-ec1f24eefda6";
const app: ExpoConfig = {
  name: "PhotoSweep",
  slug: "photosweep",
  version: "1.3.0",
  scheme: "photosweep",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.kokicoder.photosweep",
    buildNumber: "1",
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryDiskSpace", NSPrivacyAccessedAPITypeReasons: ["85F4.1", "E174.1"] },
      ],
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDevelopmentRegion: "ja",
      CFBundleLocalizations: ["ja"],
    },
  },
  web: { bundler: "metro", output: "single", favicon: "./assets/icon.png" },
  plugins: [
    "expo-router",
    ["expo-video", { supportsBackgroundPlayback: false, supportsPictureInPicture: false }],
    "expo-font",
    "expo-asset",
    "expo-sqlite",
    "expo-iap",
    [
      "expo-audio",
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    "expo-notifications",
    ["expo-build-properties", { ios: { deploymentTarget: "16.4" } }],
    [
      "expo-media-library",
      {
        photosPermission:
          "写真と動画の表示・整理・圧縮に使用します。写真や動画を開発者へ送信しません。",
        savePhotosPermission:
          "あなたが確認した圧縮動画を写真ライブラリに保存するために使用します。",
        isAccessMediaLocationEnabled: false,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 160,
        backgroundColor: "#070B19",
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: projectId ? { eas: { projectId } } : {},
};
export default app;
