import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

interface DeliveredHistoryItem {
  id: string;
  orderId: string;
  earnings: number;
  created_at: string;
  outletName: string;
  customerHostel: string;
  orderTotal: number;
}

export default function PartnerEarningsScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<DeliveredHistoryItem[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [totalDeliveriesCount, setTotalDeliveriesCount] = useState(0);

  const fetchEarnings = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch delivered rows for this partner
      const { data: deliveries, error: delErr } = await supabase
        .from('deliveries')
        .select('id, order_id, earnings, created_at')
        .eq('partner_id', user.id)
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (delErr) throw delErr;

      const delList = deliveries ?? [];
      setTotalDeliveriesCount(delList.length);

      // Calculate Today & Week
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

      let todaySum = 0;
      let weekSum = 0;

      delList.forEach((d) => {
        const itemTime = new Date(d.created_at).getTime();
        const amt = Number(d.earnings);
        if (itemTime >= startOfToday) {
          todaySum += amt;
        }
        if (itemTime >= oneWeekAgo) {
          weekSum += amt;
        }
      });

      setTodayEarnings(todaySum);
      setWeekEarnings(weekSum);

      if (delList.length === 0) {
        setHistory([]);
        return;
      }

      // Fetch related orders
      const orderIds = delList.map((d) => d.order_id);
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, total, outlet_id, customer_id')
        .in('id', orderIds);

      const outletIds = Array.from(new Set(ordersData?.map((o) => o.outlet_id) ?? []));
      const customerIds = Array.from(new Set(ordersData?.map((o) => o.customer_id) ?? []));

      // Fetch outlets
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('id, name')
        .in('id', outletIds);

      const outletMap = new Map<string, string>();
      outletsData?.forEach((out) => outletMap.set(out.id, out.name));

      // Fetch customer profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, hostel_block')
        .in('id', customerIds);

      const profileMap = new Map<string, string>();
      profilesData?.forEach((p) => profileMap.set(p.id, p.hostel_block || 'Hostel Room'));

      const orderMap = new Map<
        string,
        { total: number; outlet: string; hostel: string }
      >();

      ordersData?.forEach((o) => {
        orderMap.set(o.id, {
          total: Number(o.total),
          outlet: outletMap.get(o.outlet_id) || 'Campus Stall',
          hostel: profileMap.get(o.customer_id) || 'Campus Hostel',
        });
      });

      const formattedHistory: DeliveredHistoryItem[] = delList.map((d) => {
        const ord = orderMap.get(d.order_id);
        return {
          id: d.id,
          orderId: d.order_id,
          earnings: Number(d.earnings),
          created_at: d.created_at,
          outletName: ord?.outlet ?? 'Campus Stall',
          customerHostel: ord?.hostel ?? 'Hostel Room',
          orderTotal: ord?.total ?? 0,
        };
      });

      setHistory(formattedHistory);
    } catch (err) {
      console.error('Error fetching partner earnings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })}, ${d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })}`;
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.screenTitle}>Earnings & Payouts</Text>
      <Text style={styles.screenSubtitle}>Flat ₹20 credited per delivered order</Text>

      {/* METRIC CARDS */}
      <View style={styles.statsRow}>
        {/* Today */}
        <View style={[styles.statCard, Shadows.card]}>
          <Text style={styles.statLabel}>TODAY</Text>
          <Text style={styles.statValueGreen}>{formatINR(todayEarnings)}</Text>
          <Text style={styles.statSubText}>{Math.floor(todayEarnings / 20)} deliveries</Text>
        </View>

        {/* This Week */}
        <View style={[styles.statCard, Shadows.card]}>
          <Text style={styles.statLabel}>THIS WEEK</Text>
          <Text style={styles.statValue}>{formatINR(weekEarnings)}</Text>
          <Text style={styles.statSubText}>{Math.floor(weekEarnings / 20)} deliveries</Text>
        </View>
      </View>

      {/* Total Deliveries Summary Banner */}
      <View style={[styles.totalBanner, Shadows.card]}>
        <View style={styles.totalBannerLeft}>
          <View style={styles.totalIconWrap}>
            <Ionicons name="trophy-outline" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.totalBannerLabel}>Lifetime Deliveries</Text>
            <Text style={styles.totalBannerSub}>All time completed orders</Text>
          </View>
        </View>
        <Text style={styles.totalDeliveriesText}>{totalDeliveriesCount}</Text>
      </View>

      {/* Section Header */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Delivery History</Text>
        <Text style={styles.historyCount}>{history.length} completed</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: DeliveredHistoryItem }) => (
    <View style={[styles.historyCard, Shadows.card]}>
      <View style={styles.historyCardTop}>
        <View style={styles.historyStallWrap}>
          <Text style={styles.historyStallName}>{item.outletName}</Text>
          <Text style={styles.historyHostelName}>→ {item.customerHostel}</Text>
        </View>
        <View style={styles.earningBadge}>
          <Text style={styles.earningBadgeText}>+{formatINR(item.earnings)}</Text>
        </View>
      </View>

      <View style={styles.historyDivider} />

      <View style={styles.historyCardBottom}>
        <Text style={styles.historyTime}>{formatDateTime(item.created_at)}</Text>
        <Text style={styles.historyOrderId}>Order #{item.orderId.slice(0, 6)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerText}>Loading earnings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Deliveries Yet</Text>
            <Text style={styles.emptySubtitle}>
              When you accept delivery requests and mark them delivered, your ₹20 payouts will appear right here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  headerContainer: {
    paddingTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  screenTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.text,
  },
  screenSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.text,
  },
  statValueGreen: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.green,
  },
  statSubText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  totalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  totalBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBannerLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
  },
  totalBannerSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  totalDeliveriesText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.primary,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  historyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  historyCount: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyStallWrap: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  historyStallName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
  },
  historyHostelName: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  earningBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  earningBadgeText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 13,
    color: '#15803D',
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: Spacing.xs,
  },
  historyCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTime: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textTertiary,
  },
  historyOrderId: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.textTertiary,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
});
