import React from 'react';
import { Stack } from 'expo-router';

// Student area = Stack. The 4 main tabs live in the nested (tabs) group;
// every flow screen (outlet, item, cart, checkout, ...) is a REAL stack
// screen, so router.push() performs a true stack push. Previously all of
// these were href:null screens inside the Tabs navigator, and pushes to
// them silently bounced back to the previous tab in production builds.
export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="outlet/[id]" />
      <Stack.Screen name="item/[id]" />
      <Stack.Screen name="cart" />
      <Stack.Screen name="checkout" />
      <Stack.Screen name="order-confirmed" />
      <Stack.Screen name="orders/[id]" />
      <Stack.Screen name="outlet-orders" />
    </Stack>
  );
}
