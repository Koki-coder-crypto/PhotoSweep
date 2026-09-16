import { Redirect } from "expo-router";
export default function CatalogRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  const { Catalog } =
    require("../src/dev/Catalog") as typeof import("../src/dev/Catalog");
  return <Catalog />;
}
