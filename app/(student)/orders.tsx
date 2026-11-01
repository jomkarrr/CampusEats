import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatINR } from '../../lib/format';
import { OrderStatus, FulfillmentType } from '../../lib/database.types';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
} from '../../constants/theme';

export interface OrderItemRecord {
  id: string;
  qty: number;
  unit_price: number;
  menu_item?: { name: string } | null;
}

export interface OrderRecord {
  id: string;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  total: number;
  created_at: string;
  outlet_id: string;
  outlet_name: string;
  outlet_image: string | null;
  items_summary: string;
  item_count: number;
}

// Status badge styling helper
export function getStatusBadgeProps(status: OrderStatus) {
  switch (status) {
    case 'placed':
      return {
        label: 'Order Placed',
        bg: '#F3F4F6',
        text: '#4B5563',
        icon: 'time-outline' as const,
      };
    case 'accepted':
      return {
        label: 'Accepted',
        bg: '#FFEDD5',
        text: '#C2410C',
        icon: 'restaurant-outline' as const,
      };
    case 'preparing':
      return {
        label: 'Preparing',
        bg: '#FFEDD5',
        text: '#C2410C',
        icon: 'flame-outline' as const,
      };
    case 'ready':
      return {
        label: 'Ready for Pickup',
        bg: '#DCFCE7',
        text: '#15803D',
        icon: 'bag-check-outline' as const,
      };
    case 'picked_up':
      return {
        label: 'Out for Delivery',
        bg: '#DCFCE7',
        text: '#166534',
        icon: 'bicycle-outline' as const,
      };
    case 'delivered':
      return {
        label: 'Delivered',
        bg: '#DCFCE7',
        text: '#166534',
        icon: 'checkmark-circle-outline' as const,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: '#FEE2E2',
        text: '#DC2626',
        icon: 'close-circle-outline' as const,
      };
    default:
      return {
        label: status,
        bg: '#F3F4F6',
        text: '#4B5563',
        icon: 'information-circle-outline' as const,
      };
  }
}

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch user orders
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setError(null);
        return;
      }

      // 2. Fetch outlets info
      const outletIds = Array.from(new Set(ordersData.map((o) => o.outlet_id)));
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('id, name, image_url')
        .in('id', outletIds);

      const outletMap = new Map<string, { name: string; image_url: string | null }>();
      outletsData?.forEach((o) => outletMap.set(o.id, { name: o.name, image_url: o.image_url }));

      // 3. Fetch order items for summary
      const orderIds = ordersData.map((o) => o.id);
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('id, order_id, qty, menu_item_id')
        .in('order_id', orderIds);

      // Fetch menu item names
      const menuItemIds = Array.from(new Set(itemsData?.map((i) => i.menu_item_id) ?? []));
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, name')
        .in('id', menuItemIds);

      const menuMap = new Map<string, string>();
      menuData?.forEach((m) => menuMap.set(m.id, m.name));

      // Build items summary per order
      const orderItemsMap = new Map<string, { summary: string; count: number }>();
      ordersData.forEach((ord) => {
        const orderItems = itemsData?.filter((i) => i.order_id === ord.id) ?? [];
        const totalCount = orderItems.reduce((acc, curr) => acc + curr.qty, 0);
        const itemNames = orderItems
          .map((i) => `${menuMap.get(i.menu_item_id) ?? 'Item'}${i.qty > 1 ? ` (${i.qty})` : ''}`)
          .slice(0, 3)
          .join(', ');
        const summary = orderItems.length > 3 ? `${itemNames} +${orderItems.length - 3} more` : itemNames;

        orderItemsMap.set(ord.id, {
          summary: summary || 'Food order',
          count: totalCount || orderItems.length,
        });
      });

      // Construct final record list
      const records: OrderRecord[] = ordersData.map((ord) => {
        const out = outletMap.get(ord.outlet_id);
        const itemInfo = orderItemsMap.get(ord.id);
        return {
          id: ord.id,
          status: ord.status,
          fulfillment: ord.fulfillment,
          total: ord.total,
          created_at: ord.created_at,
          outlet_id: ord.outlet_id,
          outlet_name: out?.name ?? 'Campus Stall',
          outlet_image: out?.image_url ?? null,
          items_summary: itemInfo?.summary ?? 'Food Order',
          item_count: itemInfo?.count ?? 1,
        };
      });

      setOrders(records);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load orders';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription for customer's orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('orders-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          // If status or row changes, update order list live
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as { id: string; status: OrderStatus; total: number };
            setOrders((prev) =>
              prev.map((ord) =>
                ord.id === updated.id
                  ? { ...ord, status: updated.status, total: updated.total }
                  : ord
              )
            );
          } else {
            // For inserts or deletes, re-fetch to include proper joined outlet & items
            fetchOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: OrderRecord }) => {
    const badge = getStatusBadgeProps(item.status);
    const isPickup = item.fulfillment === 'pickup';

    return (
      <TouchableOpacity
        style={[styles.orderCard, Shadows.card]}
        onPress={() => router.push(`/(student)/orders/${item.id}`)}
        activeOpacity={0.85}
      >
        {/* Top Card Row: Outlet & Status Badge */}
        <View style={styles.cardTopRow}>
          <View style={styles.outletRow}>
            <Image
              source={{
                uri:
                  item.outlet_image ??
                  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200',
              }}
              style={styles.outletThumb}
            />
            <View style={styles.outletTitleWrap}>
              <Text style={styles.outletName} numberOfLines={1}>
                {item.outlet_name}
              </Text>
              <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={12} color={badge.text} />
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Middle: Items Summary */}
        <View style={styles.itemsSummaryRow}>
          <Text style={styles.itemsSummaryText} numberOfLines={2}>
            {item.items_summary}
          </Text>
        </View>

        {/* Bottom Card Row: Total, Fulfillment Pill & Arrow */}
        <View style={styles.cardBottomRow}>
          <View style={styles.priceWrap}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatINR(item.total)}</Text>
          </View>

          <View style={styles.rightActionWrap}>
            <View
              style={[
                styles.fulfillmentChip,
                isPickup ? styles.chipPickup : styles.chipDelivery,
              ]}
            >
              <Ionicons
                name={isPickup ? 'walk-outline' : 'bicycle-outline'}
                size={12}
                color={isPickup ? '#B45309' : '#166534'}
              />
              <Text
                style={[
                  styles.fulfillmentChipText,
                  isPickup ? styles.chipPickupText : styles.chipDeliveryText,
                ]}
              >
                {isPickup ? 'Pickup' : 'Delivery'}
              </Text>
            </View>

            <View style={styles.arrowCircle}>
              <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Orders</Text>
        <Text style={styles.headerSubtitle}>
          Realtime status & order tracking
        </Text>
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching your orders...</Text>
        </View>
      )}

      {/* Error state */}
      {error && !loading && (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={44} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchOrders}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {!loading && !error && orders.length === 0 && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="receipt-outline" size={44} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            When you place an order from any campus food stall, you can track it live here.
          </Text>
          <TouchableOpacity
            style={[styles.exploreBtn, Shadows.cta]}
            onPress={() => router.push('/(student)')}
            activeOpacity={0.85}
          >
            <Ionicons name="restaurant-outline" size={16} color="#FFFFFF" />
            <Text style={styles.exploreBtnText}>Explore Stalls</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Orders List */}
      {!loading && !error && orders.length > 0 && (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.text,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radii.pill,
  },
  retryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.text,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.xl,
    maxWidth: 270,
    lineHeight: 18,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: Radii.pill,
  },
  exploreBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  orderCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  outletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  outletThumb: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: '#F1F5F9',
  },
  outletTitleWrap: {
    flex: 1,
  },
  outletName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  orderDate: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  statusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  itemsSummaryRow: {
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginVertical: 4,
  },
  itemsSummaryText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  totalLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    color: Colors.primary,
  },
  rightActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fulfillmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  chipPickup: {
    backgroundColor: '#FEF3C7',
  },
  chipDelivery: {
    backgroundColor: '#DCFCE7',
  },
  fulfillmentChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
  },
  chipPickupText: {
    color: '#B45309',
  },
  chipDeliveryText: {
    color: '#166534',
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
