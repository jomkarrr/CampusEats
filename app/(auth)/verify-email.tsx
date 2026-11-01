import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputInstance,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Colors, FontFamily, Radii, Spacing, Shadows, TouchTarget } from '../../constants/theme';

const OTP_LENGTH = 6;

export default function VerifyEmailScreen() {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<Array<TextInputInstance | null>>([]);
  const router = useRouter();

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter all 6 digits.');
      return;
    }
    setError(null);
    setLoading(true);

    // Supabase email OTP verification
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'email',
      token: code,
      // Email comes from current session user
      email: (await supabase.auth.getUser()).data.user?.email ?? '',
    });

    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
    } else {
      router.replace('/(auth)/choose-purpose');
    }
  };

  const handleResend = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user?.email) {
      await supabase.auth.resend({ type: 'signup', email: data.user.email });
      setResent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      {/* ── Nav Bar ── */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        {/* Brand logo lockup */}
        <View style={styles.logoCentered}>
          <View style={styles.logoWrap}>
            <Text style={{ fontSize: 26 }}>🍊</Text>
          </View>
          <Text style={styles.brandTitle}>
            <Text style={{ color: Colors.text }}>Campus </Text>
            <Text style={{ color: Colors.primary }}>Eats</Text>
          </Text>
          <Text style={styles.tagline}>FOOD • FRIENDS • A BETTER CAMPUS</Text>
        </View>
      </View>

      {/* ── Card ── */}
      <View style={[styles.card, Shadows.card]}>
        {/* Envelope illustration */}
        <View style={styles.envelopeWrap}>
          <View style={styles.envelopeBg} />
          <Text style={styles.envelopeEmoji}>📧</Text>
        </View>

        <Text style={styles.title}>
          Verify your <Text style={styles.titleOrange}>email</Text>
        </Text>
        <Text style={styles.subtitle}>
          We&apos;ve sent a 6-digit verification code to your email.
        </Text>

        {/* OTP inputs */}
        <Text style={styles.label}>Enter 6-digit code</Text>
        <View style={styles.otpRow}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => (
            <TextInput
              key={i}
              // eslint-disable-next-line react/no-string-refs
              ref={(el) => { inputRefs.current[i] = el; }}
              style={[
                styles.otpInput,
                digits[i] ? styles.otpInputFilled : styles.otpInputEmpty,
              ]}
              value={digits[i]}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.ctaBtn, Shadows.cta, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.ctaText}>Verify Email →</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity onPress={handleResend} style={{ marginTop: Spacing.md }}>
          <Text style={styles.resendText}>
            {resent ? '✓ Code resent!' : "Didn't receive? Resend Code"}
          </Text>
        </TouchableOpacity>

        {/* Change email */}
        <TouchableOpacity onPress={() => router.replace('/(auth)/signup')} style={styles.changeEmailBtn}>
          <Text style={styles.changeEmailText}>Change email address</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
  },
  navBar: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  backIcon: { fontSize: 18, color: Colors.text },
  logoCentered: {
    alignItems: 'center',
    paddingTop: 4,
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
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  tagline: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 32,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  envelopeWrap: {
    position: 'relative',
    width: 96,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  envelopeBg: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF5EC',
    top: -8,
  },
  envelopeEmoji: {
    fontSize: 48,
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.text,
    marginBottom: 8,
  },
  titleOrange: { color: Colors.primary },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.text,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
    marginBottom: Spacing.md,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderRadius: Radii.lg,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.text,
    borderWidth: 1.5,
  },
  otpInputEmpty: {
    backgroundColor: Colors.inputBg,
    borderColor: '#E5E7EB',
  },
  otpInputFilled: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.error,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  ctaBtn: {
    width: '100%',
    height: TouchTarget.cta,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.onPrimary,
  },
  resendText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.green,
  },
  changeEmailBtn: {
    marginTop: Spacing.sm,
    paddingVertical: 8,
  },
  changeEmailText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.green,
  },
});
