import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  Colors,
  FontFamily,
  Radii,
  Spacing,
  Shadows,
} from '../../constants/theme';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [hostelBlock, setHostelBlock] = useState(profile?.hostel_block ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setHostelBlock(profile.hostel_block ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          hostel_block: hostelBlock.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
      setFeedback('Profile details updated successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      Alert.alert('Update Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Campus Eats?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const initial = (fullName || user?.email || 'U')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Title */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Account & Profile</Text>
            <TouchableOpacity
              onPress={() => {
                if (isEditing) {
                  // Cancel edits
                  setFullName(profile?.full_name ?? '');
                  setPhone(profile?.phone ?? '');
                  setHostelBlock(profile?.hostel_block ?? '');
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                }
              }}
              style={styles.editToggleBtn}
            >
              <Ionicons
                name={isEditing ? 'close' : 'create-outline'}
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.editToggleText}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feedback banner */}
          {feedback && (
            <View style={styles.feedbackBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          )}

          {/* User Card */}
          <View style={[styles.profileCard, Shadows.card]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.userName}>
              {profile?.full_name || 'Campus Student'}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Ionicons name="person" size={11} color={Colors.primary} />
                <Text style={styles.roleBadgeText}>Customer</Text>
              </View>
              <View style={styles.campusBadge}>
                <Ionicons name="school" size={11} color="#166534" />
                <Text style={styles.campusBadgeText}>VIT-AP Student</Text>
              </View>
            </View>
          </View>

          {/* Details Form Card */}
          <View style={[styles.card, Shadows.card]}>
            <Text style={styles.cardTitle}>Student Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor={Colors.textTertiary}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile?.full_name || 'Not provided'}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g., 9876543210"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile?.phone || 'Not provided'}
                </Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hostel Block & Room</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={hostelBlock}
                  onChangeText={setHostelBlock}
                  placeholder="e.g., Hostel MH1, Room 304"
                  placeholderTextColor={Colors.textTertiary}
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile?.hostel_block || 'Not provided'}
                </Text>
              )}
            </View>

            {isEditing && (
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* App Info Card */}
          <View style={[styles.card, Shadows.card]}>
            <Text style={styles.cardTitle}>App Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Application</Text>
              <Text style={styles.infoValue}>Campus Eats</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0 (Phase 3)</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Campus</Text>
              <Text style={styles.infoValue}>VIT-AP Amaravati</Text>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.text,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: '#FFEADD',
  },
  editToggleText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  feedbackText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: '#15803D',
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.cta,
  },
  avatarText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 28,
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
  },
  userEmail: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEADD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  roleBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.primary,
  },
  campusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  campusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#166534',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  fieldGroup: {
    paddingVertical: 4,
  },
  fieldLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  fieldValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    height: 40,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  saveBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.text,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FEE2E2',
    height: 50,
    borderRadius: Radii.pill,
    marginTop: Spacing.xs,
  },
  signOutText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.error,
  },
});
