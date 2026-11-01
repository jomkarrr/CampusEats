import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { Database } from '../../../lib/database.types';
import { useCart, formatINR } from '../../../context/cart';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
  TouchTarget,
} from '../../../constants/theme';

type OutletRow = Database['public']['Tables']['outlets']['Row'];
type MenuItemRow = Database['public']['Tables']['menu_items']['Row'];

export default function OutletDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { itemCount, subtotal, addItem, removeItem, getItemQty } = useCart();

  const [outlet, setOutlet] = useState<OutletRow | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchOutletAndMenu = async () => {
      try {
        setLoading(true);
        // Fetch outlet details
        const { data: outletData, error: outletErr } = await supabase
          .from('outlets')
          .select('*')
          .eq('id', id)
          .single();

        if (outletErr) throw outletErr;
        setOutlet(outletData);

        // Fetch menu items for this outlet
        const { data: itemsData, error: itemsErr } = await supabase
          .from('menu_items')
          .select('*')
          .eq('outlet_id', id)
          .order('name');

        if (itemsErr) throw itemsErr;
        setMenuItems(itemsData ?? []);
        setError(null);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load menu';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchOutletAndMenu();
  }, [id]);

  // Extract distinct categories from menu items
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['All', ...Array.from(set)];
  }, [menuItems]);

  // Filter items by selected category
  const filteredItems = React.useMemo(() => {
    if (selectedCategory === 'All') return menuItems;
    return menuItems.filter((item) => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading stall & menu...</Text>
      </View>
    );
  }

  if (error || !outlet) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorText}>{error ?? 'Outlet not found'}</Text>
        <TouchableOpacity style={styles.backBtnPill} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnPillText}>Back to Explore</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Scrollable body */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          itemCount > 0 && { paddingBottom: 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image & Top Nav Actions */}
        <View style={styles.heroContainer}>
          <Image
            source={{
              uri:
                outlet.image_url ??
                'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
            }}
            style={styles.heroImg}
          />
          <View style={styles.heroGradient} />

          {/* Floating Back and Heart Buttons */}
          <SafeAreaView edges={['top']} style={styles.heroNavRow}>
            <TouchableOpacity
              style={styles.circleActionBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleActionBtn}
              onPress={() => setIsFavorite(!isFavorite)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? Colors.error : Colors.primary}
              />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Stall Profile Section */}
        <View style={styles.profileSheet}>
          {/* Overlapping Avatar */}
          <View style={[styles.avatarWrap, Shadows.floating]}>
            <Text style={styles.avatarEmoji}>
              {outlet.name.toLowerCase().includes('pizza')
                ? '🍕'
                : outlet.name.toLowerCase().includes('spice')
                ? '🌶️'
                : '🍔'}
            </Text>
          </View>

          {/* Title & Metadata */}
          <Text style={styles.stallTitle}>{outlet.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={Colors.textSecondary} />
            <Text style={styles.locationText}>{outlet.location ?? 'Campus Stall'}</Text>
          </View>

          {/* Rating & ETA */}
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingNum}>
                {outlet.rating ? outlet.rating.toFixed(1) : '4.5'}
              </Text>
              <Text style={styles.reviewCount}>(320+)</Text>
            </View>
            <Text style={styles.metaDivider}>|</Text>
            {outlet.eta_text && (
              <View style={styles.etaRow}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.etaText}>{outlet.eta_text} (pickup)</Text>
              </View>
            )}
          </View>

          {/* Operating Status & Timing Pills */}
          <View style={styles.statusPillsRow}>
            <View
              style={[
                styles.openStatusPill,
                outlet.is_open ? styles.pillOpenBg : styles.pillClosedBg,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  outlet.is_open ? styles.dotOpen : styles.dotClosed,
                ]}
              />
              <Text
                style={[
                  styles.statusPillText,
                  outlet.is_open ? styles.textOpen : styles.textClosed,
                ]}
              >
                {outlet.is_open ? 'Open' : 'Closed'}
              </Text>
            </View>

            {outlet.open_hours && (
              <View style={styles.hoursPill}>
                <Ionicons name="alarm-outline" size={13} color="#B45309" />
                <Text style={styles.hoursPillText}>{outlet.open_hours}</Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.horizontalDivider} />

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catFilterPill,
                    isSelected ? styles.catPillActive : styles.catPillInactive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.catFilterText,
                      isSelected ? styles.catTextActive : styles.catTextInactive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Menu Items List */}
          <View style={styles.menuList}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyMenu}>
                <Text style={styles.emptyMenuText}>
                  No items available in this category.
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => {
                const qty = getItemQty(item.id);
                return (
                  <View key={item.id} style={styles.foodCell}>
                    {/* Left: Title, Price, Description, Veg Tag */}
                    <View style={styles.foodInfo}>
                      <View style={styles.foodTitleRow}>
                        {/* Veg / Non-Veg square tag */}
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
                        <Text style={styles.foodName}>{item.name}</Text>
                      </View>

                      <Text style={styles.foodPrice}>{formatINR(item.price)}</Text>

                      {item.description && (
                        <Text style={styles.foodDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}

                      <View style={styles.availabilityRow}>
                        <View
                          style={[
                            styles.availBadge,
                            item.is_available
                              ? styles.availBadgeGreen
                              : styles.availBadgeRed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.availBadgeText,
                              item.is_available
                                ? styles.availTextGreen
                                : styles.availTextRed,
                            ]}
                          >
                            {item.is_available ? 'Available' : 'Out of stock'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Right: 96px Image + Stepper */}
                    <View style={styles.foodRight}>
                      <Image
                        source={{
                          uri:
                            item.image_url ??
                            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300',
                        }}
                        style={[
                          styles.foodImage,
                          !item.is_available && styles.foodImageDisabled,
                        ]}
                      />

                      {/* Stepper or Add button */}
                      {item.is_available ? (
                        qty === 0 ? (
                          <TouchableOpacity
                            style={[styles.addBtnPill, Shadows.card]}
                            onPress={() => addItem(item, outlet.id, outlet.name)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.addBtnText}>+ ADD</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.stepperContainer, Shadows.card]}>
                            <TouchableOpacity
                              style={styles.stepperMinus}
                              onPress={() => removeItem(item.id)}
                            >
                              <Text style={styles.stepperMinusText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.stepperQtyText}>{qty}</Text>
                            <TouchableOpacity
                              style={styles.stepperPlus}
                              onPress={() => addItem(item, outlet.id, outlet.name)}
                            >
                              <Text style={styles.stepperPlusText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        )
                      ) : (
                        <View style={styles.stepperDisabled}>
                          <Text style={styles.stepperDisabledText}>Unavailable</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Sticky Cart Bar (Shown when cart has items) */}
      {itemCount > 0 && (
        <SafeAreaView edges={['bottom']} style={styles.floatingCartWrap}>
          <TouchableOpacity
            style={[styles.cartBarBtn, Shadows.floating]}
            onPress={() => router.push('/(student)/cart')}
            activeOpacity={0.9}
          >
            {/* Left: Cart Icon with Badge & View Cart */}
            <View style={styles.cartBarLeft}>
              <View style={styles.cartBarIconContainer}>
                <Ionicons name="cart" size={22} color="#FFFFFF" />
                <View style={styles.cartBadgeCircle}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              </View>
              <Text style={styles.cartBarCtaTitle}>View Cart</Text>
            </View>

            {/* Right: Subtotal with Arrow */}
            <View style={styles.cartBarRight}>
              <Text style={styles.cartBarSubtotal}>{formatINR(subtotal)}</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerScreen: {
    flex: 1,
    backgroundColor: Colors.background,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  heroContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  heroNavRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.md : 0,
    zIndex: 10,
  },
  circleActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  profileSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    marginTop: -28,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.card,
    borderWidth: 3,
    borderColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -44,
    alignSelf: 'flex-start',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  stallTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  locationText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingNum: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
  },
  reviewCount: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textTertiary,
  },
  metaDivider: {
    color: Colors.border,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  etaText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  openStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  pillOpenBg: {
    backgroundColor: 'rgba(22, 101, 52, 0.1)',
  },
  pillClosedBg: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOpen: {
    backgroundColor: '#16A34A',
  },
  dotClosed: {
    backgroundColor: '#DC2626',
  },
  statusPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  textOpen: {
    color: '#16A34A',
  },
  textClosed: {
    color: '#DC2626',
  },
  hoursPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: '#FEF3C7',
  },
  hoursPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#B45309',
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  catFilterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    marginRight: Spacing.xs,
  },
  catPillActive: {
    backgroundColor: Colors.primary,
  },
  catPillInactive: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catFilterText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  catTextInactive: {
    color: Colors.text,
  },
  menuList: {
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  emptyMenu: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyMenuText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  foodCell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  foodInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  foodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dietBadge: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dietDotVeg: {
    backgroundColor: '#16A34A',
  },
  dietDotNonVeg: {
    backgroundColor: '#DC2626',
  },
  foodName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  foodPrice: {
    fontFamily: FontFamily.extraBold,
    fontSize: 14,
    color: Colors.primary,
    marginTop: 3,
  },
  foodDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  availabilityRow: {
    marginTop: 6,
  },
  availBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  availBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  availBadgeRed: {
    backgroundColor: '#FEE2E2',
  },
  availBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
  },
  availTextGreen: {
    color: '#15803D',
  },
  availTextRed: {
    color: '#B91C1C',
  },
  foodRight: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foodImage: {
    width: 88,
    height: 88,
    borderRadius: Radii.md,
    backgroundColor: '#E2E8F0',
  },
  foodImageDisabled: {
    opacity: 0.5,
  },
  addBtnPill: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    marginTop: -16,
  },
  addBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radii.pill,
    marginTop: -16,
    overflow: 'hidden',
  },
  stepperMinus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepperMinusText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.primary,
  },
  stepperQtyText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
    minWidth: 16,
    textAlign: 'center',
  },
  stepperPlus: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepperPlusText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  stepperDisabled: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    marginTop: -12,
  },
  stepperDisabledText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.textTertiary,
  },
  floatingCartWrap: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 99,
  },
  cartBarBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    height: 56,
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
  cartBarIconContainer: {
    position: 'relative',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeCircle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EA580C',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cartBadgeText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 9,
    color: '#FFFFFF',
  },
  cartBarCtaTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.25)',
    paddingLeft: Spacing.sm,
  },
  cartBarSubtotal: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
