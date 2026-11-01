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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatINR } from '../../context/cart';
import { DeliveryStatus, OrderStatus } from '../../lib/database.types';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
} from '../../constants/theme';

interface ActiveDeliveryData {
  deliveryId: string;
  deliveryStatus: DeliveryStatus;
  earnings: number;
  orderId: string;
  orderStatus: OrderStatus;
  total: number;
  created_at: string;
  outletName: string;
  outletLocation: string;
  customerName: string;
  customerPhone: string | null;
  customerHostel: string;
  items: {
    id: string;
    qty: number;
    unit_price: number;
    name: string;
  }[];
}

const STEPPER_STAGES: { key: DeliveryStatus; label: string; desc: string }[] = [
  { key: 'assigned', label: 'Accepted', desc: 'Assigned to you • Head to stall' },
  { key: 'picked_up', label: 'Picked Up', desc: 'Food collected • Head to hostel' },
  { key: 'delivered', label: 'Delivered', desc: 'Handed over • Earned ₹20' },
];

export default function PartnerActiveScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [active, setActive] = useState<ActiveDeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deliveredSuccess, setDeliveredSuccess] = useState(false);

  const fetchActiveDelivery = useCallback(async () => {
    if (!user) return;

    try {
      // 1. Find delivery row for this partner with status in 'assigned' or 'picked_up'
      const { data: delivery, error: delErr } = await supabase
        .from('deliveries')
        .select('*')
        .eq('partner_id', user.id)
        .in('status', ['assigned', 'picked_up'])
        .maybeSingle();

      if (delErr) throw delErr;

      if (!delivery) {
        setActive(null);
        return;
      }

      // 2. Fetch order details
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', delivery.order_id)
        .single();

      if (orderErr || !order) throw new Error('Associated order not found');

      // 3. Fetch outlet
      const { data: outlet } = await supabase
        .from('outlets')
        .select('name, location')
        .eq('id', order.outlet_id)
        .single();

      // 4. Fetch customer profile
      const { data: customer } = await supabase
        .from('profiles')
        .select('full_name, phone, hostel_block')
        .eq('id', order.customer_id)
        .single();

      // 5. Fetch order items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, qty, unit_price, menu_item_id')
        .eq('order_id', order.id);

      const menuItemIds = (orderItems ?? []).map((i) => i.menu_item_id);
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, name')
        .in('id', menuItemIds);

      const menuMap = new Map<string, string>();
      menuData?.forEach((m) => menuMap.set(m.id, m.name));

      const items = (orderItems ?? []).map((it) => ({
        id: it.id,
        qty: it.qty,
        unit_price: it.unit_price,
        name: menuMap.get(it.menu_item_id) || 'Item',
      }));

      setActive({
        deliveryId: delivery.id,
        deliveryStatus: delivery.status as DeliveryStatus,
        earnings: Number(delivery.earnings),
        orderId: order.id,
        orderStatus: order.status as OrderStatus,
        total: Number(order.total),
        created_at: order.created_at,
        outletName: outlet?.name ?? 'Campus Stall',
        outletLocation: outlet?.location ?? 'Food Street',
        customerName: customer?.full_name ?? 'Campus Student',
        customerPhone: customer?.phone ?? null,
        customerHostel: customer?.hostel_block ?? 'Hostel Room',
        items,
      });
    } catch (err) {
      console.error('Error fetching active delivery:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchActiveDelivery();

    // Realtime subscription on deliveries and orders for this partner
    if (!user) return;

    const channel = supabase
      .channel(`partner_active_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `partner_id=eq.${user.id}`,
        },
        () => {
          fetchActiveDelivery();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchActiveDelivery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveDelivery();
  };

  const handleCallCustomer = () => {
    if (!active?.customerPhone) {
      Alert.alert('Phone not registered', 'Customer has not added a phone number.');
      return;
    }
    Linking.openURL(`tel:${active.customerPhone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  // Status transitions
  const handleNextStep = async () => {
    if (!active || !user) return;

    setUpdating(true);

    try {
      if (active.deliveryStatus === 'assigned') {
        // Step 1: Assigned -> Picked Up
        // 1. Update orders table to status = 'picked_up'
        const { error: orderErr } = await supabase
          .from('orders')
          .update({ status: 'picked_up' })
          .eq('id', active.orderId);

        if (orderErr) throw new Error(`Orders update failed: ${orderErr.message}`);

        // 2. Update deliveries table to status = 'picked_up'
        const { error: delErr } = await supabase
          .from('deliveries')
          .update({ status: 'picked_up' })
          .eq('id', active.deliveryId);

        if (delErr) {
          // Rollback order back to 'ready'
          await supabase.from('orders').update({ status: 'ready' }).eq('id', active.orderId);
          throw new Error(`Deliveries update failed: ${delErr.message}`);
        }

        // Refresh state
        await fetchActiveDelivery();
      } else if (active.deliveryStatus === 'picked_up') {
        // Step 2: Picked Up -> Delivered
        // 1. Update orders table to status = 'delivered'
        const { error: orderErr } = await supabase
          .from('orders')
          .update({ status: 'delivered' })
          .eq('id', active.orderId);

        if (orderErr) throw new Error(`Orders update failed: ${orderErr.message}`);

        // 2. Update deliveries table to status = 'delivered' and earnings = 20
        const { error: delErr } = await supabase
          .from('deliveries')
          .update({
            status: 'delivered',
            earnings: 20,
          })
          .eq('id', active.deliveryId);

        if (delErr) {
          // Rollback order back to 'picked_up'
          await supabase.from('orders').update({ status: 'picked_up' }).eq('id', active.orderId);
          throw new Error(`Deliveries update failed: ${delErr.message}`);
        }

        // Show success state
        setDeliveredSuccess(true);
        setActive(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      Alert.alert('Update Failed', msg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerText}>Checking active delivery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Delivered Success State View
  if (deliveredSuccess) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-done" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Order Delivered! 🎉</Text>
          <Text style={styles.successSubtitle}>
            Great job! You delivered the order to the customer and earned ₹20.
          </Text>

          <View style={styles.earningBadgeSuccess}>
            <Text style={styles.earningBadgeSuccessText}>+ ₹20.00 Added to Wallet</Text>
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              setDeliveredSuccess(false);
              router.replace('/(partner)/index');
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.doneBtnText}>Back to Available Requests</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty State View
  if (!active) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.topNav}>
          <Text style={styles.navTitle}>Active Delivery</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.emptyCard}>
            <Ionicons name="bicycle-outline" size={64} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Active Delivery</Text>
            <Text style={styles.emptySubtitle}>
              You don&apos;t have any active deliveries right now. Check the Home tab to accept new ready requests!
            </Text>
            <TouchableOpacity
              style={styles.findOrdersBtn}
              onPress={() => router.replace('/(partner)/index')}
              activeOpacity={0.85}
            >
              <Text style={styles.findOrdersBtnText}>Find Available Orders</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentStepIndex =
    active.deliveryStatus === 'assigned' ? 0 : active.deliveryStatus === 'picked_up' ? 1 : 2;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* Top Bar */}
      <View style={styles.topNav}>
        <View>
          <Text style={styles.navTitle}>Active Delivery</Text>
          <Text style={styles.navSubtitle}>Order #{active.orderId.slice(0, 6)}</Text>
        </View>
        <View style={styles.earningTag}>
          <Text style={styles.earningTagText}>Earns ₹20</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* STEPPER CARD */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.stepperHeader}>DELIVERY PROGRESS</Text>
          <View style={styles.stepperList}>
            {STEPPER_STAGES.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <View key={step.key} style={styles.stepperRow}>
                  {/* Indicator Column */}
                  <View style={styles.indicatorCol}>
                    <View
                      style={[
                        styles.stepDot,
                        isPast
                          ? styles.stepDotDone
                          : isCurrent
                          ? styles.stepDotCurrent
                          : styles.stepDotUpcoming,
                      ]}
                    >
                      {isPast ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : isCurrent ? (
                        <View style={styles.activeInnerDot} />
                      ) : (
                        <View style={styles.futureInnerDot} />
                      )}
                    </View>
                    {idx < STEPPER_STAGES.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          isPast ? styles.stepLineDone : styles.stepLineUpcoming,
                        ]}
                      />
                    )}
                  </View>

                  {/* Text Column */}
                  <View style={styles.stepInfo}>
                    <Text
                      style={[
                        styles.stepLabel,
                        isCurrent && styles.stepLabelCurrent,
                        isPast && styles.stepLabelDone,
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* CUSTOMER CONTACT CARD */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.cardSectionLabel}>CUSTOMER & DROP LOCATION</Text>

          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>
                {active.customerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerNameText}>{active.customerName}</Text>
              <Text style={styles.hostelText}>{active.customerHostel}</Text>
            </View>

            {/* Direct Phone Call Button */}
            {active.customerPhone ? (
              <TouchableOpacity
                style={styles.callIconBtn}
                onPress={handleCallCustomer}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* PICKUP STALL CARD */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.cardSectionLabel}>PICKUP LOCATION</Text>
          <Text style={styles.outletNameText}>{active.outletName}</Text>
          <View style={styles.stallLocationRow}>
            <Ionicons name="location-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.stallLocationText}>{active.outletLocation}</Text>
          </View>

          <View style={styles.divider} />

          {/* Items Summary */}
          <Text style={styles.cardSectionLabel}>ITEMS TO DELIVER</Text>
          <View style={styles.itemsWrap}>
            {active.items.map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <Text style={styles.itemQty}>{it.qty}x</Text>
                <Text style={styles.itemName} numberOfLines={1}>
                  {it.name}
                </Text>
                <Text style={styles.itemPrice}>{formatINR(it.qty * it.unit_price)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* PROGRESSION ACTION BUTTON */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            active.deliveryStatus === 'picked_up' ? styles.actionBtnDelivered : styles.actionBtnPickup,
            updating && { opacity: 0.7 },
          ]}
          onPress={handleNextStep}
          disabled={updating}
          activeOpacity={0.88}
        >
          {updating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : active.deliveryStatus === 'assigned' ? (
            <>
              <Ionicons name="bag-check-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Mark as Picked Up</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-done-circle-outline" size={22} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Mark as Delivered • Collect ₹20</Text>
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
  navTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.text,
  },
  navSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  earningTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  earningTagText: {
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
  stepperHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  stepperList: {
    marginTop: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  indicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: Colors.green,
  },
  stepDotCurrent: {
    backgroundColor: Colors.primary,
  },
  stepDotUpcoming: {
    backgroundColor: '#E5E7EB',
  },
  activeInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  futureInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepLineDone: {
    backgroundColor: Colors.green,
  },
  stepLineUpcoming: {
    backgroundColor: '#E5E7EB',
  },
  stepInfo: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 14,
  },
  stepLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  stepLabelCurrent: {
    color: Colors.primary,
    fontSize: 15,
  },
  stepLabelDone: {
    color: Colors.text,
  },
  stepDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  cardSectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerAvatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.green,
  },
  customerDetails: {
    flex: 1,
  },
  customerNameText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  hostelText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  callIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.cta,
  },
  outletNameText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
    marginTop: 2,
  },
  stallLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  stallLocationText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  itemsWrap: {
    gap: 6,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemQty: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.primary,
    width: 24,
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
  actionBtn: {
    height: 54,
    borderRadius: Radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.xs,
    ...Shadows.cta,
  },
  actionBtnPickup: {
    backgroundColor: Colors.primary,
  },
  actionBtnDelivered: {
    backgroundColor: Colors.green,
  },
  actionBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  emptyTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  findOrdersBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: Radii.pill,
    ...Shadows.cta,
  },
  findOrdersBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.cta,
  },
  successTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  earningBadgeSuccess: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    marginBottom: Spacing.xl,
  },
  earningBadgeSuccessText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: '#15803D',
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    paddingHorizontal: 28,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.cta,
  },
  doneBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
