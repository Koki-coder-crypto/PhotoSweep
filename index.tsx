import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAppStore } from '../src/store/AppStore';

export default function Index() {
  const { hydrated, onboarded } = useAppStore();
  if (!hydrated) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;
  }
  return <Redirect href={onboarded ? '/home' : '/onboarding'} />;
}
