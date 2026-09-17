require("react-native-gesture-handler/jestSetup");
jest.mock("react-native-reanimated", () => ({
  ...require("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);
jest.mock("expo-image", () => ({ Image: require("react-native").Image }));
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: require("react-native").View,
}));
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  },
  useFocusEffect: (fn) => require("react").useEffect(fn, [fn]),
  useLocalSearchParams: () => ({ id: "demo-8" }),
}));
jest.mock("../src/data/notifications", () => ({
  notificationPermission: async () => false,
  syncNotifications: async () => {},
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
