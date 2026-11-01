import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { formatINR } from '../../../context/cart';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
} from '../../../constants/theme';

interface RequestDetail {
  id: string;
  total: number;
  created_at: string;
  outlet_name: string;
  outlet_location: string;
  customer_name: string;
  customer_phone: string | null;
  customer_hostel: string;
  items: {
    id: string;
    qty: number;
    unit_price: number;
    name: string;
  }[];
}

export default function RequestDetailScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequestDetail = useCallback(async () => {
    if (!orderId) return;

    try {
      // 1. Fetch order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('fulfillment', 'delivery')
        .single();

      if (orderErr || !order) {
        throw new Error('Delivery request not found or no longer available.');
      }

      // Check if order is still 'ready'
      if (order.status !== 'ready') {
        throw new Error('This order has already been processed or cancelled.');
      }

      // Check if already taken in deliveries table
      const { data: existingDelivery } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingDelivery) {
        throw new Error('This delivery request has already been accepted by another partner.');
      }

      // 2. Fetch outlet
      const { data: outlet } = await supabase
        .from('outlets')
        .select('name, location')
        .eq('id', order.outlet_id)
        .single();

      // 3. Fetch customer profile
      const { data: custProfile } = await supabase
        .from('profiles')
        .select('full_name, phone, hostel_block')
        .eq('id', order.customer_id)
        .single();

      // 4. Fetch order items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, qty, unit_price, menu_item_id')
        .eq('order_id', orderId);

      const menuItemIds = (orderItems ?? []).map((i) => i.menu_item_id);
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, name')
        .in('id', menuItemIds);

      const menuMap = new Map<string, string>();
      menuData?.forEach((m) => menuMap.set(m.id, m.name));

      const formattedItems = (orderItems ?? []).map((item) => ({
        id: item.id,
        qty: item.qty,
        unit_price: item.unit_price,
        name: menuMap.get(item.menu_item_id) || 'Item',
      }));

      setDetail({
        id: order.id,
        total: Number(order.total),
        created_at: order.created_at,
        outlet_name: outlet?.name ?? 'Campus Stall',
        outlet_location: outlet?.location ?? 'Food Street',
        customer_name: custProfile?.full_name ?? 'Campus Student',
        customer_phone: custProfile?.phone ?? null,
        customer_hostel: custProfile?.hostel_block ?? 'Hostel Room',
        items: formattedItems,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading request';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchRequestDetail();
  }, [fetchRequestDetail]);

  const handleCallCustomer = () => {
    if (!detail?.customer_phone) {
      Alert.alert('Phone not provided', 'The customer has not registered a phone number yet.');
      return;
    }
    Linking.openURL(`tel:${detail.customer_phone}`).catch(() => {
      Alert.alert('Unable to open phone app');
    });
  };

  const handleAcceptDelivery = async () => {
    if (!user || !orderId) return;
    setAccepting(true);

    try {
      // Rule: Check if partner ALREADY has an active delivery
      const { data: activeDeliveries } = await supabase
        .from('deliveries')
        .select('id')
        .eq('partner_id', user.id)
        .in('status', ['assigned', 'picked_up']);

      if (activeDeliveries && activeDeliveries.length > 0) {
        Alert.alert(
          'Active Delivery in Progress',
          'You already have an ongoing delivery. Please complete or deliver it before accepting another request.',
          [{ text: 'View Active', onPress: () => router.replace('/(partner)/active') }]
        );
        return;
      }

      // Check if order is still available
      const { data: checkDelivery } = await supabase
        .from('deliveries')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (checkDelivery) {
        Alert.alert(
          'Already Accepted',
          'Another delivery partner just accepted this order.',
          [{ text: 'Back to Requests', onPress: () => router.replace('/(partner)/index') }]
        );
        return;
      }

      // Insert delivery row with status 'assigned' and initial earnings 0
      const { data: newDelivery, error: deliveryErr } = await supabase
        .from('deliveries')
        .insert({
          order_id: orderId,
          partner_id: user.id,
          status: 'assigned',
          earnings: 0,
        })
        .select()
        .single();

      if (deliveryErr) {
        if (deliveryErr.code === '23505' || deliveryErr.message.includes('unique')) {
          Alert.alert(
            'Already Taken',
            'Another delivery partner accepted this order first.',
            [{ text: 'OK', onPress: () => router.replace('/(partner)/index') }]
          );
          return;
        }
        throw deliveryErr;
      }

      // Order status remains 'ready' while assigned, until partner picks it up (per status machine)
      Alert.alert(
        'Delivery Accepted! 🛵',
        'Order is assigned to you. Head to the stall to pick it up.',
        [
          {
            text: 'Go to Active Delivery',
            onPress: () => router.replace('/(partner)/active'),
          },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept delivery';
      Alert.alert('Acceptance Failed', msg);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerText}>Loading delivery details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
          <Text style={styles.errorTitle}>Request Unavailable</Text>
          <Text style={styles.errorSubtitle}>{error ?? 'Could not find order request.'}</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.backBtnText}>← Back to Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Delivery Request #{detail.id.slice(0, 6)}</Text>
        <View style={styles.earningBadge}>
          <Text style={styles.earningBadgeText}>Earns ₹20</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PICKUP Card */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.pickupIcon}>
              <Ionicons name="restaurant" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.cardSectionLabel}>1. PICKUP POINT</Text>
          </View>

          <Text style={styles.placeName}>{detail.outlet_name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.placeLocation}>{detail.outlet_location}</Text>
          </View>
          <View style={styles.tagRow}>
            <View style={styles.readyTag}>
              <Ionicons name="checkmark-circle" size={12} color="#15803D" />
              <Text style={styles.readyTagText}>Food is Ready for Pickup</Text>
            </View>
          </View>
        </View>

        {/* DROP Card */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.dropIcon}>
              <Ionicons name="home" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.cardSectionLabel}>2. DROP POINT</Text>
          </View>

          <Text style={styles.placeName}>{detail.customer_hostel}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.placeLocation}>Student: {detail.customer_name}</Text>
          </View>

          {/* Customer Call Row */}
          {detail.customer_phone && (
            <TouchableOpacity
              style={styles.phoneActionRow}
              onPress={handleCallCustomer}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={16} color={Colors.green} />
              <Text style={styles.phoneActionText}>Call {detail.customer_phone}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ITEMS & BILL Card */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.cardSectionLabel}>ITEMS TO COLLECT</Text>
          <View style={styles.itemsList}>
            {detail.items.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <View style={styles.itemQtyBadge}>
                  <Text style={styles.itemQtyText}>{it.qty}x</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>
                  {it.name}
                </Text>
                <Text style={styles.itemPrice}>{formatINR(it.qty * it.unit_price)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Order Total (Paid by student)</Text>
            <Text style={styles.summaryValue}>{formatINR(detail.total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.payoutLabel}>Your Payout on Delivery</Text>
            <Text style={styles.payoutValue}>₹20.00</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.acceptBtn, accepting && { opacity: 0.7 }]}
          onPress={handleAcceptDelivery}
          disabled={accepting}
          activeOpacity={0.88}
        >
          {accepting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-sharp" size={20} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>Accept Delivery • Earn ₹20</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  earningBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  earningBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#166534',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  pickupIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  placeName: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.text,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  placeLocation: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  readyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  readyTagText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: '#15803D',
  },
  phoneActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  phoneActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.green,
  },
  itemsList: {
    marginTop: Spacing.xs,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQtyBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginRight: 8,
  },
  itemQtyText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  itemName: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.text,
  },
  itemPrice: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.text,
  },
  payoutLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.green,
  },
  payoutValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: Colors.green,
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: Radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.sm,
    ...Shadows.cta,
  },
  acceptBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  centerText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  errorTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  errorSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
  },
  backBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
