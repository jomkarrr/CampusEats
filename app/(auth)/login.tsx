import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Colors, FontFamily, Radii, Spacing, Shadows, TouchTarget } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);
    if (authError) {
      setError(authError.message);
    }
    // Navigation handled by root layout auth guard
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Header ── */}
          <View style={styles.brandHeader}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🍊</Text>
            </View>
            <Text style={styles.brandTitle}>
              <Text style={styles.brandTitleDark}>Campus</Text>
              <Text style={styles.brandTitleOrange}> Eats</Text>
            </Text>
            <Text style={styles.brandTagline}>FOOD • FRIENDS • A BETTER CAMPUS</Text>
          </View>

          {/* ── Login Card ── */}
          <View style={[styles.card, Shadows.card]}>
            <Text style={styles.cardTitle}>
              Welcome to Campus <Text style={styles.cardTitleOrange}>Eats</Text>
            </Text>
            <Text style={styles.cardSubtitle}>Sign in to continue to your account</Text>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="student@university.edu"
                  placeholderTextColor={Colors.outline}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, styles.inputWithTrailing]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.outline}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotRow} onPress={() => {}}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Error */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.ctaBtn, Shadows.cta, loading && styles.ctaBtnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <Text style={styles.ctaText}>Sign In →</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>New to Campus Eats? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.switchLink}>Create an Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom spacer */}
          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  // Brand header
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  logoEmoji: {
    fontSize: 40,
  },
  brandTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.64,
  },
  brandTitleDark: {
    color: Colors.text,
  },
  brandTitleOrange: {
    color: Colors.primary,
  },
  brandTagline: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2.2,
    color: `${Colors.text}B3`, // 70% opacity
    marginTop: 2,
    textTransform: 'uppercase',
  },
  // Card
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xxl,
    padding: Spacing.lg,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
    color: Colors.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  cardTitleOrange: {
    color: Colors.primary,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: `${Colors.onSurfaceVariant}CC`, // 80% opacity
    marginBottom: Spacing.md,
  },
  // Form fields
  fieldGroup: {
    marginBottom: Spacing.sm + 4,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TouchTarget.primary,
    backgroundColor: Colors.inputBg,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: Spacing.sm + 4,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.text,
  },
  inputWithTrailing: {
    paddingRight: 36,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
    marginTop: -4,
  },
  forgotText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.green,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  // CTA button
  ctaBtn: {
    height: TouchTarget.cta,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.onPrimary,
    letterSpacing: 0.15,
  },
  // Switch to sign up
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.text,
  },
  switchLink: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.green,
  },
});
