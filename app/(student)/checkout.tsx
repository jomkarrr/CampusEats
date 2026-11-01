import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useCart, formatINR } from '../../context/cart';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
  TouchTarget,
} from '../../constants/theme';

const SLOTS = [
  '12:00 PM – 12:30 PM',
  '12:30 PM – 1:00 PM',
  '1:00 PM – 1:30 PM',
  '1:30 PM – 2:00 PM',
  'Standard (15–25 min)',
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { fulfillment: initialFulfillment } = useLocalSearchParams<{
    fulfillment?: 'pickup' | 'delivery';
  }>();

  const { items, outletId, outletName, subtotal, itemCount, clearCart } =
    useCart();
  const { user, profile } = useAuth();

  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>(
    initialFulfillment === 'pickup' ? 'pickup' : 'delivery'
  );
  const [selectedSlot, setSelectedSlot] = useState<string>(SLOTS[4]);
  const [selectedPayment, setSelectedPayment] = useState<'upi' | 'card' | 'wallet'>('upi');

  // Contact / Address form fields
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [hostelBlock, setHostelBlock] = useState('Hostel MH1, Room 304');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync profile details once loaded
  useEffect(() => {
    if (profile?.full_name && !fullName) {
      setFullName(profile.full_name);
    }
    if (profile?.phone && !phone) {
      setPhone(profile.phone);
    }
  }, [profile]);

  const deliveryFee = fulfillment === 'delivery' ? 20 : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert('Authentication required', 'Please sign in to place an order.');
      return;
    }

    if (items.length === 0 || !outletId) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items first.');
      router.replace('/(student)');
      return;
    }

    if (!phone.trim()) {
      setErrorMessage('Please enter your phone number for order updates.');
      return;
    }

    if (fulfillment === 'delivery' && !hostelBlock.trim()) {
      setErrorMessage('Please enter your hostel and room number for delivery.');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      // 1. Create order row in Supabase
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          outlet_id: outletId,
          status: 'placed',
          fulfillment,
          total,
        })
        .select()
        .single();

      if (orderErr || !orderData) {
        throw new Error(orderErr?.message ?? 'Failed to create order');
      }

      // 2. Insert order items
      const orderItemsPayload = items.map((i) => ({
        order_id: orderData.id,
        menu_item_id: i.menuItem.id,
        qty: i.qty,
        unit_price: i.menuItem.price,
      }));

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(orderItemsPayload);

      if (itemsErr) {
        // Rollback: delete order row if items fail
        await supabase.from('orders').delete().eq('id', orderData.id);
        throw new Error(itemsErr.message ?? 'Failed to save order items');
      }

      // 3. Update profile phone & hostel_block if provided
      const profileUpdates: { phone?: string; hostel_block?: string } = {};
      if (phone && phone !== profile?.phone) {
        profileUpdates.phone = phone.trim();
      }
      if (hostelBlock && hostelBlock !== profile?.hostel_block) {
        profileUpdates.hostel_block = hostelBlock.trim();
      }
      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user.id);
      }

      // 4. Success: Clear cart & navigate to order confirmation
      clearCart();
      router.replace({
        pathname: '/(student)/order-confirmed',
        params: {
          orderId: orderData.id,
          total: total.toString(),
          fulfillment,
          slot: selectedSlot,
          outletName: outletName ?? 'Food Street Stall',
          address: hostelBlock,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to place order';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stall Header Banner */}
        <View style={styles.orderBanner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="restaurant" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>{outletName ?? 'Food Street Order'}</Text>
            <Text style={styles.bannerSub}>{itemCount} items from this stall</Text>
          </View>
        </View>

        {/* Step 1: Select Delivery Slot */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumCircle}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Select a Delivery Slot</Text>
              <Text style={styles.stepSub}>Choose expected delivery time</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotsScroll}
          >
            {SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.slotPill,
                    isSelected ? styles.slotPillActive : styles.slotPillInactive,
                  ]}
                  onPress={() => setSelectedSlot(slot)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.slotText,
                      isSelected ? styles.slotTextActive : styles.slotTextInactive,
                    ]}
                  >
                    {slot}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 2: Fulfillment Method */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumCircle}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Fulfillment Method</Text>
              <Text style={styles.stepSub}>How to receive your order</Text>
            </View>
          </View>

          <View style={styles.fulfillmentRow}>
            {/* Self Pickup */}
            <TouchableOpacity
              style={[
                styles.methodBtn,
                fulfillment === 'pickup' && styles.methodBtnActive,
              ]}
              onPress={() => setFulfillment('pickup')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="walk-outline"
                size={22}
                color={fulfillment === 'pickup' ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.methodTitle,
                  fulfillment === 'pickup' && styles.methodTitleActive,
                ]}
              >
                Self Pickup
              </Text>
              <Text style={styles.methodFree}>Free (₹0)</Text>
            </TouchableOpacity>

            {/* Campus Delivery */}
            <TouchableOpacity
              style={[
                styles.methodBtn,
                fulfillment === 'delivery' && styles.methodBtnActive,
              ]}
              onPress={() => setFulfillment('delivery')}
              activeOpacity={0.85}
            >
              <Ionicons
                name="bicycle-outline"
                size={22}
                color={fulfillment === 'delivery' ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.methodTitle,
                  fulfillment === 'delivery' && styles.methodTitleActive,
                ]}
              >
                Campus Delivery
              </Text>
              <Text style={styles.methodFee}>₹20 Fee</Text>
            </TouchableOpacity>
          </View>

          {/* Contact / Delivery Address Details */}
          <View style={styles.inputsSection}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your Name"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Phone Number (required)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="phone-pad"
            />

            {fulfillment === 'delivery' && (
              <>
                <Text style={styles.inputLabel}>Hostel Block & Room No.</Text>
                <TextInput
                  style={styles.input}
                  value={hostelBlock}
                  onChangeText={setHostelBlock}
                  placeholder="e.g., Hostel MH1, Room 304"
                  placeholderTextColor={Colors.textTertiary}
                />
              </>
            )}

            <Text style={styles.inputLabel}>Delivery Instructions (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Leave with security desk"
              placeholderTextColor={Colors.textTertiary}
              multiline
            />
          </View>
        </View>

        {/* Step 3: Payment Method (UPI Mock) */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumCircle}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View>
              <Text style={styles.stepTitle}>Payment Method</Text>
              <Text style={styles.stepSub}>Prepaid orders only</Text>
            </View>
          </View>

          {/* UPI Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedPayment === 'upi' && styles.paymentOptionActive,
            ]}
            onPress={() => setSelectedPayment('upi')}
            activeOpacity={0.85}
          >
            <View style={styles.paymentLeft}>
              <View
                style={[
                  styles.paymentRadio,
                  selectedPayment === 'upi' && styles.paymentRadioActive,
                ]}
              >
                {selectedPayment === 'upi' && <View style={styles.radioDot} />}
              </View>
              <View style={styles.paymentIconBox}>
                <Ionicons name="flash" size={18} color="#D97706" />
              </View>
              <View>
                <Text style={styles.paymentName}>UPI (Google Pay, PhonePe, Paytm)</Text>
                <Text style={styles.paymentSub}>Instant zero-fee payment</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card Option */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedPayment === 'card' && styles.paymentOptionActive,
            ]}
            onPress={() => setSelectedPayment('card')}
            activeOpacity={0.85}
          >
            <View style={styles.paymentLeft}>
              <View
                style={[
                  styles.paymentRadio,
                  selectedPayment === 'card' && styles.paymentRadioActive,
                ]}
              >
                {selectedPayment === 'card' && <View style={styles.radioDot} />}
              </View>
              <View style={[styles.paymentIconBox, { backgroundColor: '#1E293B' }]}>
                <Ionicons name="card" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.paymentName}>Debit / Credit Card</Text>
                <Text style={styles.paymentSub}>Visa, Mastercard, RuPay</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Step 4: Order Summary Bill */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumCircle}>
              <Text style={styles.stepNum}>4</Text>
            </View>
            <Text style={styles.stepTitle}>Order Summary</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Subtotal ({itemCount} items)</Text>
            <Text style={styles.billValue}>{formatINR(subtotal)}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>
              Delivery Charge {fulfillment === 'pickup' && '(Self Pickup)'}
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
            <Text style={styles.billTotalLabel}>Grand Total</Text>
            <Text style={styles.billTotalValue}>{formatINR(total)}</Text>
          </View>
        </View>

        {/* Error message if any */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}
      </ScrollView>

      {/* Place Order CTA Button */}
      <SafeAreaView edges={['bottom']} style={styles.footerWrap}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, Shadows.cta, submitting && { opacity: 0.7 }]}
          onPress={handlePlaceOrder}
          disabled={submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>
                Place Order • {formatINR(total)}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  orderBanner: {
    backgroundColor: '#FFEADD',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerInfo: {
    justifyContent: 'center',
  },
  bannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  bannerSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stepNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  stepTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  stepSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  slotsScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingBottom: 4,
  },
  slotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  slotPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  slotPillInactive: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
  },
  slotText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  slotTextActive: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
  },
  slotTextInactive: {
    color: Colors.text,
  },
  fulfillmentRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  methodBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  methodBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  methodTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  methodTitleActive: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  methodFree: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#16A34A',
  },
  methodFee: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  inputsSection: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.text,
  },
  inputMultiline: {
    height: 64,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  paymentOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paymentRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  paymentIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
  },
  paymentSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FEE2E2',
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  errorBannerText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.error,
    flex: 1,
  },
  footerWrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'android' ? Spacing.md : Spacing.xs,
  },
  placeOrderBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  placeOrderText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
