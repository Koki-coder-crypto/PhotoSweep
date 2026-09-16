import { Redirect } from "expo-router";
import { useApp } from "../../src/state/AppContext";
import { Home } from "../../src/screens/primary";
export default function Index() {
  const app = useApp();
  return app.state.onboarded ? <Home /> : <Redirect href="/onboarding" />;
}
