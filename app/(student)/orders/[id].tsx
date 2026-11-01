import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { formatINR } from '../../../context/cart';
import { OrderStatus, FulfillmentType } from '../../../lib/database.types';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
} from '../../../constants/theme';

interface OrderDetail {
  id: string;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  total: number;
  created_at: string;
  outlet_id: string;
  outlet: {
    name: string;
    location: string | null;
  } | null;
}

interface OrderItemWithMenu {
  id: string;
  qty: number;
  unit_price: number;
  menu_item_name: string;
}

interface DeliveryPartnerInfo {
  name: string;
  phone: string | null;
  status: string;
}

// Order timeline steps definition
interface TimelineStep {
  key: OrderStatus;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PICKUP_STEPS: TimelineStep[] = [
  { key: 'placed', label: 'Order Placed', sublabel: 'Order confirmed by customer', icon: 'receipt-outline' },
  { key: 'accepted', label: 'Order Accepted', sublabel: 'Stall acknowledged the order', icon: 'checkmark-circle-outline' },
  { key: 'preparing', label: 'Preparing Food', sublabel: 'Being freshly cooked at stall', icon: 'restaurant-outline' },
  { key: 'ready', label: 'Ready for Pickup', sublabel: 'Pick up at stall counter', icon: 'bag-check-outline' },
  { key: 'delivered', label: 'Order Collected', sublabel: 'Order completed', icon: 'home-outline' },
];

const DELIVERY_STEPS: TimelineStep[] = [
  { key: 'placed', label: 'Order Placed', sublabel: 'Order confirmed by customer', icon: 'receipt-outline' },
  { key: 'accepted', label: 'Order Accepted', sublabel: 'Stall acknowledged the order', icon: 'checkmark-circle-outline' },
  { key: 'preparing', label: 'Preparing Food', sublabel: 'Being freshly cooked at stall', icon: 'restaurant-outline' },
  { key: 'ready', label: 'Ready for Pickup', sublabel: 'Ready for delivery partner', icon: 'bag-check-outline' },
  { key: 'picked_up', label: 'Out for Delivery', sublabel: 'Partner on the way to your hostel', icon: 'bicycle-outline' },
  { key: 'delivered', label: 'Delivered', sublabel: 'Handed over at campus location', icon: 'home-outline' },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  placed: 0,
  accepted: 1,
  preparing: 2,
  ready: 3,
  picked_up: 4,
  delivered: 5,
  cancelled: -1,
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItemWithMenu[]>([]);
  const [partner, setPartner] = useState<DeliveryPartnerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetail = useCallback(async () => {
    if (!id) return;

    try {
      // 1. Fetch order details
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderErr) throw orderErr;
      if (!orderData) throw new Error('Order not found');

      // Fetch outlet
      const { data: outletData } = await supabase
        .from('outlets')
        .select('name, location')
        .eq('id', orderData.outlet_id)
        .single();

      setOrder({
        ...orderData,
        outlet: outletData ?? null,
      });

      // 2. Fetch order items
      const { data: orderItemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('id, qty, unit_price, menu_item_id')
        .eq('order_id', id);

      if (itemsErr) throw itemsErr;

      // Fetch menu item names
      const menuItemIds = orderItemsData?.map((i) => i.menu_item_id) ?? [];
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, name')
        .in('id', menuItemIds);

      const menuMap = new Map<string, string>();
      menuData?.forEach((m) => menuMap.set(m.id, m.name));

      const formattedItems: OrderItemWithMenu[] = (orderItemsData ?? []).map((i) => ({
        id: i.id,
        qty: i.qty,
        unit_price: i.unit_price,
        menu_item_name: menuMap.get(i.menu_item_id) ?? 'Menu Item',
      }));
      setItems(formattedItems);

      // 3. Fetch delivery partner if assigned
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('partner_id, status')
        .eq('order_id', id)
        .maybeSingle();

      if (deliveryData?.partner_id) {
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', deliveryData.partner_id)
          .single();

        if (partnerProfile) {
          setPartner({
            name: partnerProfile.full_name ?? 'Campus Partner',
            phone: partnerProfile.phone ?? null,
            status: deliveryData.status,
          });
        }
      } else {
        setPartner(null);
      }

      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load order details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  // Realtime single-order subscription for live status changes
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`order-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as { status: OrderStatus; total: number };
            setOrder((prev) => (prev ? { ...prev, status: updated.status, total: updated.total } : null));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
          filter: `order_id=eq.${id}`,
        },
        () => {
          fetchOrderDetail();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchOrderDetail]);

  const steps = useMemo(() => {
    if (!order) return [];
    return order.fulfillment === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS;
  }, [order]);

  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    if (order.status === 'cancelled') return -1;
    const targetIdx = steps.findIndex((s) => s.key === order.status);
    if (targetIdx !== -1) return targetIdx;
    // Fallback based on relative rank
    const currentRank = STATUS_ORDER[order.status] ?? 0;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (STATUS_ORDER[steps[i].key] <= currentRank) return i;
    }
    return 0;
  }, [order, steps]);

  const callPartner = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading order tracking...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>Order Not Found</Text>
        <Text style={styles.errorText}>{error ?? 'Could not find this order.'}</Text>
        <TouchableOpacity style={styles.backBtnPill} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnPillText}>Back to Orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const shortId = `CE-${order.id.slice(0, 8).toUpperCase()}`;
  const isPickup = order.fulfillment === 'pickup';
  const deliveryFee = isPickup ? 0 : 20;
  const itemsSubtotal = order.total - deliveryFee;

  const placedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>{shortId}</Text>
          <Text style={styles.navSubtitle}>{placedDate}</Text>
        </View>
        <TouchableOpacity style={styles.circleBtn} onPress={fetchOrderDetail}>
          <Ionicons name="refresh" size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cancelled Alert Banner (if cancelled) */}
        {order.status === 'cancelled' && (
          <View style={styles.cancelledBanner}>
            <Ionicons name="close-circle" size={24} color="#DC2626" />
            <View style={styles.cancelledTextWrap}>
              <Text style={styles.cancelledTitle}>Order Cancelled</Text>
              <Text style={styles.cancelledSub}>
                This order was cancelled. Any online payment will be refunded.
              </Text>
            </View>
          </View>
        )}

        {/* Stall & Fulfillment Header Card */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.stallRow}>
            <View style={styles.stallIconBox}>
              <Ionicons name="storefront" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.stallInfoWrap}>
              <Text style={styles.stallName}>
                {order.outlet?.name ?? 'Campus Stall'}
              </Text>
              <Text style={styles.stallLocation}>
                {order.outlet?.location ?? 'VIT-AP Food Street'}
              </Text>
            </View>

            <View
              style={[
                styles.fulfillmentPill,
                isPickup ? styles.pillPickup : styles.pillDelivery,
              ]}
            >
              <Ionicons
                name={isPickup ? 'walk-outline' : 'bicycle-outline'}
                size={12}
                color={isPickup ? '#B45309' : '#166534'}
              />
              <Text
                style={[
                  styles.fulfillmentPillText,
                  isPickup ? styles.textPickup : styles.textDelivery,
                ]}
              >
                {isPickup ? 'Self Pickup' : 'Campus Delivery'}
              </Text>
            </View>
          </View>
        </View>

        {/* Live Status Timeline */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.timelineHeader}>
            <Text style={styles.sectionTitle}>Order Tracking</Text>
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live Updates</Text>
              </View>
            )}
          </View>

          {/* Vertical Stepper Timeline */}
          <View style={styles.verticalTimeline}>
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex && order.status !== 'cancelled';
              const isLast = idx === steps.length - 1;

              return (
                <View key={step.key} style={styles.timelineStepRow}>
                  {/* Left: Step Indicator Circle & Vertical Line */}
                  <View style={styles.indicatorColumn}>
                    <View
                      style={[
                        styles.stepCircle,
                        isPast && styles.stepCircleDone,
                        isCurrent && styles.stepCircleActive,
                      ]}
                    >
                      {isPast ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : (
                        <Ionicons
                          name={step.icon}
                          size={14}
                          color={isCurrent ? '#FFFFFF' : Colors.textTertiary}
                        />
                      )}
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.verticalLine,
                          isPast && styles.verticalLineDone,
                        ]}
                      />
                    )}
                  </View>

                  {/* Right: Step Title & Subtitle */}
                  <View style={styles.stepContentWrap}>
                    <Text
                      style={[
                        styles.stepTitle,
                        isCurrent && styles.stepTitleActive,
                        isPast && styles.stepTitleDone,
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text
                      style={[
                        styles.stepSublabel,
                        isCurrent && styles.stepSublabelActive,
                      ]}
                    >
                      {step.sublabel}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Delivery Partner Card (Shown if partner assigned) */}
        {partner && (
          <View style={[styles.card, Shadows.card]}>
            <Text style={styles.sectionTitle}>Delivery Partner</Text>
            <View style={styles.partnerRow}>
              <View style={styles.partnerAvatar}>
                <Text style={styles.partnerAvatarText}>
                  {partner.name[0]?.toUpperCase() ?? 'D'}
                </Text>
              </View>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>{partner.name}</Text>
                <Text style={styles.partnerRole}>
                  Verified Campus Student Partner
                </Text>
              </View>
              {partner.phone && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => callPartner(partner.phone!)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                  <Text style={styles.callBtnText}>Call</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Ordered Items List */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.sectionTitle}>Items Ordered ({items.length})</Text>
          <View style={styles.itemsListWrap}>
            {items.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  idx !== items.length - 1 && styles.itemRowBorder,
                ]}
              >
                <View style={styles.itemQtyBadge}>
                  <Text style={styles.itemQtyText}>{item.qty}x</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.menu_item_name}
                </Text>
                <Text style={styles.itemPrice}>
                  {formatINR(item.unit_price * item.qty)}
                </Text>
              </View>
            ))}
          </View>

          {/* Billing Breakdown */}
          <View style={styles.billDivider} />
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Subtotal</Text>
            <Text style={styles.billVal}>{formatINR(itemsSubtotal)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Charge</Text>
            <Text style={[styles.billVal, deliveryFee === 0 && styles.billFree]}>
              {deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}
            </Text>
          </View>
          <View style={styles.billRowTotal}>
            <Text style={styles.billTotalLabel}>Grand Total</Text>
            <Text style={styles.billTotalVal}>{formatINR(order.total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Footer */}
      <SafeAreaView edges={['bottom']} style={styles.footerWrap}>
        <TouchableOpacity
          style={[styles.homeBtn, Shadows.cta]}
          onPress={() => router.replace('/(student)')}
          activeOpacity={0.88}
        >
          <Ionicons name="home-outline" size={18} color="#FFFFFF" />
          <Text style={styles.homeBtnText}>Back to Explore</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radii.pill,
    marginTop: Spacing.sm,
  },
  backBtnPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navCenter: {
    alignItems: 'center',
  },
  navTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  navSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radii.xl,
    padding: Spacing.md,
  },
  cancelledTextWrap: {
    flex: 1,
  },
  cancelledTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#DC2626',
  },
  cancelledSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stallIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stallInfoWrap: {
    flex: 1,
  },
  stallName: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  stallLocation: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fulfillmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  pillPickup: {
    backgroundColor: '#FEF3C7',
  },
  pillDelivery: {
    backgroundColor: '#DCFCE7',
  },
  fulfillmentPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  textPickup: {
    color: '#B45309',
  },
  textDelivery: {
    color: '#166534',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#16A34A',
  },
  verticalTimeline: {
    paddingLeft: Spacing.xs,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    minHeight: 56,
  },
  indicatorColumn: {
    alignItems: 'center',
    width: 28,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepCircleDone: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: Colors.border,
    marginTop: -2,
    marginBottom: -2,
    zIndex: 1,
  },
  verticalLineDone: {
    backgroundColor: '#166534',
  },
  stepContentWrap: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: Spacing.sm,
  },
  stepTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.textTertiary,
  },
  stepTitleDone: {
    color: Colors.text,
    fontFamily: FontFamily.bold,
  },
  stepTitleActive: {
    color: Colors.primary,
    fontFamily: FontFamily.extraBold,
  },
  stepSublabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  stepSublabelActive: {
    color: Colors.textSecondary,
    fontFamily: FontFamily.medium,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
  },
  partnerRole: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#166534',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill,
  },
  callBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  itemsListWrap: {
    marginTop: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: Spacing.sm,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemQtyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  itemQtyText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.text,
  },
  itemName: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  itemPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
  },
  billDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  billLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  billVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.text,
  },
  billFree: {
    color: '#166534',
    fontFamily: FontFamily.bold,
  },
  billRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xs,
  },
  billTotalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
  },
  billTotalVal: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: Colors.primary,
  },
  footerWrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'android' ? Spacing.md : Spacing.xs,
  },
  homeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  homeBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
