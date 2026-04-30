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
import { Vendor, VendorType } from '../../../types';

const TYPE_FILTERS: { key: VendorType | 'all'; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'supplier', label: 'Suppliers' },
  { key: 'client',   label: 'Clients' },
  { key: 'both',     label: 'Both' },
];

const TYPE_OPTIONS: { key: VendorType; label: string; desc: string }[] = [
  { key: 'supplier', label: 'Supplier',      desc: 'Provides raw material (inbound)' },
  { key: 'client',   label: 'Client',        desc: 'Receives finished goods (outbound)' },
  { key: 'both',     label: 'Both',          desc: 'Supplier and client' },
];

const TYPE_BADGE: Record<VendorType, { label: string; color: string; bg: string }> = {
  supplier: { label: 'Supplier', color: '#1D6FA4', bg: '#E3F2FD' },
  client:   { label: 'Client',   color: '#2E7D32', bg: '#E8F5E9' },
  both:     { label: 'Both',     color: '#7B4FA6', bg: '#F3E5F5' },
};

export default function VendorsScreen() {
  const { profile } = useAuthStore();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filter, setFilter] = useState<VendorType | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [form, setForm] = useState({
    name: '', gstin: '', address: '', phone: '', type: 'both' as VendorType,
  });

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .order('name');
    setVendors(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const displayed = filter === 'all'
    ? vendors
    : vendors.filter((v) => v.type === filter);

  function resetForm() {
    setForm({ name: '', gstin: '', address: '', phone: '', type: 'both' });
    setShowForm(false);
  }

  async function handleAdd() {
    if (!form.name.trim()) {
      setToast({ message: 'Name is required', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('vendors').insert({
        company_id: profile?.company_id,
        name:    form.name.trim(),
        gstin:   form.gstin.trim()   || null,
        address: form.address.trim() || null,
        phone:   form.phone.trim()   || null,
        type:    form.type,
      });
      if (error) throw error;
      setToast({ message: '✓ Vendor added!', type: 'success' });
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
      'Remove Vendor',
      `Remove "${name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('vendors').delete().eq('id', id);
            if (error) {
              setToast({ message: error.message, type: 'error' });
            } else {
              setToast({ message: '✓ Vendor removed', type: 'success' });
              load();
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.pill, filter === f.key && styles.pillActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
              {f.label}
              {f.key !== 'all' && (
                <Text> ({vendors.filter((v) => f.key === 'all' || v.type === f.key).length})</Text>
              )}
              {f.key === 'all' && <Text> ({vendors.length})</Text>}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Add form */}
        {showForm ? (
          <View style={styles.form}>
            <Text style={styles.formTitle}>New Vendor</Text>

            {/* Type selector */}
            <Text style={styles.label}>TYPE *</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.typeBtn, form.type === opt.key && styles.typeBtnActive]}
                  onPress={() => setForm((p) => ({ ...p, type: opt.key }))}
                >
                  <Text style={[styles.typeBtnText, form.type === opt.key && styles.typeBtnTextActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.typeBtnDesc, form.type === opt.key && { color: 'rgba(255,255,255,0.75)' }]}>
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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

            <Text style={styles.label}>PHONE (optional)</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
              placeholder="e.g. 9876543210"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="phone-pad"
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
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Add Vendor'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.addBtnText}>+ Add Vendor</Text>
          </TouchableOpacity>
        )}

        {/* List */}
        {displayed.length === 0 ? (
          <Text style={styles.empty}>
            {vendors.length === 0
              ? 'No vendors yet. Add your first one above.'
              : `No ${filter === 'all' ? '' : filter} vendors.`}
          </Text>
        ) : (
          displayed.map((v) => {
            const badge = TYPE_BADGE[v.type];
            return (
              <View key={v.id} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardNameRow}>
                    <Text style={styles.cardName}>{v.name}</Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                  {v.gstin   && <Text style={styles.cardSub}>GSTIN: {v.gstin}</Text>}
                  {v.phone   && <Text style={styles.cardSub}>📞 {v.phone}</Text>}
                  {v.address && <Text style={styles.cardSub}>{v.address}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(v.id, v.name)} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Remove</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: '#FFF', fontWeight: '700' },

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
  addBtnText: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.primary },

  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formTitle: {
    fontSize: theme.fontSize.lg, fontWeight: '700',
    marginBottom: theme.spacing.md, color: theme.colors.textPrimary,
  },
  label: {
    fontSize: 11, fontWeight: '600',
    color: theme.colors.textSecondary, letterSpacing: 0.8, marginBottom: 4,
  },
  typeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  typeBtn: {
    flex: 1, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  typeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  typeBtnText: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.textPrimary },
  typeBtnTextActive: { color: '#FFF' },
  typeBtnDesc: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },

  input: {
    height: 48, backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md, color: theme.colors.textPrimary,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.md,
  },
  formButtons: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  cancelBtn: {
    flex: 1, height: 48, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, fontWeight: '500' },
  saveBtn: {
    flex: 2, height: 48, backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
  },
  saveText: { fontSize: theme.fontSize.md, color: '#FFFFFF', fontWeight: '700' },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.sm,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  cardLeft: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' },
  cardName: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.xl },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardSub: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 3 },
  deleteBtn: { paddingHorizontal: theme.spacing.sm, paddingVertical: 4 },
  deleteText: { fontSize: theme.fontSize.sm, color: theme.colors.danger, fontWeight: '500' },

  empty: {
    textAlign: 'center', color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md, marginTop: theme.spacing.xxl,
  },
});
