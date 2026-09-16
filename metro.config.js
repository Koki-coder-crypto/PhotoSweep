const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.blockList = [/[/\\]artifacts[/\\]/];
// A release never resolves the catalog, fixtures, or their photo assets.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (!context.dev && moduleName.startsWith(".")) {
    const target = path.resolve(
      path.dirname(context.originModulePath),
      moduleName,
    );
    const developmentRoot = path.join(__dirname, "src", "dev") + path.sep;
    if (target.startsWith(developmentRoot))
      return {
        type: "sourceFile",
        filePath: path.join(__dirname, "src", "release", "unavailable.js"),
      };
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
