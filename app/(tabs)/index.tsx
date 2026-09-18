import { Redirect } from "expo-router";
import { useApp } from "../../src/state/AppContext";
import { Home } from "../../src/screens/primary";
import { needsOnboarding } from "../../src/domain/onboarding";
export default function Index() {
  const app = useApp();
  return needsOnboarding(app.state) ? (
    <Redirect href="/onboarding" />
  ) : (
    <Home />
  );
}
