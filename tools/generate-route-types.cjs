// Expo's Windows file watcher can temporarily replace the generated route union
// with an empty one. Generate from the real app directory before typechecking.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = path.resolve(__dirname, "..");
process.env.EXPO_ROUTER_APP_ROOT = path.join(root, "app");
const cliManifest = require.resolve("@expo/cli/package.json", {
  paths: [path.dirname(require.resolve("expo/package.json"))],
});
const cliRequire = createRequire(cliManifest);
const output = path.join(root, ".expo", "types");
fs.mkdirSync(output, { recursive: true });
cliRequire("@expo/router-server/build/typed-routes").regenerateDeclarations(
  output,
);
process.once("beforeExit", () => {
  const declaration = fs.readFileSync(path.join(output, "router.d.ts"), "utf8");
  if (!declaration.includes("/onboarding"))
    throw Error(
      "Expo route generation did not include the application routes.",
    );
});
