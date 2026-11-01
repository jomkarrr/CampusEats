import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { formatINR } from '../../context/cart';
import { Database } from '../../lib/database.types';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
} from '../../constants/theme';

type OutletRow = Database['public']['Tables']['outlets']['Row'];
type MenuItemRow = Database['public']['Tables']['menu_items']['Row'];

interface MenuItemWithOutlet extends MenuItemRow {
  outlet_name?: string;
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [popularItems, setPopularItems] = useState<MenuItemWithOutlet[]>([]);
  const [matchingOutlets, setMatchingOutlets] = useState<OutletRow[]>([]);
  const [matchingDishes, setMatchingDishes] = useState<MenuItemWithOutlet[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch "Popular right now" (6 available items) on mount
  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const { data: items, error: itemsErr } = await supabase
          .from('menu_items')
          .select('*')
          .eq('is_available', true)
          .limit(6);

        if (itemsErr) throw itemsErr;
        if (!items || items.length === 0) return;

        // Fetch outlet names for these items
        const outletIds = Array.from(new Set(items.map((i) => i.outlet_id)));
        const { data: outlets } = await supabase
          .from('outlets')
          .select('id, name')
          .in('id', outletIds);

        const outMap = new Map<string, string>();
        outlets?.forEach((o) => outMap.set(o.id, o.name));

        const populated: MenuItemWithOutlet[] = items.map((i) => ({
          ...i,
          outlet_name: outMap.get(i.outlet_id) ?? 'Campus Stall',
        }));
        setPopularItems(populated);
      } catch {
        // silent fail for initial popular preview
      }
    };

    fetchPopular();
  }, []);

  // Search logic with Supabase query
  const executeSearch = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setMatchingOutlets([]);
      setMatchingDishes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Search outlets
      const { data: outletsData } = await supabase
        .from('outlets')
        .select('*')
        .ilike('name', `%${trimmed}%`)
        .limit(6);

      setMatchingOutlets(outletsData ?? []);

      // 2. Search menu items
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*')
        .ilike('name', `%${trimmed}%`)
        .eq('is_available', true)
        .limit(10);

      if (itemsData && itemsData.length > 0) {
        const outletIds = Array.from(new Set(itemsData.map((i) => i.outlet_id)));
        const { data: outlets } = await supabase
          .from('outlets')
          .select('id, name')
          .in('id', outletIds);

        const outMap = new Map<string, string>();
        outlets?.forEach((o) => outMap.set(o.id, o.name));

        const populatedDishes: MenuItemWithOutlet[] = itemsData.map((i) => ({
          ...i,
          outlet_name: outMap.get(i.outlet_id) ?? 'Campus Stall',
        }));
        setMatchingDishes(populatedDishes);
      } else {
        setMatchingDishes([]);
      }
    } catch {
      // Handle error gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  // 300ms debounce
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (!text.trim()) {
      setMatchingOutlets([]);
      setMatchingDishes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceTimer.current = setTimeout(() => {
      executeSearch(text);
    }, 300);
  };

  const isQueryActive = query.trim().length > 0;
  const hasNoResults =
    isQueryActive &&
    !loading &&
    matchingOutlets.length === 0 &&
    matchingDishes.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Search Bar */}
      <View style={styles.header}>
        <View style={[styles.searchBar, Shadows.card]}>
          <Ionicons name="search" size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stalls, pizzas, biryani, chai..."
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={handleQueryChange}
            autoFocus={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleQueryChange('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Loading Indicator */}
        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Searching campus menus...</Text>
          </View>
        )}

        {/* No Results Empty State */}
        {hasNoResults && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyCircle}>
              <Ionicons name="search-outline" size={40} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptySub}>
              We couldn&apos;t find any stalls or dishes matching &quot;{query}&quot;. Try searching for &quot;Pizza&quot; or &quot;Spice Hub&quot;.
            </Text>
          </View>
        )}

        {/* Outlets Results Section */}
        {!loading && matchingOutlets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Outlets ({matchingOutlets.length})
            </Text>
            <View style={styles.outletsList}>
              {matchingOutlets.map((outlet) => (
                <TouchableOpacity
                  key={outlet.id}
                  style={[styles.outletCard, Shadows.card]}
                  onPress={() => router.push(`/(student)/outlet/${outlet.id}`)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{
                      uri:
                        outlet.image_url ??
                        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300',
                    }}
                    style={styles.outletThumb}
                  />
                  <View style={styles.outletInfo}>
                    <View style={styles.outletTitleRow}>
                      <Text style={styles.outletName}>{outlet.name}</Text>
                      <View
                        style={[
                          styles.openBadge,
                          outlet.is_open ? styles.badgeOpen : styles.badgeClosed,
                        ]}
                      >
                        <Text style={styles.openBadgeText}>
                          {outlet.is_open ? 'Open' : 'Closed'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.outletLocation} numberOfLines={1}>
                      {outlet.location ?? 'Campus Food Street'}
                    </Text>
                    <View style={styles.outletMetaRow}>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.ratingText}>
                          {outlet.rating ? outlet.rating.toFixed(1) : '4.5'}
                        </Text>
                      </View>
                      {outlet.eta_text && (
                        <Text style={styles.etaText}>• {outlet.eta_text}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Dishes Results Section */}
        {!loading && matchingDishes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Dishes ({matchingDishes.length})
            </Text>
            <View style={styles.dishesList}>
              {matchingDishes.map((dish) => (
                <TouchableOpacity
                  key={dish.id}
                  style={[styles.dishCard, Shadows.card]}
                  onPress={() => router.push(`/(student)/outlet/${dish.outlet_id}`)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{
                      uri:
                        dish.image_url ??
                        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200',
                    }}
                    style={styles.dishThumb}
                  />
                  <View style={styles.dishInfo}>
                    <View style={styles.dishTitleRow}>
                      <View
                        style={[
                          styles.dietBadge,
                          dish.is_veg ? styles.dietVeg : styles.dietNonVeg,
                        ]}
                      >
                        <View
                          style={[
                            styles.dietDot,
                            dish.is_veg ? styles.dietDotVeg : styles.dietDotNonVeg,
                          ]}
                        />
                      </View>
                      <Text style={styles.dishName} numberOfLines={1}>
                        {dish.name}
                      </Text>
                    </View>
                    <Text style={styles.dishOutlet} numberOfLines={1}>
                      from {dish.outlet_name}
                    </Text>
                    <Text style={styles.dishPrice}>{formatINR(dish.price)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Default / Popular Right Now (When query is empty) */}
        {!isQueryActive && popularItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.popularHeader}>
              <Text style={styles.popularFireEmoji}>🔥</Text>
              <Text style={styles.sectionTitle}>Popular Right Now</Text>
            </View>
            <Text style={styles.popularSub}>
              Most ordered dishes on campus today
            </Text>

            <View style={styles.popularGrid}>
              {popularItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.popularCard, Shadows.card]}
                  onPress={() => router.push(`/(student)/outlet/${item.outlet_id}`)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{
                      uri:
                        item.image_url ??
                        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300',
                    }}
                    style={styles.popularImg}
                  />
                  <View style={styles.popularDetails}>
                    <View style={styles.popularTitleRow}>
                      <View
                        style={[
                          styles.dietBadge,
                          item.is_veg ? styles.dietVeg : styles.dietNonVeg,
                        ]}
                      >
                        <View
                          style={[
                            styles.dietDot,
                            item.is_veg ? styles.dietDotVeg : styles.dietDotNonVeg,
                          ]}
                        />
                      </View>
                      <Text style={styles.popularItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <Text style={styles.popularOutlet} numberOfLines={1}>
                      {item.outlet_name}
                    </Text>
                    <Text style={styles.popularPrice}>
                      {formatINR(item.price)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.pill,
    height: 48,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  centerBox: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyBox: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  popularHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularFireEmoji: {
    fontSize: 16,
  },
  popularSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  outletsList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  outletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  outletThumb: {
    width: 68,
    height: 68,
    borderRadius: Radii.md,
    backgroundColor: '#F1F5F9',
  },
  outletInfo: {
    flex: 1,
  },
  outletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outletName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
  },
  openBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  badgeOpen: {
    backgroundColor: '#DCFCE7',
  },
  badgeClosed: {
    backgroundColor: '#FEE2E2',
  },
  openBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#166534',
  },
  outletLocation: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  outletMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.text,
  },
  etaText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  dishesList: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  dishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  dishThumb: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    backgroundColor: '#F1F5F9',
  },
  dishInfo: {
    flex: 1,
  },
  dishTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dishName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  dishOutlet: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  dishPrice: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  dietBadge: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  dietVeg: {
    borderColor: '#16A34A',
  },
  dietNonVeg: {
    borderColor: '#DC2626',
  },
  dietDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dietDotVeg: {
    backgroundColor: '#16A34A',
  },
  dietDotNonVeg: {
    backgroundColor: '#DC2626',
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  popularCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  popularImg: {
    width: '100%',
    height: 90,
    backgroundColor: '#F1F5F9',
  },
  popularDetails: {
    padding: Spacing.sm,
  },
  popularTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularItemName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  popularOutlet: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  popularPrice: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
  },
});
