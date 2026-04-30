import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, loading } = useAuthStore();

  // Company details
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin]             = useState('');
  const [address, setAddress]         = useState('');
  const [phone, setPhone]             = useState('');

  // Owner account
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');

  async function handleSignup() {
    if (!companyName.trim()) {
      Alert.alert('Required', 'Please enter your company name.');
      return;
    }
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Password', 'Passwords do not match.');
      return;
    }

    try {
      await signUp(
        { name: companyName, gstin, address, phone },
        fullName,
        email.trim().toLowerCase(),
        password,
      );
      // Navigation handled by root _layout.tsx (profile loaded → redirect to owner)
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message ?? 'Something went wrong. Please try again.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>FactoryFlow</Text>
          <Text style={styles.subtitle}>Create your company account</Text>
        </View>

        {/* ── Section 1: Company ── */}
        <Text style={styles.sectionLabel}>COMPANY DETAILS</Text>
        <View style={styles.card}>
          <Field
            label="Company Name *"
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="e.g. Mold Tech Diecasting Pvt Ltd"
          />
          <Divider />
          <Field
            label="GSTIN"
            value={gstin}
            onChangeText={setGstin}
            placeholder="29ABCDE1234F1Z5"
            autoCapitalize="characters"
          />
          <Divider />
          <Field
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder={"123, Industrial Area\nCity, State - 560001"}
            multiline
            numberOfLines={3}
          />
          <Divider />
          <Field
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
          />
        </View>

        {/* ── Section 2: Owner Account ── */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.lg }]}>YOUR ACCOUNT</Text>
        <View style={styles.card}>
          <Field
            label="Full Name *"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ravi Kumar"
          />
          <Divider />
          <Field
            label="Email Address *"
            value={email}
            onChangeText={setEmail}
            placeholder="ravi@moldtech.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Divider />
          <Field
            label="Password *"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 characters"
            secureTextEntry
          />
          <Divider />
          <Field
            label="Confirm Password *"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter password"
            secureTextEntry
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
          }
        </TouchableOpacity>

        {/* Back to login */}
        <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkBold}>Log in</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
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
  secureTextEntry?: boolean;
}

function Field({
  label, value, onChangeText, placeholder,
  multiline, numberOfLines, keyboardType = 'default',
  autoCapitalize = 'words', secureTextEntry,
}: FieldProps) {
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
        secureTextEntry={secureTextEntry}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  scroll: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  logo: {
    fontSize: theme.fontSize.hero,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
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
    minHeight: 68,
  },

  button: {
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 1,
  },

  loginLink: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  loginLinkText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  loginLinkBold: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
