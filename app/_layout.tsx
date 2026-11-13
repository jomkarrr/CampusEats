import { useEffect, useRef } from 'react';
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
  const role = (profile?.role ?? null) as string | null;
  const group = segments[0] as string | undefined;
  const subRoute = segments[1] as string | undefined;
  const navReady = !!rootNavigationState?.key;

  // Placement latch: the guard places a signed-in user into their role's
  // area ONCE per (user, role) pair — after that it never touches
  // navigation again. In-app navigation (outlet / item / cart / checkout)
  // must not be interrupted by the auth guard; earlier versions re-ran a
  // root-level replace on state churn, which remounted the whole student
  // navigator and bounced the user back to Explore ("Loading campus
  // outlets..." loop). The latch re-arms only when the user signs out or
  // their role actually changes (choose-purpose / reset-role flows).
  const placedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!navReady) return;
    if (!group) return; // navigation not settled yet — never redirect blind

    const inAuthGroup = group === '(auth)';

    if (!userId) {
      placedForRef.current = null;
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    const placementKey = userId + '|' + (role ?? 'none');
    if (placedForRef.current === placementKey) return; // already placed — hands off

    // Signed in but no role yet → keep/send user to choose-purpose.
    // Not latched: placement completes only once a role exists.
    if (!role) {
      if (subRoute !== 'choose-purpose') {
        router.replace('/(auth)/choose-purpose');
      }
      return;
    }

    // Place the user in their role's area only if they are not already there.
    if (role === 'customer') {
      if (group !== '(student)') router.replace('/(student)');
    } else if (role === 'delivery_partner') {
      if (group !== '(partner)') router.replace('/(partner)/index' as any);
    }
    placedForRef.current = placementKey;
  }, [loading, navReady, userId, role, group, subRoute, router]);

  // The Stack is ALWAYS mounted; the loading indicator is an opaque overlay
  // on top. Unmounting the navigator while auth resolves destroys the
  // navigation state and bounces the user back to the start screen.
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
