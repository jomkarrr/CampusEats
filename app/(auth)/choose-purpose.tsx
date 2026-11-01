import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Colors, FontFamily, Radii, Spacing, Shadows, TouchTarget } from '../../constants/theme';
import { UserRole } from '../../lib/database.types';

type Purpose = 'customer' | 'delivery_partner';

const PURPOSES: { key: Purpose; label: string; badge: string; icon: string; desc: string }[] = [
  {
    key: 'customer',
    label: 'Order Food',
    badge: 'Customer',
    icon: '🍽️',
    desc: 'Explore campus stalls and external vendors, place orders, and enjoy your food.',
  },
  {
    key: 'delivery_partner',
    label: 'Be a Delivery Partner',
    badge: 'Earn',
    icon: '🛵',
    desc: 'Accept delivery requests, earn while you help the campus community.',
  },
];

export default function ChoosePurposeScreen() {
  const [selected, setSelected] = useState<Purpose>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { saveRole } = useAuth();

  const handleContinue = async () => {
    setLoading(true);
    setError(null);
    const { error: saveErr } = await saveRole(selected as UserRole);
    setLoading(false);
    if (saveErr) {
      setError(saveErr.message);
    }
    // Root layout auth guard handles navigation to /(student) or /(partner)
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand Header ── */}
        <View style={styles.brandHeader}>
          <View style={styles.logoWrap}>
            <Text style={{ fontSize: 28 }}>🍊</Text>
          </View>
          <Text style={styles.brandTitle}>
            <Text style={{ color: Colors.text }}>Campus</Text>
            <Text style={{ color: Colors.primary }}>Eats</Text>
          </Text>
          <Text style={styles.tagline}>FOOD • FRIENDS • A BETTER CAMPUS</Text>
        </View>

        {/* ── Selection Card ── */}
        <View style={[styles.selectionCard, Shadows.card]}>
          <Text style={styles.sectionTitle}>
            What do you want{'\n'}to do{' '}
            <Text style={{ color: Colors.primary }}>today?</Text>
          </Text>
          <Text style={styles.sectionSubtitle}>Select one option to continue</Text>

          {PURPOSES.map((p) => {
            const isSelected = selected === p.key;
            const isDelivery = p.key === 'delivery_partner';

            return (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.purposeCard,
                  isSelected
                    ? isDelivery
                      ? styles.purposeCardActiveGreen
                      : styles.purposeCardActiveOrange
                    : styles.purposeCardInactive,
                ]}
                onPress={() => setSelected(p.key)}
                activeOpacity={0.85}
              >
                {/* Radio indicator */}
                <View
                  style={[
                    styles.radioIndicator,
                    isSelected
                      ? isDelivery
                        ? styles.radioActiveGreen
                        : styles.radioActiveOrange
                      : styles.radioInactive,
                  ]}
                >
                  {isSelected && <Text style={styles.radioCheck}>✓</Text>}
                </View>

                {/* Icon circle */}
                <View
                  style={[
                    styles.iconCircle,
                    isSelected
                      ? isDelivery
                        ? styles.iconCircleGreen
                        : styles.iconCircleOrange
                      : styles.iconCircleInactive,
                  ]}
                >
                  <Text style={styles.iconEmoji}>{p.icon}</Text>
                </View>

                <View style={styles.purposeTextRow}>
                  <Text style={styles.purposeLabel}>{p.label}</Text>
                  <View
                    style={[
                      styles.badge,
                      isDelivery ? styles.badgeGreen : styles.badgeOrange,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        isDelivery ? styles.badgeTextGreen : styles.badgeTextOrange,
                      ]}
                    >
                      {p.badge}
                    </Text>
                  </View>
                </View>
                <Text style={styles.purposeDesc}>{p.desc}</Text>
              </TouchableOpacity>
            );
          })}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Continue CTA */}
          <TouchableOpacity
            style={[
              styles.ctaBtn,
              selected === 'delivery_partner' ? styles.ctaBtnGreen : styles.ctaBtnOrange,
              Shadows.cta,
              loading && { opacity: 0.7 },
            ]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.ctaText}>
                {selected === 'delivery_partner'
                  ? 'Continue to Partner Dashboard →'
                  : 'Continue to Campus Stalls →'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Shadows.card,
  },
  brandTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    lineHeight: 32,
  },
  tagline: {
    fontFamily: FontFamily.bold,
    fontSize: 9.5,
    color: Colors.onSurfaceVariant,
    letterSpacing: 2.1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  selectionCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 21,
    color: Colors.text,
    letterSpacing: -0.4,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  purposeCard: {
    borderRadius: 24,
    padding: Spacing.md,
    minHeight: 180,
    marginBottom: Spacing.sm + 4,
    position: 'relative',
    borderWidth: 2,
  },
  purposeCardActiveOrange: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  purposeCardActiveGreen: {
    borderColor: Colors.green,
    backgroundColor: `${Colors.green}0D`,
  },
  purposeCardInactive: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    opacity: 0.75,
  },
  radioIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActiveOrange: {
    backgroundColor: Colors.primary,
  },
  radioActiveGreen: {
    backgroundColor: Colors.green,
  },
  radioInactive: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: Colors.surface,
  },
  radioCheck: {
    color: Colors.onPrimary,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconCircleOrange: { backgroundColor: '#FEF3C7' },
  iconCircleGreen: { backgroundColor: '#DCFCE7' },
  iconCircleInactive: { backgroundColor: '#F3F4F6' },
  iconEmoji: { fontSize: 30 },
  purposeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  purposeLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
  },
  badge: {
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeOrange: { backgroundColor: '#FEF3C7' },
  badgeGreen: { backgroundColor: '#DCFCE7' },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badgeTextOrange: { color: '#C2410C' },
  badgeTextGreen: { color: Colors.green },
  purposeDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 19,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginVertical: Spacing.sm,
  },
  ctaBtn: {
    height: TouchTarget.primary,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  ctaBtnOrange: { backgroundColor: Colors.primary },
  ctaBtnGreen: { backgroundColor: Colors.green },
  ctaText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.onPrimary,
  },
});
