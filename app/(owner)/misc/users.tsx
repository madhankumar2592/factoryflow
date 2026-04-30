import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { Toast } from '../../../components/Toast';
import { theme } from '../../../constants/theme';
import { Profile, UserRole } from '../../../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

type Mode = 'idle' | 'add' | 'edit';
const emptyForm = { email: '', password: '', full_name: '', role: 'supervisor' as UserRole };

export default function UsersScreen() {
  const { profile: me } = useAuthStore();
  const [users, setUsers] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    setUsers(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  function resetForm() {
    setForm(emptyForm);
    setMode('idle');
    setEditingId(null);
  }

  function startEdit(user: Profile) {
    setForm({ email: '', password: '', full_name: user.full_name, role: user.role });
    setEditingId(user.id);
    setMode('edit');
  }

  async function handleAdd() {
    if (!form.email.trim()) {
      setToast({ message: 'Email is required', type: 'error' });
      return;
    }
    if (!form.password || form.password.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    if (!form.full_name.trim()) {
      setToast({ message: 'Name is required', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      // Use a temporary client so owner's session is not replaced.
      // Pass name/role/company as metadata — the DB trigger reads these
      // and creates the profile automatically (no client-side insert needed).
      const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          data: {
            full_name: form.full_name.trim(),
            role: form.role,
            company_id: me?.company_id,
          },
        },
      });
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (!userId) throw new Error('User ID not returned — try again');

      setToast({ message: `✓ ${form.full_name.trim()} added!`, type: 'success' });
      resetForm();
      load();
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to create user', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!form.full_name.trim()) {
      setToast({ message: 'Name is required', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name.trim(), role: form.role })
        .eq('id', editingId!);
      if (error) throw error;
      setToast({ message: '✓ User updated', type: 'success' });
      resetForm();
      load();
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to update', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: Profile) {
    if (user.id === me?.id) {
      setToast({ message: "You can't delete your own account", type: 'error' });
      return;
    }
    Alert.alert(
      'Remove User',
      `Remove "${user.full_name}"? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('profiles').delete().eq('id', user.id);
            if (error) {
              setToast({ message: error.message, type: 'error' });
            } else {
              setToast({ message: '✓ User removed', type: 'success' });
              load();
            }
          },
        },
      ]
    );
  }

  const isAdding = mode === 'add';
  const isEditing = mode === 'edit';
  const showForm = isAdding || isEditing;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form */}
        {showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>{isEditing ? 'Edit User' : 'New User'}</Text>

            {isAdding && (
              <>
                <Text style={styles.label}>EMAIL *</Text>
                <TextInput
                  style={styles.input}
                  value={form.email}
                  onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
                  placeholder="supervisor@example.com"
                  placeholderTextColor={theme.colors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={styles.label}>PASSWORD *</Text>
                <TextInput
                  style={styles.input}
                  value={form.password}
                  onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={theme.colors.textTertiary}
                  secureTextEntry
                />
              </>
            )}

            <Text style={styles.label}>FULL NAME *</Text>
            <TextInput
              style={styles.input}
              value={form.full_name}
              onChangeText={(v) => setForm((p) => ({ ...p, full_name: v }))}
              placeholder="e.g. Ravi Kumar"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={styles.label}>ROLE</Text>
            <View style={styles.roleRow}>
              {(['supervisor', 'owner'] as UserRole[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleBtn, form.role === r && styles.roleBtnActive]}
                  onPress={() => setForm((p) => ({ ...p, role: r }))}
                >
                  <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={isEditing ? handleEdit : handleAdd}
                disabled={saving}
              >
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create User'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => setMode('add')}>
            <Text style={styles.addBtnText}>+ Add User</Text>
          </TouchableOpacity>
        )}

        {/* Users list */}
        {users.length === 0 ? (
          <Text style={styles.empty}>No users found.</Text>
        ) : (
          users.map((u) => (
            <View key={u.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardName}>{u.full_name}</Text>
                  {u.id === me?.id && <Text style={styles.youBadge}>you</Text>}
                </View>
                <View style={styles.rolePill}>
                  <Text style={[
                    styles.rolePillText,
                    u.role === 'owner' ? styles.ownerPill : styles.supervisorPill,
                  ]}>
                    {u.role}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => startEdit(u)}
                >
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                {u.id !== me?.id && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(u)}
                  >
                    <Text style={styles.deleteText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg },
  addBtn: {
    height: 52,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  input: {
    height: 48,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  roleRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  roleBtn: {
    flex: 1,
    height: 44,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  roleBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  roleBtnText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  roleBtnTextActive: {
    color: '#FFFFFF',
  },
  formButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: theme.fontSize.md,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardLeft: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  youBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    backgroundColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rolePill: { marginTop: 4, alignSelf: 'flex-start' },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ownerPill: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
  },
  supervisorPill: {
    backgroundColor: '#F0FDF4',
    color: '#16A34A',
  },
  cardActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  editBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  editText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  deleteBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  deleteText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.danger,
    fontWeight: '500',
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.xxl,
  },
});
