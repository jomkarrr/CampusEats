import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
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
  const rootNavigationState = useRootNavigationState();

  const userId = session?.user?.id ?? null;
  const role = profile?.role ?? null;
  const group = segments[0] as string | undefined;
  const subRoute = segments[1] as string | undefined;
  const navReady = !!rootNavigationState?.key;

  // Auth guard — redirect ONLY on a route-group mismatch, and only once the
  // profile AND the navigation state have fully settled. Depends on primitive
  // values (userId / role / group), not object identities, so unrelated
  // auth/profile object churn can never re-fire a redirect mid-navigation.
  useEffect(() => {
    if (loading) return;
    if (!navReady) return;
    if (!group) return; // segments not settled yet — never redirect blind

    const inAuthGroup = group === '(auth)';
    const inStudentGroup = group === '(student)';
    const inPartnerGroup = group === '(partner)';

    if (!userId) {
      // Not signed in — redirect to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Signed in but no role assigned yet → keep/send user to choose-purpose
    if (!role) {
      if (subRoute !== 'choose-purpose') {
        router.replace('/(auth)/choose-purpose');
      }
      return;
    }

    // Role-based routing: send to respective group only if not already there
    if (role === 'customer' && !inStudentGroup) {
      router.replace('/(student)');
    } else if (role === 'delivery_partner' && !inPartnerGroup) {
      router.replace('/(partner)/index' as any);
    }
  }, [loading, navReady, userId, role, group, subRoute, router]);

  // The Stack is ALWAYS mounted; the loading indicator is an opaque overlay
  // on top. Previously the Stack was swapped out for a spinner while auth
  // resolved — unmounting the navigator destroys the navigation state and
  // bounces the user back to the Explore tab on any auth re-resolution.
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(partner)" />
      </Stack>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
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

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
