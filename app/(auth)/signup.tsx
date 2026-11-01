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

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: authError } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      router.push('/(auth)/verify-email');
    }
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
          {/* ── Nav Bar ── */}
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.brandLockup}>
              <View style={styles.logoSmall}>
                <Text style={{ fontSize: 22 }}>🍊</Text>
              </View>
              <View>
                <Text style={styles.brandSmTitle}>
                  <Text style={{ color: Colors.text }}>Campus </Text>
                  <Text style={{ color: Colors.primary }}>Eats</Text>
                </Text>
                <Text style={styles.brandSmTagline}>FOOD • FRIENDS • A BETTER CAMPUS</Text>
              </View>
            </View>
          </View>

          {/* ── Heading ── */}
          <Text style={styles.heading}>Create your account</Text>
          <Text style={styles.subheading}>Join Campus Eats and skip the queue.</Text>

          {/* ── Registration Card ── */}
          <View style={[styles.card, Shadows.card]}>
            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.outline}
                  autoCapitalize="words"
                  autoComplete="name"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>College Email</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="yourname@vitapstudent.ac.in"
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
                  placeholder="Create a password"
                  placeholderTextColor={Colors.outline}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>
                Use at least 8 characters with a number and special character.
              </Text>
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={Colors.outline}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
              </View>
            </View>

            {/* Error */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.ctaBtn, Shadows.cta, loading && styles.ctaBtnDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <Text style={styles.ctaText}>Create Account →</Text>
              )}
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.switchLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

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
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.xl,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.surface}E6`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${Colors.outlineVariant}80`,
  },
  backIcon: {
    fontSize: 18,
    color: Colors.text,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoSmall: {
    width: 36,
    height: 36,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  brandSmTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    lineHeight: 24,
  },
  brandSmTagline: {
    fontFamily: FontFamily.bold,
    fontSize: 8.5,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.85,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: FontFamily.extraBold,
    fontSize: 28,
    color: Colors.text,
    letterSpacing: -0.56,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: `${Colors.primary}26`,
  },
  fieldGroup: {
    marginBottom: Spacing.sm + 4,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  eyeIcon: { fontSize: 16 },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 16,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  ctaBtn: {
    height: TouchTarget.cta,
    backgroundColor: Colors.primary,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.onPrimary,
    letterSpacing: 0.15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  switchText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  switchLink: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.green,
  },
});
