import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatINR } from '../../context/cart';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
} from '../../constants/theme';

export default function OrderConfirmedScreen() {
  const router = useRouter();
  const {
    orderId,
    total: totalStr,
    fulfillment,
    slot,
    outletName,
    address,
  } = useLocalSearchParams<{
    orderId?: string;
    total?: string;
    fulfillment?: string;
    slot?: string;
    outletName?: string;
    address?: string;
  }>();

  const total = totalStr ? parseFloat(totalStr) : 0;
  const isPickup = fulfillment === 'pickup';

  // Format short order ID
  const displayOrderId = orderId
    ? `CE-${orderId.slice(0, 8).toUpperCase()}`
    : 'CE-ORD1024';

  const placedTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Navigation Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.replace('/(student)')}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Order Confirmed</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Card */}
        <View style={styles.successCard}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-sharp" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.successTextWrap}>
            <Text style={styles.successTitle}>Your order has been placed!</Text>
            <Text style={styles.orderIdText}>Order ID: {displayOrderId}</Text>
            <Text style={styles.placedTimeText}>Placed today at {placedTime}</Text>
          </View>
        </View>

        {/* Outlet & Location Card */}
        <View style={styles.stallBanner}>
          <View style={styles.stallIconBox}>
            <Ionicons name="storefront" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.stallInfoText}>
            <Text style={styles.stallBannerTitle}>
              {outletName ?? 'Food Street Stall'}
            </Text>
            <Text style={styles.stallBannerSub}>
              {isPickup
                ? 'Ready for pickup at Food Street'
                : `Delivering to ${address ?? 'Campus Hostel'}`}
            </Text>
          </View>
          <View style={styles.campusPill}>
            <Text style={styles.campusPillText}>VIT-AP</Text>
          </View>
        </View>

        {/* Order Status Stepper Timeline */}
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Order Status</Text>
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          {/* Stepper Steps */}
          <View style={styles.stepperRow}>
            {/* Step 1: Placed */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotDone]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.stepLabelActive}>Placed</Text>
              <Text style={styles.stepSubText}>{placedTime}</Text>
            </View>

            <View style={[styles.stepLine, styles.stepLineActive]} />

            {/* Step 2: Preparing */}
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotActive]}>
                <Ionicons name="restaurant" size={13} color="#FFFFFF" />
              </View>
              <Text style={styles.stepLabelActive}>Preparing</Text>
              <Text style={styles.stepSubText}>At kitchen</Text>
            </View>

            <View style={styles.stepLine} />

            {/* Step 3: Out for Delivery / Ready */}
            <View style={styles.stepItem}>
              <View style={styles.stepDot}>
                <Ionicons
                  name={isPickup ? 'bag-check' : 'bicycle'}
                  size={13}
                  color={Colors.textTertiary}
                />
              </View>
              <Text style={styles.stepLabelInactive}>
                {isPickup ? 'Ready' : 'Out for Drop'}
              </Text>
              <Text style={styles.stepSubText}>Pending</Text>
            </View>

            <View style={styles.stepLine} />

            {/* Step 4: Delivered / Collected */}
            <View style={styles.stepItem}>
              <View style={styles.stepDot}>
                <Ionicons
                  name="home"
                  size={13}
                  color={Colors.textTertiary}
                />
              </View>
              <Text style={styles.stepLabelInactive}>
                {isPickup ? 'Collected' : 'Delivered'}
              </Text>
              <Text style={styles.stepSubText}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Fulfillment Overview Side-by-Side */}
        <View style={styles.overviewGrid}>
          {/* Expected Slot */}
          <View style={[styles.overviewCard, Shadows.card]}>
            <View style={styles.overviewHeader}>
              <View style={styles.overviewIconWrap}>
                <Ionicons name="time" size={16} color={Colors.primary} />
              </View>
              <Text style={styles.overviewTitle}>Timing Slot</Text>
            </View>
            <Text style={styles.overviewMainText}>
              {slot ?? '15–25 mins'}
            </Text>
            <Text style={styles.overviewSubText}>Estimated ETA</Text>
          </View>

          {/* Fulfillment Type */}
          <View style={[styles.overviewCard, Shadows.card]}>
            <View style={styles.overviewHeader}>
              <View
                style={[
                  styles.overviewIconWrap,
                  { backgroundColor: 'rgba(22, 101, 52, 0.15)' },
                ]}
              >
                <Ionicons
                  name={isPickup ? 'walk' : 'bicycle'}
                  size={16}
                  color="#166534"
                />
              </View>
              <Text style={styles.overviewTitle}>Fulfillment</Text>
            </View>
            <Text style={styles.overviewMainText}>
              {isPickup ? 'Self Pickup' : 'Campus Partner'}
            </Text>
            <Text style={styles.overviewSubText}>
              {isPickup ? 'At stall counter' : 'Hostel Drop'}
            </Text>
          </View>
        </View>

        {/* Billing Overview */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Payment Mode</Text>
            <Text style={styles.billValue}>UPI (Paid Online)</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Status</Text>
            <Text style={[styles.billValue, { color: '#166534' }]}>
              Payment Confirmed
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>Total Paid</Text>
            <Text style={styles.billTotalValue}>{formatINR(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <SafeAreaView edges={['bottom']} style={styles.footerWrap}>
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              if (orderId) {
                router.replace(`/(student)/orders/${orderId}`);
              } else {
                router.replace('/(student)/orders');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Track Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, Shadows.cta]}
            onPress={() => router.replace('/(student)')}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Back to Home</Text>
            <Ionicons name="home" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  successCard: {
    backgroundColor: '#EBF7EE',
    borderRadius: Radii.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#DCF1E1',
  },
  successIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#107C41',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTextWrap: {
    flex: 1,
  },
  successTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  orderIdText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: '#107C41',
    marginTop: 2,
  },
  placedTimeText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
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
  },
  stallIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stallInfoText: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  stallBannerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.text,
  },
  stallBannerSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  campusPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  campusPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.text,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#16A34A',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    paddingVertical: Spacing.xs,
  },
  stepItem: {
    alignItems: 'center',
    width: 64,
    zIndex: 2,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotDone: {
    backgroundColor: '#107C41',
    borderColor: '#107C41',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepLabelActive: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.text,
    textAlign: 'center',
  },
  stepLabelInactive: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  stepSubText: {
    fontFamily: FontFamily.regular,
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: -22,
    zIndex: 1,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  overviewGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  overviewIconWrap: {
    width: 24,
    height: 24,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  overviewMainText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.text,
  },
  overviewSubText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
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
  divider: {
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
    fontSize: 15,
    color: Colors.text,
  },
  billTotalValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.primary,
  },
  footerWrap: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'android' ? Spacing.md : Spacing.xs,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#166534',
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
