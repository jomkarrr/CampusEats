import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { OrderStatus, FulfillmentType } from '../../lib/database.types';
import { formatINR } from '../../lib/format';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
} from '../../constants/theme';

interface OutletOrderSummary {
  id: string;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  total: number;
  created_at: string;
  payment_method: string | null;
  payment_status: string | null;
  outlet_id: string;
  outlet_name: string;
  customer_name: string;
  customer_phone: string;
  customer_hostel: string;
  items: {
    name: string;
    qty: number;
    unit_price: number;
  }[];
}

interface OutletFilter {
  id: string;
  name: string;
}

export default function OutletOrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<OutletOrderSummary[]>([]);
  const [outlets, setOutlets] = useState<OutletFilter[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'ready' | 'all'>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch outlets for filter bar
  const fetchOutlets = useCallback(async () => {
    const { data } = await supabase
      .from('outlets')
      .select('id, name')
      .order('name');
    if (data) setOutlets(data);
  }, []);

  // Fetch active / all stall orders
  const fetchOrders = useCallback(async () => {
    try {
      // 1. Fetch orders in relevant statuses
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter === 'active') {
        query = query.in('status', ['placed', 'accepted', 'preparing']);
      } else if (statusFilter === 'ready') {
        query = query.eq('status', 'ready');
      }

      const { data: rawOrders, error: orderErr } = await query;
      if (orderErr) throw orderErr;

      if (!rawOrders || rawOrders.length === 0) {
        setOrders([]);
        return;
      }

      // 2. Fetch outlet details
      const outletIds = Array.from(new Set(rawOrders.map((o) => o.outlet_id)));
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('id, name')
        .in('id', outletIds);
      const outletMap = new Map<string, string>();
      outletsData?.forEach((o) => outletMap.set(o.id, o.name));

      // 3. Fetch customer profiles
      const customerIds = Array.from(new Set(rawOrders.map((o) => o.customer_id)));
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, hostel_block')
        .in('id', customerIds);
      const profileMap = new Map<string, { name: string; phone: string; hostel: string }>();
      profilesData?.forEach((p) =>
        profileMap.set(p.id, {
          name: p.full_name ?? 'Student Customer',
          phone: p.phone ?? 'No phone',
          hostel: p.hostel_block ?? 'Campus',
        })
      );

      // 4. Fetch order items for these orders
      const orderIds = rawOrders.map((o) => o.id);
      const { data: rawItems } = await supabase
        .from('order_items')
        .select('id, order_id, menu_item_id, qty, unit_price')
        .in('order_id', orderIds);

      // Fetch menu item names
      const menuItemIds = Array.from(new Set(rawItems?.map((i) => i.menu_item_id) ?? []));
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, name')
        .in('id', menuItemIds);
      const menuNameMap = new Map<string, string>();
      menuData?.forEach((m) => menuNameMap.set(m.id, m.name));

      // Group items by order_id
      const itemsByOrder = new Map<string, { name: string; qty: number; unit_price: number }[]>();
      rawItems?.forEach((item) => {
        const list = itemsByOrder.get(item.order_id) ?? [];
        list.push({
          name: menuNameMap.get(item.menu_item_id) ?? 'Item',
          qty: item.qty,
          unit_price: item.unit_price,
        });
        itemsByOrder.set(item.order_id, list);
      });

      // Assemble final summaries
      const assembled: OutletOrderSummary[] = rawOrders.map((o) => {
        const cust = profileMap.get(o.customer_id);
        return {
          id: o.id,
          status: o.status,
          fulfillment: o.fulfillment,
          total: o.total,
          created_at: o.created_at,
          payment_method: o.payment_method,
          payment_status: o.payment_status,
          outlet_id: o.outlet_id,
          outlet_name: outletMap.get(o.outlet_id) ?? 'Campus Stall',
          customer_name: cust?.name ?? 'Customer',
          customer_phone: cust?.phone ?? 'Not provided',
          customer_hostel: cust?.hostel ?? 'Campus',
          items: itemsByOrder.get(o.id) ?? [],
        };
      });

      setOrders(assembled);
    } catch (e: unknown) {
      console.warn('Failed to load outlet orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOutlets();
  }, [fetchOutlets]);

  useEffect(() => {
    setLoading(true);
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  // Status transitions: placed -> accepted -> preparing -> ready
  const advanceOrderStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus | null = null;
    let confirmMsg = '';

    if (currentStatus === 'placed') {
      nextStatus = 'accepted';
      confirmMsg = 'Accept this order and acknowledge to student?';
    } else if (currentStatus === 'accepted') {
      nextStatus = 'preparing';
      confirmMsg = 'Start preparing this order now?';
    } else if (currentStatus === 'preparing') {
      nextStatus = 'ready';
      confirmMsg = 'Mark this order as READY? It will be ready for pickup / delivery partner.';
    }

    if (!nextStatus) return;

    Alert.alert('Update Order Status', confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setUpdatingId(orderId);
          try {
            const { error } = await supabase
              .from('orders')
              .update({ status: nextStatus })
              .eq('id', orderId);

            if (error) throw error;
            await fetchOrders();
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to update order status';
            Alert.alert('Update Failed', msg);
          } finally {
            setUpdatingId(null);
          }
        },
      },
    ]);
  };

  const filteredOrders = orders.filter((o) =>
    selectedOutletId === 'all' ? true : o.outlet_id === selectedOutletId
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'placed':
        return { label: 'New Order', bg: '#FEF3C7', color: '#B45309' };
      case 'accepted':
        return { label: 'Accepted', bg: '#DBEAFE', color: '#1E40AF' };
      case 'preparing':
        return { label: 'Preparing', bg: '#FEE2E2', color: '#B91C1C' };
      case 'ready':
        return { label: 'Ready', bg: '#DCFCE7', color: '#15803D' };
      case 'picked_up':
        return { label: 'Picked Up', bg: '#F3E8FF', color: '#6B21A8' };
      case 'delivered':
        return { label: 'Delivered', bg: '#F1F5F9', color: '#475569' };
      default:
        return { label: status, bg: '#F1F5F9', color: '#64748B' };
    }
  };

  const renderOrderCard = ({ item }: { item: OutletOrderSummary }) => {
    const badge = getStatusBadge(item.status);
    const shortId = `CE-${item.id.slice(0, 6).toUpperCase()}`;
    const placedTime = new Date(item.created_at).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const isUpdating = updatingId === item.id;

    return (
      <View style={[styles.orderCard, Shadows.card]}>
        {/* Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderId}>{shortId}</Text>
            <Text style={styles.outletTag}>{item.outlet_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Customer & Fulfillment Info */}
        <View style={styles.customerRow}>
          <View style={styles.customerInfo}>
            <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.customerName}>{item.customer_name}</Text>
            <Text style={styles.customerPhone}>• {item.customer_phone}</Text>
          </View>
          <View style={[styles.fulfillmentPill, item.fulfillment === 'delivery' ? styles.deliveryPill : styles.pickupPill]}>
            <Ionicons
              name={item.fulfillment === 'delivery' ? 'bicycle-outline' : 'walk-outline'}
              size={12}
              color={item.fulfillment === 'delivery' ? '#0284C7' : '#15803D'}
            />
            <Text style={[styles.fulfillmentText, { color: item.fulfillment === 'delivery' ? '#0284C7' : '#15803D' }]}>
              {item.fulfillment === 'delivery' ? `Delivery (${item.customer_hostel})` : 'Self Pickup'}
            </Text>
          </View>
        </View>

        {/* Order Items Breakdown */}
        <View style={styles.itemsBox}>
          {item.items.map((it, idx) => (
            <View key={idx} style={styles.itemLine}>
              <Text style={styles.itemQty}>{it.qty}x</Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {it.name}
              </Text>
              <Text style={styles.itemPrice}>{formatINR(it.qty * it.unit_price)}</Text>
            </View>
          ))}
        </View>

        {/* Footer: Price + Payment + Next Action Button */}
        <View style={styles.cardFooter}>
          <View style={styles.footerPriceCol}>
            <Text style={styles.totalLabel}>Total ({placedTime})</Text>
            <Text style={styles.totalAmount}>{formatINR(item.total)}</Text>
            <Text style={styles.paymentMethodText}>
              Pay via {(item.payment_method ?? 'UPI/Cash').toUpperCase()} (Pending)
            </Text>
          </View>

          {/* Action Button: Accept -> Preparing -> Mark Ready */}
          {item.status === 'placed' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnAccept]}
              onPress={() => advanceOrderStatus(item.id, item.status)}
              disabled={isUpdating}
              activeOpacity={0.85}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'accepted' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnPrepare]}
              onPress={() => advanceOrderStatus(item.id, item.status)}
              disabled={isUpdating}
              activeOpacity={0.85}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="flame-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Preparing</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'preparing' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.btnReady]}
              onPress={() => advanceOrderStatus(item.id, item.status)}
              disabled={isUpdating}
              activeOpacity={0.85}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Mark Ready</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'ready' && (
            <View style={styles.readyIndicator}>
              <Ionicons name="checkmark-done-circle" size={18} color="#15803D" />
              <Text style={styles.readyIndicatorText}>
                {item.fulfillment === 'delivery' ? 'Ready for Partner' : 'Ready for Counter Pickup'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.navTitles}>
          <Text style={styles.navMainTitle}>Outlet Mode</Text>
          <Text style={styles.navSubTitle}>Campus Stall Kitchen & Orders</Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh} activeOpacity={0.8}>
          <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, statusFilter === 'active' && styles.tabBtnActive]}
          onPress={() => setStatusFilter('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, statusFilter === 'active' && styles.tabTextActive]}>
            In Kitchen (Active)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, statusFilter === 'ready' && styles.tabBtnActive]}
          onPress={() => setStatusFilter('ready')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, statusFilter === 'ready' && styles.tabTextActive]}>
            Ready for Pickup
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, statusFilter === 'all' && styles.tabBtnActive]}
          onPress={() => setStatusFilter('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, statusFilter === 'all' && styles.tabTextActive]}>
            All Orders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Outlet Filter Horizontal Pill List */}
      <View style={styles.outletFilterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outletPillsScroll}>
          <TouchableOpacity
            style={[styles.outletPill, selectedOutletId === 'all' && styles.outletPillActive]}
            onPress={() => setSelectedOutletId('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.outletPillText, selectedOutletId === 'all' && styles.outletPillTextActive]}>
              All Stalls ({orders.length})
            </Text>
          </TouchableOpacity>
          {outlets.map((out) => {
            const count = orders.filter((o) => o.outlet_id === out.id).length;
            const isSelected = selectedOutletId === out.id;
            return (
              <TouchableOpacity
                key={out.id}
                style={[styles.outletPill, isSelected && styles.outletPillActive]}
                onPress={() => setSelectedOutletId(out.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.outletPillText, isSelected && styles.outletPillTextActive]}>
                  {out.name} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading stall orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.centerScreen}>
          <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter === 'active'
              ? 'No active kitchen orders waiting right now.'
              : 'No orders found matching the filter.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchOrders}>
            <Text style={styles.retryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderCard}
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  navTitles: {
    flex: 1,
  },
  navMainTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
  },
  navSubTitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  refreshIconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
  outletFilterBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  outletPillsScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  outletPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outletPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  outletPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  outletPillTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  outletTag: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  statusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerName: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.text,
  },
  customerPhone: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textTertiary,
  },
  fulfillmentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  deliveryPill: {
    backgroundColor: '#E0F2FE',
  },
  pickupPill: {
    backgroundColor: '#DCFCE7',
  },
  fulfillmentText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
  },
  itemsBox: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  itemQty: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.primary,
    width: 24,
  },
  itemName: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.text,
  },
  itemPrice: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  footerPriceCol: {
    flex: 1,
  },
  totalLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textTertiary,
  },
  totalAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  paymentMethodText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: '#D97706',
    marginTop: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.pill,
  },
  btnAccept: {
    backgroundColor: '#2563EB',
  },
  btnPrepare: {
    backgroundColor: '#EA580C',
  },
  btnReady: {
    backgroundColor: '#16A34A',
  },
  actionBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  readyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  readyIndicatorText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#15803D',
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radii.pill,
  },
  retryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});

