import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart, formatINR } from '../../context/cart';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
  TouchTarget,
} from '../../constants/theme';

export default function CartScreen() {
  const router = useRouter();
  const { items, outletName, subtotal, itemCount, addItem, removeItem, clearCart } =
    useCart();

  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('delivery');

  const deliveryFee = fulfillment === 'delivery' ? 20 : 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Explore food stalls on campus and add tasty meals to your cart.
          </Text>
          <TouchableOpacity
            style={[styles.browseBtn, Shadows.cta]}
            onPress={() => router.push('/(student)')}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>Explore Stalls</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Your Cart</Text>
        <TouchableOpacity onPress={clearCart} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stall Order Card Banner */}
        <View style={styles.stallBanner}>
          <View style={styles.stallBannerLeft}>
            <View style={styles.stallIconBox}>
              <Ionicons name="storefront" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.stallInfoText}>
              <Text style={styles.stallBannerTitle}>
                {outletName ?? 'Food Street Order'}
              </Text>
              <Text style={styles.stallBannerSub}>
                VIT-AP Campus • Food Street
              </Text>
            </View>
          </View>
          <View style={styles.campusTag}>
            <Ionicons name="location" size={12} color={Colors.primary} />
            <Text style={styles.campusTagText}>VIT-AP</Text>
          </View>
        </View>

        {/* Cart Items List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your items ({itemCount})</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.addMoreBtn}
          >
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={styles.addMoreText}>Add more</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemsCard}>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <View
                key={item.menuItem.id}
                style={[styles.itemRow, !isLast && styles.itemRowBorder]}
              >
                <Image
                  source={{
                    uri:
                      item.menuItem.image_url ??
                      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200',
                  }}
                  style={styles.itemImg}
                />
                <View style={styles.itemInfo}>
                  <View style={styles.itemTitleRow}>
                    {/* Veg indicator badge */}
                    <View
                      style={[
                        styles.dietBadge,
                        item.menuItem.is_veg ? styles.dietVeg : styles.dietNonVeg,
                      ]}
                    >
                      <View
                        style={[
                          styles.dietDot,
                          item.menuItem.is_veg
                            ? styles.dietDotVeg
                            : styles.dietDotNonVeg,
                        ]}
                      />
                    </View>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.menuItem.name}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {formatINR(item.menuItem.price)}
                  </Text>
                </View>

                {/* Stepper & Delete */}
                <View style={styles.actionsRow}>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => removeItem(item.menuItem.id)}
                    >
                      <Text style={styles.stepperMinusText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperQty}>{item.qty}</Text>
                    <TouchableOpacity
                      style={[styles.stepperBtn, styles.stepperBtnPlus]}
                      onPress={() =>
                        addItem(item.menuItem, item.outletId, item.outletName)
                      }
                    >
                      <Text style={styles.stepperPlusText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => removeItem(item.menuItem.id)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Fulfillment Selector */}
        <View style={styles.fulfillmentSection}>
          <Text style={styles.fulfillmentTitle}>
            How would you like to receive your order?
          </Text>

          <View style={styles.fulfillmentOptionsRow}>
            {/* Self Pickup */}
            <TouchableOpacity
              style={[
                styles.fulfillmentCard,
                fulfillment === 'pickup'
                  ? styles.fulfillmentCardActive
                  : styles.fulfillmentCardInactive,
              ]}
              onPress={() => setFulfillment('pickup')}
              activeOpacity={0.85}
            >
              <View style={styles.fulfillmentCardTop}>
                <View
                  style={[
                    styles.radioCircle,
                    fulfillment === 'pickup' && styles.radioCircleActive,
                  ]}
                >
                  {fulfillment === 'pickup' && <View style={styles.radioInnerDot} />}
                </View>
                <View style={styles.fulfillmentIconWrap}>
                  <Ionicons name="walk-outline" size={20} color={Colors.primary} />
                </View>
              </View>
              <View style={styles.fulfillmentCardBottom}>
                <Text style={styles.fulfillmentName}>Self Pickup</Text>
                <Text style={styles.fulfillmentDesc}>Collect at stall</Text>
                <Text style={styles.fulfillmentFree}>Free</Text>
              </View>
            </TouchableOpacity>

            {/* Campus Eats Delivery */}
            <TouchableOpacity
              style={[
                styles.fulfillmentCard,
                fulfillment === 'delivery'
                  ? styles.fulfillmentCardActive
                  : styles.fulfillmentCardInactive,
              ]}
              onPress={() => setFulfillment('delivery')}
              activeOpacity={0.85}
            >
              <View style={styles.fulfillmentCardTop}>
                <View
                  style={[
                    styles.radioCircle,
                    fulfillment === 'delivery' && styles.radioCircleActive,
                  ]}
                >
                  {fulfillment === 'delivery' && (
                    <View style={styles.radioInnerDot} />
                  )}
                </View>
                <View style={styles.fulfillmentIconWrap}>
                  <Ionicons name="bicycle-outline" size={20} color={Colors.primary} />
                </View>
              </View>
              <View style={styles.fulfillmentCardBottom}>
                <Text style={styles.fulfillmentName}>Campus Delivery</Text>
                <Text style={styles.fulfillmentDesc}>To your hostel block</Text>
                <Text style={styles.fulfillmentCharge}>₹20 charge</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Delivery destination hint */}
          {fulfillment === 'delivery' && (
            <View style={styles.destinationHintRow}>
              <Ionicons name="business-outline" size={16} color={Colors.primary} />
              <Text style={styles.destinationHintText}>
                Deliver to: <Text style={styles.destinationBold}>Hostel MH1 / Block B</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Bill Summary */}
        <View style={[styles.billCard, Shadows.card]}>
          <Text style={styles.billTitle}>Bill Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Subtotal</Text>
            <Text style={styles.billValue}>{formatINR(subtotal)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Delivery Fee {fulfillment === 'pickup' && '(Self Pickup)'}
            </Text>
            <Text
              style={[
                styles.billValue,
                deliveryFee === 0 && styles.billValueFree,
              ]}
            >
              {deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}
            </Text>
          </View>

          <View style={styles.billDivider} />

          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>Total to pay</Text>
            <Text style={styles.billTotalValue}>{formatINR(total)}</Text>
          </View>

          {/* Prepaid Notice Pill */}
          <View style={styles.prepaidNotice}>
            <Ionicons name="information-circle" size={16} color={Colors.primary} />
            <Text style={styles.prepaidText}>
              Prepaid orders only via UPI / Cards.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Checkout Footer */}
      <SafeAreaView edges={['bottom']} style={styles.footerWrap}>
        <TouchableOpacity
          style={[styles.checkoutBtn, Shadows.cta]}
          onPress={() =>
            router.push({
              pathname: '/(student)/checkout',
              params: { fulfillment },
            })
          }
          activeOpacity={0.88}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: Spacing.xl,
    maxWidth: 260,
  },
  browseBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radii.pill,
  },
  browseBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
  },
  clearBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  clearBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  stallBanner: {
    backgroundColor: '#FFEADD',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: Spacing.md,
  },
  stallBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stallIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stallInfoText: {
    justifyContent: 'center',
  },
  stallBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  stallBannerSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  campusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  campusTagText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  addMoreText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  itemsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemImg: {
    width: 52,
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: '#F1F5F9',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  itemName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  itemPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
    marginTop: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.card,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnPlus: {
    backgroundColor: Colors.primary,
  },
  stepperMinusText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  stepperPlusText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  stepperQty: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.text,
    paddingHorizontal: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  fulfillmentSection: {
    marginBottom: Spacing.lg,
  },
  fulfillmentTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  fulfillmentOptionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fulfillmentCard: {
    flex: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    justifyContent: 'space-between',
    minHeight: 110,
    borderWidth: 2,
  },
  fulfillmentCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  fulfillmentCardInactive: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
  },
  fulfillmentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleActive: {
    borderColor: '#16A34A',
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  fulfillmentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fulfillmentCardBottom: {
    marginTop: Spacing.sm,
  },
  fulfillmentName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
  },
  fulfillmentDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  fulfillmentFree: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#16A34A',
    marginTop: 4,
  },
  fulfillmentCharge: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.text,
    marginTop: 4,
  },
  destinationHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  destinationHintText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  destinationBold: {
    fontFamily: FontFamily.bold,
    color: Colors.text,
  },
  billCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  billTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  billValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  billValueFree: {
    color: '#16A34A',
    fontFamily: FontFamily.bold,
  },
  billDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  billTotalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
  },
  billTotalValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.primary,
  },
  prepaidNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  prepaidText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: '#9A3412',
  },
  footerWrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'android' ? Spacing.md : Spacing.xs,
  },
  checkoutBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  checkoutBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
