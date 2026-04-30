import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { Toast } from '../../../components/Toast';
import { theme } from '../../../constants/theme';
import { Supplier } from '../../../types';

export default function SuppliersScreen() {
  const { profile } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [form, setForm] = useState({ name: '', gstin: '', address: '' });

  const load = useCallback(async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    setSuppliers(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  function resetForm() {
    setForm({ name: '', gstin: '', address: '' });
    setShowForm(false);
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      setToast({ message: 'Supplier name is required', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('suppliers').insert({
        company_id: profile?.company_id,
        name: form.name.trim(),
        gstin: form.gstin.trim() || null,
        address: form.address.trim() || null,
      });
      if (error) throw error;
      setToast({ message: '✓ Supplier added!', type: 'success' });
      resetForm();
      load();
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to add', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    Alert.alert(
      'Delete Supplier',
      `Remove "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) {
              setToast({ message: error.message, type: 'error' });
            } else {
              setToast({ message: '✓ Supplier removed', type: 'success' });
              load();
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>New Supplier</Text>

            <Text style={styles.label}>NAME *</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder="e.g. Alu Dyco Mfg Co"
              placeholderTextColor={theme.colors.textTertiary}
            />

            <Text style={styles.label}>GSTIN (optional)</Text>
            <TextInput
              style={styles.input}
              value={form.gstin}
              onChangeText={(v) => setForm((p) => ({ ...p, gstin: v }))}
              placeholder="e.g. 33AAWFA7205M1Z3"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>ADDRESS (optional)</Text>
            <TextInput
              style={[styles.input, { height: 72 }]}
              value={form.address}
              onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
              placeholder="Full address"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
            />

            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleAdd}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Add Supplier'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.addBtnText}>+ Add Supplier</Text>
          </TouchableOpacity>
        )}

        {suppliers.length === 0 ? (
          <Text style={styles.empty}>No suppliers yet. Add your first one above.</Text>
        ) : (
          suppliers.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardName}>{s.name}</Text>
                {s.gstin && <Text style={styles.cardSub}>GSTIN: {s.gstin}</Text>}
                {s.address && <Text style={styles.cardSub}>{s.address}</Text>}
              </View>
              <TouchableOpacity onPress={() => handleDelete(s.id, s.name)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
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
  formButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
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
  cardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  cardSub: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
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
