module.exports = {
  preset: "jest-expo",
  modulePathIgnorePatterns: ['<rootDir>/artifacts/', '<rootDir>/handoff/'],
  resolver: "react-native-worklets/jest/resolver",
  testMatch: ["**/tests/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.cjs"],
};
