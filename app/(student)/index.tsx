import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import { useCart, formatINR } from '../../context/cart';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
  TouchTarget,
} from '../../constants/theme';

type OutletRow = Database['public']['Tables']['outlets']['Row'];

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'biryani', label: 'Biryani', emoji: '🍗' },
  { id: 'thali', label: 'Thali', emoji: '🍲' },
  { id: 'beverages', label: 'Beverages', emoji: '🧋' },
  { id: 'sides', label: 'Sides', emoji: '🍟' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const { itemCount, subtotal } = useCart();
  const [outlets, setOutlets] = useState<OutletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchOutlets = async () => {
    try {
      const { data, error: err } = await supabase
        .from('outlets')
        .select('*')
        .order('name');

      if (err) throw err;
      setOutlets(data ?? []);
      setError(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load outlets';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOutlets();
  }, []);

  // Filtered outlets based on search query
  const filteredOutlets = outlets.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.location ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group into Food Street and External Vendors
  const foodStreetOutlets = filteredOutlets.filter(
    (o) => (o.location ?? '').toLowerCase().includes('food street')
  );
  const externalOutlets = filteredOutlets.filter(
    (o) => !(o.location ?? '').toLowerCase().includes('food street')
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header: Delivery Location & Cart icon */}
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <View style={styles.locationIconWrap}>
            <Ionicons name="location" size={22} color={Colors.primary} />
          </View>
          <View style={styles.locationTextWrap}>
            <View style={styles.locationTitleRow}>
              <Text style={styles.locationTitle}>VIT-AP University</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.text} />
            </View>
            <Text style={styles.locationSub} numberOfLines={1}>
              Food Street • Campus Central
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.headerCartBtn, Shadows.card]}
          onPress={() => router.push('/(student)/cart')}
          activeOpacity={0.8}
        >
          <Ionicons name="cart-outline" size={20} color={Colors.text} />
          {itemCount > 0 && (
            <View style={styles.headerCartBadge}>
              <Text style={styles.headerCartBadgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          itemCount > 0 && { paddingBottom: 100 },
        ]}
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
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroHeadline}>
              Good food,{'\n'}
              <Text style={styles.heroHighlight}>less waiting.</Text>
            </Text>
            <Text style={styles.heroSub}>
              Order from campus stalls & get it delivered fast.
            </Text>
          </View>
          <View style={styles.heroImageWrap}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&auto=format',
              }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, Shadows.card]}>
          <Ionicons name="search" size={20} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for food stalls or dishes..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  isSelected ? styles.categoryPillActive : styles.categoryPillInactive,
                ]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryText,
                    isSelected ? styles.categoryTextActive : styles.categoryTextInactive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading state */}
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading campus outlets...</Text>
          </View>
        )}

        {/* Error state */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchOutlets}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {!loading && !error && filteredOutlets.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No outlets found</Text>
            <Text style={styles.emptySub}>
              Try searching with a different keyword or pull down to refresh.
            </Text>
          </View>
        )}

        {/* Food Street Section */}
        {!loading && foodStreetOutlets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Food Street</Text>
                <Text style={styles.sectionSub}>On-campus stalls at Food Street</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.outletsHorizontalScroll}
            >
              {foodStreetOutlets.map((outlet) => (
                <TouchableOpacity
                  key={outlet.id}
                  style={[styles.outletCardHorizontal, Shadows.card]}
                  onPress={() => router.push(`/(student)/outlet/${outlet.id}`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.outletImgContainer}>
                    <Image
                      source={{ uri: outlet.image_url ?? 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400' }}
                      style={styles.outletImg}
                    />
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
                    {outlet.eta_text && (
                      <View style={styles.etaChip}>
                        <Ionicons name="time-outline" size={11} color="#FFFFFF" />
                        <Text style={styles.etaChipText}>{outlet.eta_text}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.outletDetails}>
                    <Text style={styles.outletName} numberOfLines={1}>
                      {outlet.name}
                    </Text>
                    <Text style={styles.outletLocation} numberOfLines={1}>
                      {outlet.location ?? 'Campus Stall'}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingText}>
                        {outlet.rating ? outlet.rating.toFixed(1) : '4.5'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* External / Additional Vendors Section */}
        {!loading && (externalOutlets.length > 0 || (foodStreetOutlets.length > 0 && outlets.length > 1)) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>External Vendors</Text>
                <Text style={styles.sectionSub}>Approved campus eateries & stalls</Text>
              </View>
            </View>

            <View style={styles.verticalList}>
              {(externalOutlets.length > 0 ? externalOutlets : outlets).map((outlet) => (
                <TouchableOpacity
                  key={outlet.id}
                  style={[styles.outletCardVertical, Shadows.card]}
                  onPress={() => router.push(`/(student)/outlet/${outlet.id}`)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: outlet.image_url ?? 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400' }}
                    style={styles.outletImgVert}
                  />
                  <View style={styles.outletInfoVert}>
                    <View style={styles.nameStatusRow}>
                      <Text style={styles.outletNameVert}>{outlet.name}</Text>
                      <View
                        style={[
                          styles.openBadgeSmall,
                          outlet.is_open ? styles.badgeOpen : styles.badgeClosed,
                        ]}
                      >
                        <Text style={styles.openBadgeTextSmall}>
                          {outlet.is_open ? 'Open' : 'Closed'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.locationVert} numberOfLines={1}>
                      {outlet.location ?? 'VIT-AP Campus'}
                    </Text>
                    <View style={styles.metaRowVert}>
                      <View style={styles.ratingChipVert}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.ratingTextVert}>
                          {outlet.rating ? outlet.rating.toFixed(1) : '4.3'}
                        </Text>
                      </View>
                      {outlet.eta_text && (
                        <Text style={styles.etaVert}>• {outlet.eta_text}</Text>
                      )}
                      {outlet.open_hours && (
                        <Text style={styles.hoursVert}>• {outlet.open_hours}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Cart Bar (Rendered only when items exist in cart) */}
      {itemCount > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity
            style={[styles.floatingCartBar, Shadows.floating]}
            onPress={() => router.push('/(student)/cart')}
            activeOpacity={0.9}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBarIconWrap}>
                <Ionicons name="cart" size={20} color="#FFFFFF" />
                <View style={styles.cartBarBadge}>
                  <Text style={styles.cartBarBadgeText}>{itemCount}</Text>
                </View>
              </View>
              <View style={styles.cartBarTextWrap}>
                <Text style={styles.cartBarTitle}>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
                </Text>
                <Text style={styles.cartBarSub}>Ready to order</Text>
              </View>
            </View>

            <View style={styles.cartBarRight}>
              <Text style={styles.cartBarPrice}>{formatINR(subtotal)}</Text>
              <View style={styles.cartBarCtaBtn}>
                <Text style={styles.cartBarCtaText}>View Cart</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIconWrap: {
    marginRight: Spacing.xs,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  locationSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  headerCartBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerCartBadgeText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  heroBanner: {
    borderRadius: Radii.xl,
    backgroundColor: '#FFEADD',
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FED7AA',
    minHeight: 130,
    marginBottom: Spacing.md,
  },
  heroContent: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  heroHeadline: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.text,
    lineHeight: 26,
  },
  heroHighlight: {
    color: Colors.primary,
  },
  heroSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  heroImageWrap: {
    width: 95,
    height: 95,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.text,
  },
  categoryScroll: {
    marginBottom: Spacing.md,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryPillInactive: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryTextInactive: {
    color: Colors.text,
  },
  centerContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  errorContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  retryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  emptyContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.text,
  },
  sectionSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  outletsHorizontalScroll: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingRight: Spacing.md,
    paddingVertical: 4,
  },
  outletCardHorizontal: {
    width: 170,
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outletImgContainer: {
    width: '100%',
    height: 110,
    position: 'relative',
  },
  outletImg: {
    width: '100%',
    height: '100%',
  },
  openBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  badgeOpen: {
    backgroundColor: 'rgba(22, 101, 52, 0.9)',
  },
  badgeClosed: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
  },
  openBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  etaChip: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  etaChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: '#FFFFFF',
  },
  outletDetails: {
    padding: Spacing.sm,
  },
  outletName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
  },
  outletLocation: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  ratingText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.text,
  },
  verticalList: {
    gap: Spacing.sm,
  },
  outletCardVertical: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  outletImgVert: {
    width: 80,
    height: 80,
    borderRadius: Radii.md,
  },
  outletInfoVert: {
    flex: 1,
    justifyContent: 'center',
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outletNameVert: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  openBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  openBadgeTextSmall: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#FFFFFF',
  },
  locationVert: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metaRowVert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingChipVert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingTextVert: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.text,
  },
  etaVert: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  hoursVert: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 88 : 72,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 99,
  },
  floatingCartBar: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cartBarIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBarBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cartBarBadgeText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 10,
    color: Colors.primary,
  },
  cartBarTextWrap: {
    justifyContent: 'center',
  },
  cartBarTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
  cartBarSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cartBarPrice: {
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  cartBarCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  cartBarCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
});
