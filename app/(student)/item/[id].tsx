import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
} from '../../../constants/theme';

type MenuItemRow = Database['public']['Tables']['menu_items']['Row'];
type OutletRow = Database['public']['Tables']['outlets']['Row'];

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addItemQty } = useCart();

  const [item, setItem] = useState<MenuItemRow | null>(null);
  const [outlet, setOutlet] = useState<OutletRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    async function loadItemAndOutlet() {
      try {
        setLoading(true);
        setError(null);

        // Fetch menu item
        const { data: itemData, error: itemError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('id', id)
          .single();

        if (itemError || !itemData) {
          throw new Error(itemError?.message ?? 'Menu item not found');
        }

        if (isMounted) setItem(itemData);

        // Fetch outlet
        if (itemData.outlet_id) {
          const { data: outletData, error: outletError } = await supabase
            .from('outlets')
            .select('*')
            .eq('id', itemData.outlet_id)
            .single();

          if (!outletError && outletData && isMounted) {
            setOutlet(outletData);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load item details');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadItemAndOutlet();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleAddToCart = () => {
    if (!item || !outlet) return;
    addItemQty(item, outlet.id, outlet.name, qty, () => {
      router.push('/(student)/cart' as any);
    });
  };

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>Item Unavailable</Text>
        <Text style={styles.errorText}>{error ?? 'Could not find this item.'}</Text>
        <TouchableOpacity style={styles.backBtnPill} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnPillText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalPrice = item.price * qty;

  return (
    <View style={styles.container}>
      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroWrap}>
          <Image
            source={{
              uri:
                item.image_url ??
                'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800',
            }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />

          {/* Floating Back Button */}
          <SafeAreaView edges={['top']} style={styles.heroNav}>
            <TouchableOpacity
              style={[styles.floatingCircleBtn, Shadows.card]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Content Card */}
        <View style={styles.bodyCard}>
          {/* Outlet Info Header */}
          {outlet && (
            <TouchableOpacity
              style={styles.outletHeaderRow}
              onPress={() => router.push(`/(student)/outlet/${outlet.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.outletIconCircle}>
                <Ionicons name="storefront-outline" size={14} color={Colors.primary} />
              </View>
              <View style={styles.outletHeaderTextWrap}>
                <Text style={styles.outletName}>{outlet.name}</Text>
                <Text style={styles.outletLocation}>{outlet.location ?? 'Campus Stall'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Veg / Non-Veg Badge + Availability */}
          <View style={styles.tagsRow}>
            <View
              style={[
                styles.dietBadge,
                item.is_veg ? styles.dietBadgeVeg : styles.dietBadgeNonVeg,
              ]}
            >
              <View
                style={[
                  styles.dietDot,
                  item.is_veg ? styles.dietDotVeg : styles.dietDotNonVeg,
                ]}
              />
              <Text
                style={[
                  styles.dietBadgeText,
                  item.is_veg ? styles.dietTextVeg : styles.dietTextNonVeg,
                ]}
              >
                {item.is_veg ? 'Pure Veg' : 'Non-Veg'}
              </Text>
            </View>

            {item.category && (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{item.category}</Text>
              </View>
            )}

            <View
              style={[
                styles.availPill,
                item.is_available ? styles.availPillGreen : styles.availPillRed,
              ]}
            >
              <View
                style={[
                  styles.availDot,
                  item.is_available ? styles.availDotGreen : styles.availDotRed,
                ]}
              />
              <Text
                style={[
                  styles.availPillText,
                  item.is_available ? styles.availTextGreen : styles.availTextRed,
                ]}
              >
                {item.is_available ? 'In Stock' : 'Sold Out'}
              </Text>
            </View>
          </View>

          {/* Title & Price */}
          <Text style={styles.title}>{item.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatINR(item.price)}</Text>
            <Text style={styles.priceUnit}>per item</Text>
          </View>

          {/* Description */}
          {item.description ? (
            <View style={styles.descBlock}>
              <Text style={styles.sectionHeading}>Description</Text>
              <Text style={styles.descText}>{item.description}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <View style={styles.quantityHeaderRow}>
              <Text style={styles.sectionHeading}>Select Quantity</Text>
              <Text style={styles.quantitySubtext}>
                {formatINR(item.price)} × {qty} = {formatINR(totalPrice)}
              </Text>
            </View>

            <View style={styles.stepperWrap}>
              <TouchableOpacity
                style={[styles.stepperBtn, qty <= 1 && styles.stepperBtnDisabled]}
                onPress={() => setQty((prev) => Math.max(1, prev - 1))}
                disabled={qty <= 1}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={qty <= 1 ? Colors.textTertiary : Colors.text}
                />
              </TouchableOpacity>

              <View style={styles.qtyDisplay}>
                <Text style={styles.qtyText}>{qty}</Text>
              </View>

              <TouchableOpacity
                style={[styles.stepperBtn, qty >= 20 && styles.stepperBtnDisabled]}
                onPress={() => setQty((prev) => Math.min(20, prev + 1))}
                disabled={qty >= 20}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={qty >= 20 ? Colors.textTertiary : Colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Honest Payment / Campus Note */}
          <View style={styles.paymentInfoBox}>
            <View style={styles.paymentIconRow}>
              <Ionicons name="card-outline" size={18} color={Colors.primary} />
              <Text style={styles.paymentInfoTitle}>Pay on Pickup or Delivery</Text>
            </View>
            <Text style={styles.paymentInfoBody}>
              Pay directly via UPI or Cash when you pick up your order or when it arrives at your hostel room. No platform markup or convenience fees!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <SafeAreaView edges={['bottom']} style={[styles.bottomBar, Shadows.floating]}>
        <View style={styles.bottomPriceWrap}>
          <Text style={styles.bottomPriceLabel}>Total Amount</Text>
          <Text style={styles.bottomPriceValue}>{formatINR(totalPrice)}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.addToCartBtn,
            Shadows.cta,
            (!item.is_available || !outlet) && styles.addToCartBtnDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={!item.is_available || !outlet}
          activeOpacity={0.9}
        >
          <Ionicons name="cart" size={18} color="#FFFFFF" />
          <Text style={styles.addToCartBtnText}>
            Add to Cart • {formatINR(totalPrice)}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
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
    marginTop: Spacing.md,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radii.pill,
  },
  backBtnPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  heroWrap: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: Colors.inputBg,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  heroNav: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  floatingCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...Shadows.card,
  },
  outletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  outletIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outletHeaderTextWrap: {
    flex: 1,
  },
  outletName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
  },
  outletLocation: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  dietBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  dietBadgeVeg: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  dietBadgeNonVeg: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  dietDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dietDotVeg: {
    backgroundColor: Colors.green,
  },
  dietDotNonVeg: {
    backgroundColor: Colors.error,
  },
  dietBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  dietTextVeg: {
    color: Colors.green,
  },
  dietTextNonVeg: {
    color: Colors.error,
  },
  categoryPill: {
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  categoryPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  availPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  availPillGreen: {
    backgroundColor: '#DCFCE7',
  },
  availPillRed: {
    backgroundColor: '#FEE2E2',
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availDotGreen: {
    backgroundColor: '#166534',
  },
  availDotRed: {
    backgroundColor: '#DC2626',
  },
  availPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  availTextGreen: {
    color: '#166534',
  },
  availTextRed: {
    color: '#DC2626',
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.text,
    lineHeight: 28,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
    marginBottom: Spacing.md,
  },
  price: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.primary,
  },
  priceUnit: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textTertiary,
  },
  descBlock: {
    marginBottom: Spacing.md,
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  descText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  quantitySection: {
    marginVertical: 4,
  },
  quantityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quantitySubtext: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: Radii.lg,
    padding: 6,
    alignSelf: 'flex-start',
    gap: Spacing.md,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  stepperBtnDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  qtyDisplay: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
  },
  paymentInfoBox: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: 6,
    marginTop: Spacing.xs,
  },
  paymentIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentInfoTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
  },
  paymentInfoBody: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 12 : Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  bottomPriceWrap: {
    flexShrink: 1,
  },
  bottomPriceLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textTertiary,
  },
  bottomPriceValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.primary,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Radii.pill,
  },
  addToCartBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  addToCartBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
