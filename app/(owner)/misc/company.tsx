import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { theme } from '../../../constants/theme';

export default function CompanySettingsScreen() {
  const { profile, loadProfile } = useAuthStore();
  const co = profile?.companies as any;

  const [name, setName]       = useState(co?.name    ?? '');
  const [gstin, setGstin]     = useState(co?.gstin   ?? '');
  const [address, setAddress] = useState(co?.address ?? '');
  const [phone, setPhone]     = useState(co?.phone   ?? '');
  const [saving, setSaving]   = useState(false);

  // Sync if profile reloads
  useEffect(() => {
    setName(co?.name    ?? '');
    setGstin(co?.gstin  ?? '');
    setAddress(co?.address ?? '');
    setPhone(co?.phone  ?? '');
  }, [profile]);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Validation', 'Company name is required.');
      return;
    }
    if (!profile?.company_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name:    name.trim(),
          gstin:   gstin.trim()   || null,
          address: address.trim() || null,
          phone:   phone.trim()   || null,
        })
        .eq('id', profile.company_id);

      if (error) throw error;

      // Refresh the global profile so challans pick up the new data immediately
      await loadProfile();
      Alert.alert('Saved', 'Company details updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save company details.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Text style={styles.sectionLabel}>COMPANY DETAILS</Text>
        <Text style={styles.hint}>
          These details appear on every challan PDF — keep them accurate.
        </Text>

        <View style={styles.card}>
          <Field label="Company Name *" value={name} onChangeText={setName} placeholder="Mold Tech Diecasting" />
          <Divider />
          <Field label="GSTIN" value={gstin} onChangeText={setGstin} placeholder="29ABCDE1234F1Z5" autoCapitalize="characters" />
          <Divider />
          <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
          <Divider />
          <Field
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder={"123, Industrial Area\nCity, State - 560001"}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>CHALLAN HEADER PREVIEW</Text>
          <Text style={styles.previewName}>{name || 'Company Name'}</Text>
          {address ? <Text style={styles.previewLine}>{address}</Text> : null}
          <Text style={styles.previewLine}>
            {[gstin ? `GSTIN: ${gstin}` : null, phone ? `Ph: ${phone}` : null]
              .filter(Boolean).join('   |   ') || 'GSTIN / Phone not set'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveTxt}>Save Changes</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <View style={styles.divider} />;
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

function Field({ label, value, onChangeText, placeholder, multiline, numberOfLines, keyboardType = 'default', autoCapitalize = 'words' }: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.lg, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  hint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },

  fieldWrap: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  fieldLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  fieldInput: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    paddingVertical: 4,
  },
  fieldInputMulti: {
    minHeight: 72,
  },

  // Live preview
  previewCard: {
    backgroundColor: '#EEF4FF',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: '#B8D0F8',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D6FA4',
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  previewLine: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },

  saveBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveTxt: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '700' },
});
