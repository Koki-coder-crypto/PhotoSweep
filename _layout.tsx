import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppStoreProvider } from '../src/store/AppStore';

export default function Layout() {
  return <AppStoreProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  </AppStoreProvider>;
}
