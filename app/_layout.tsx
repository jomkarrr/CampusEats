import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../hooks/useAuth';
import { CartProvider } from '../context/cart';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Hide splash when fonts are loaded or errored
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Auth guard — redirect based on session + role
  useEffect(() => {
    if (loading || (!fontsLoaded && !fontError)) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inStudentGroup = segments[0] === '(student)';
    const inPartnerGroup = segments[0] === '(partner)';

    if (!session) {
      // Not signed in — redirect to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Signed in but no role yet → choose-purpose
    if (!profile?.role) {
      router.replace('/(auth)/choose-purpose');
      return;
    }

    // Role-based routing
    if (profile.role === 'customer' && !inStudentGroup) {
      router.replace('/(student)');
    } else if (profile.role === 'delivery_partner' && !inPartnerGroup) {
      router.replace('/(partner)/index');
    }
  }, [session, profile, loading, fontsLoaded, fontError, segments]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <CartProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(partner)" />
      </Stack>
    </CartProvider>
  );
}
