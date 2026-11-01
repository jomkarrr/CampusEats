import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { formatINR } from '../../context/cart';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
} from '../../constants/theme';

interface AvailableRequest {
  id: string;
  total: number;
  created_at: string;
  outlet_name: string;
  outlet_location: string;
  customer_name: string;
  customer_hostel: string;
  items_summary: string;
  items_count: number;
}

export default function PartnerHomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [isOnline, setIsOnline] = useState(true);
  const [requests, setRequests] = useState<AvailableRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);

  // Check if partner already has an active delivery
  const checkActiveDelivery = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('deliveries')
      .select('id, order_id, status')
      .eq('partner_id', user.id)
      .in('status', ['assigned', 'picked_up'])
      .maybeSingle();

    if (data) {
      setActiveDeliveryId(data.id);
      return data;
    } else {
      setActiveDeliveryId(null);
      return null;
    }
  }, [user]);

  // Fetch available orders
  const fetchAvailableRequests = useCallback(async () => {
    if (!user) return;

    try {
      await checkActiveDelivery();

      // 1. Fetch orders with fulfillment = 'delivery' and status = 'ready'
      const { data: readyOrders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, total, created_at, outlet_id, customer_id')
        .eq('fulfillment', 'delivery')
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      if (!readyOrders || readyOrders.length === 0) {
        setRequests([]);
        return;
      }

      const orderIds = readyOrders.map((o) => o.id);

      // 2. Filter out orders that already have an entry in deliveries
      const { data: existingDeliveries } = await supabase
        .from('deliveries')
        .select('order_id')
        .in('order_id', orderIds);

      const assignedOrderIds = new Set(existingDeliveries?.map((d) => d.order_id) ?? []);
      const unassignedOrders = readyOrders.filter((o) => !assignedOrderIds.has(o.id));

      if (unassignedOrders.length === 0) {
        setRequests([]);
        return;
      }

      // 3. Batch fetch outlets
      const outletIds = Array.from(new Set(unassignedOrders.map((o) => o.outlet_id)));
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('id, name, location')
        .in('id', outletIds);

      const outletMap = new Map<string, { name: string; location: string }>();
      outletsData?.forEach((out) => {
        outletMap.set(out.id, {
          name: out.name,
          location: out.location || 'Campus Food Street',
        });
      });

      // 4. Batch fetch customer profiles
      const customerIds = Array.from(new Set(unassignedOrders.map((o) => o.customer_id)));
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, hostel_block')
        .in('id', customerIds);

      const profileMap = new Map<string, { name: string; hostel: string }>();
      profilesData?.forEach((p) => {
        profileMap.set(p.id, {
          name: p.full_name || 'Campus Student',
          hostel: p.hostel_block || 'Hostel Block',
        });
      });

      // 5. Batch fetch order items
      const unassignedIds = unassignedOrders.map((o) => o.id);
      const { data: orderItemsData } = await supabase
        .from('order_items')
        .select('order_id, qty, menu_item_id')
        .in('order_id', unassignedIds);

      const menuItemIds = Array.from(
        new Set((orderItemsData ?? []).map((i) => i.menu_item_id))
      );
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, name')
        .in('id', menuItemIds);

      const menuNameMap = new Map<string, string>();
      menuData?.forEach((m) => menuNameMap.set(m.id, m.name));

      const itemsMap = new Map<string, { summary: string; count: number }>();
      orderItemsData?.forEach((item) => {
        const current = itemsMap.get(item.order_id) || { summary: '', count: 0 };
        const itemName = menuNameMap.get(item.menu_item_id) || 'Item';
        const str = `${item.qty}x ${itemName}`;
        const newSummary = current.summary ? `${current.summary}, ${str}` : str;
        itemsMap.set(item.order_id, {
          summary: newSummary,
          count: current.count + item.qty,
        });
      });

      // Format final requests list
      const formatted: AvailableRequest[] = unassignedOrders.map((ord) => {
        const outlet = outletMap.get(ord.outlet_id);
        const cust = profileMap.get(ord.customer_id);
        const itemInfo = itemsMap.get(ord.id) || { summary: 'Food items', count: 1 };

        return {
          id: ord.id,
          total: Number(ord.total),
          created_at: ord.created_at,
          outlet_name: outlet?.name ?? 'Campus Stall',
          outlet_location: outlet?.location ?? 'Food Street',
          customer_name: cust?.name ?? 'Campus Student',
          customer_hostel: cust?.hostel ?? 'Hostel Room',
          items_summary: itemInfo.summary,
          items_count: itemInfo.count,
        };
      });

      setRequests(formatted);
    } catch (err) {
      console.error('Error fetching available requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, checkActiveDelivery]);

  useEffect(() => {
    fetchAvailableRequests();

    // Realtime subscription on orders table
    const ordersChannel = supabase
      .channel('partner_available_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchAvailableRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
        },
        () => {
          fetchAvailableRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [fetchAvailableRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAvailableRequests();
  };

  const handleCardPress = (orderId: string) => {
    router.push({
      pathname: '/(partner)/request/[orderId]',
      params: { orderId },
    });
  };

  const renderItem = ({ item }: { item: AvailableRequest }) => (
    <TouchableOpacity
      style={[styles.requestCard, Shadows.card]}
      activeOpacity={0.88}
      onPress={() => handleCardPress(item.id)}
    >
      {/* Top row: Outlet & Earns Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.outletInfo}>
          <Text style={styles.outletName} numberOfLines={1}>
            {item.outlet_name}
          </Text>
          <Text style={styles.orderIdText}>Order #{item.id.slice(0, 6)}</Text>
        </View>
        <View style={styles.earningBadge}>
          <Text style={styles.earningBadgeText}>Earns ₹20</Text>
        </View>
      </View>

      {/* Route: Pickup & Drop */}
      <View style={styles.routeContainer}>
        {/* Pickup */}
        <View style={styles.routeRow}>
          <View style={styles.pickupDot} />
          <View style={styles.routeTextWrap}>
            <Text style={styles.routeLabel}>PICKUP FROM</Text>
            <Text style={styles.routeValue} numberOfLines={1}>
              {item.outlet_name} ({item.outlet_location})
            </Text>
          </View>
        </View>

        {/* Vertical connector line */}
        <View style={styles.routeLine} />

        {/* Drop */}
        <View style={styles.routeRow}>
          <View style={styles.dropPin}>
            <Ionicons name="location" size={13} color="#FFFFFF" />
          </View>
          <View style={styles.routeTextWrap}>
            <Text style={styles.routeLabel}>DROP TO</Text>
            <Text style={styles.routeValue} numberOfLines={1}>
              {item.customer_hostel} ({item.customer_name})
            </Text>
          </View>
        </View>
      </View>

      {/* Summary Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerItemInfo}>
          <Ionicons name="fast-food-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.footerSummaryText} numberOfLines={1}>
            {item.items_count} {item.items_count === 1 ? 'item' : 'items'} • {item.items_summary}
          </Text>
        </View>
        <Text style={styles.orderTotalText}>{formatINR(item.total)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* Header bar with Online/Offline toggle */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hey, {profile?.full_name ? profile.full_name.split(' ')[0] : 'Partner'} 🛵
          </Text>
          <Text style={styles.subGreeting}>
            {isOnline ? 'You are visible for campus deliveries' : 'Go online to accept orders'}
          </Text>
        </View>

        <View style={styles.toggleWrap}>
          <Text
            style={[
              styles.toggleLabel,
              { color: isOnline ? Colors.green : Colors.textTertiary },
            ]}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: '#E5E7EB', true: '#DCFCE7' }}
            thumbColor={isOnline ? Colors.green : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Active Delivery Alert Banner */}
      {activeDeliveryId && (
        <TouchableOpacity
          style={styles.activeBanner}
          activeOpacity={0.88}
          onPress={() => router.push('/(partner)/active')}
        >
          <View style={styles.activeBannerLeft}>
            <Ionicons name="flash" size={18} color="#FFFFFF" />
            <View>
              <Text style={styles.activeBannerTitle}>Active Delivery in Progress</Text>
              <Text style={styles.activeBannerSub}>Tap to open stepper & directions</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Content */}
      {!isOnline ? (
        <View style={styles.offlineState}>
          <Ionicons name="moon-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.offlineTitle}>You are currently Offline</Text>
          <Text style={styles.offlineSubtitle}>
            Turn on the switch above when you are ready to receive delivery requests on campus.
          </Text>
          <TouchableOpacity
            style={styles.goOnlineBtn}
            onPress={() => setIsOnline(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.goOnlineBtnText}>Go Online</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching available orders...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
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
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listSectionTitle}>Available Delivery Requests</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{requests.length} available</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={60} color={Colors.green} />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptySubtitle}>
                No delivery orders waiting right now. When campus stalls mark orders ready, they will appear here in real-time.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greeting: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.text,
  },
  subGreeting: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  toggleWrap: {
    alignItems: 'center',
  },
  toggleLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radii.lg,
    ...Shadows.card,
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  activeBannerSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: '#FFEADD',
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  listSectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  countBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  requestCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  outletInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  outletName: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: Colors.text,
  },
  orderIdText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
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
  routeContainer: {
    backgroundColor: '#FAFAF9',
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    marginVertical: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginLeft: 2,
  },
  dropPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLine: {
    width: 2,
    height: 14,
    backgroundColor: '#D6D3D1',
    marginLeft: 7,
    marginVertical: 2,
  },
  routeTextWrap: {
    flex: 1,
  },
  routeLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9.5,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  routeValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: Spacing.sm,
  },
  footerSummaryText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  orderTotalText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  offlineState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  offlineTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: 8,
  },
  offlineSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  goOnlineBtn: {
    backgroundColor: Colors.green,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radii.pill,
    ...Shadows.cta,
  },
  goOnlineBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
