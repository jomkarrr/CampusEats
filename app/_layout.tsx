import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
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
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { CartProvider } from '../context/cart';
import { Colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Auth guard — redirect based on session + role
  useEffect(() => {
    // Guard must not redirect until profile fetch has resolved
    if (loading) return;

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

    // Signed in but no role assigned yet → keep/send user to choose-purpose
    if (!profile?.role) {
      if (segments[1] !== 'choose-purpose') {
        router.replace('/(auth)/choose-purpose');
      }
      return;
    }

    // Role-based routing: send to respective group if not already there
    if (profile.role === 'customer' && !inStudentGroup) {
      router.replace('/(student)');
    } else if (profile.role === 'delivery_partner' && !inPartnerGroup) {
      router.replace('/(partner)/index' as any);
    }
  }, [session, profile, loading, segments, router]);

  // Prevent flash of any screen before auth & profile resolution completes
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(partner)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Hide splash when fonts are loaded or errored
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <CartProvider>
        <RootNavigation />
      </CartProvider>
    </AuthProvider>
  );
}
