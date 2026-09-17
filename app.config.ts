import type { ExpoConfig } from "expo/config";
const projectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "f834d7a8-7b18-470e-847e-ec1f24eefda6";
const app: ExpoConfig = {
  name: "PhotoSweep",
  slug: "photosweep",
  version: "1.1.0",
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
          "写真を表示し、あなたが選んだ写真を整理するために使用します。写真を開発者へ送信しません。",
        savePhotosPermission:
          "あなたが選択し、確認した写真を削除するために使用します。",
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
