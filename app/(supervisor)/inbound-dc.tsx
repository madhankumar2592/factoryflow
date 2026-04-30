import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { FormField } from '../../components/FormField';
import { Toast } from '../../components/Toast';
import { theme } from '../../constants/theme';
import { Supplier } from '../../types';

const emptyForm = {
  supplier_id: '',
  challan_no: '',
  challan_date: new Date().toISOString().split('T')[0],
  item_desc: '',
  hsn_sac: '',
  quantity_kg: '',
  rate_per_kg: '',
  amount: '',
  reference_no: '',
  eway_bill_no: '',
  nature_of_processing: '',
};

export default function InboundDCForm() {
  const { profile, user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    supabase.from('suppliers').select('*').then(({ data }) => setSuppliers(data ?? []));
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'quantity_kg' || field === 'rate_per_kg') {
        const qty = parseFloat(field === 'quantity_kg' ? value : prev.quantity_kg) || 0;
        const rate = parseFloat(field === 'rate_per_kg' ? value : prev.rate_per_kg) || 0;
        next.amount = qty && rate ? (qty * rate).toFixed(2) : '';
      }
      return next;
    });
  }

  async function handleSave() {
    if (!form.supplier_id) { setToast({ message: 'Please select a supplier', type: 'error' }); return; }
    if (!form.challan_no.trim()) { setToast({ message: 'Challan No is required', type: 'error' }); return; }
    if (!form.item_desc.trim()) { setToast({ message: 'Item description is required', type: 'error' }); return; }
    if (!form.quantity_kg) { setToast({ message: 'Quantity is required', type: 'error' }); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from('inbound_dcs').insert({
        company_id: profile?.company_id,
        supplier_id: form.supplier_id,
        challan_no: form.challan_no.trim(),
        challan_date: form.challan_date,
        item_desc: form.item_desc.trim(),
        hsn_sac: form.hsn_sac.trim() || null,
        quantity_kg: parseFloat(form.quantity_kg),
        rate_per_kg: form.rate_per_kg ? parseFloat(form.rate_per_kg) : null,
        amount: form.amount ? parseFloat(form.amount) : null,
        reference_no: form.reference_no.trim() || null,
        eway_bill_no: form.eway_bill_no.trim() || null,
        nature_of_processing: form.nature_of_processing.trim() || null,
        created_by: user?.id,
      });
      if (error) throw error;
      setToast({ message: '✓ Inbound DC saved successfully!', type: 'success' });
      setForm({ ...emptyForm, challan_date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>SUPPLIER</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {suppliers.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, form.supplier_id === s.id && styles.chipSelected]}
              onPress={() => set('supplier_id', s.id)}
            >
              <Text style={[styles.chipText, form.supplier_id === s.id && styles.chipTextSelected]}>
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FormField label="Challan No" value={form.challan_no} onChangeText={(v) => set('challan_no', v)} placeholder="e.g. 7180" />
        <FormField label="Challan Date" value={form.challan_date} onChangeText={(v) => set('challan_date', v)} placeholder="YYYY-MM-DD" />
        <FormField label="Item Description" value={form.item_desc} onChangeText={(v) => set('item_desc', v)} placeholder="e.g. ALUMINIUM INGOTS ADC 12" />
        <FormField label="HSN/SAC Code" optional value={form.hsn_sac} onChangeText={(v) => set('hsn_sac', v)} placeholder="e.g. 76012010" keyboardType="numeric" />
        <FormField label="Quantity (KG)" value={form.quantity_kg} onChangeText={(v) => set('quantity_kg', v)} placeholder="0.00" keyboardType="decimal-pad" />
        <FormField label="Rate per KG (₹)" optional value={form.rate_per_kg} onChangeText={(v) => set('rate_per_kg', v)} placeholder="0.00" keyboardType="decimal-pad" />
        <FormField label="Amount (₹)" optional value={form.amount} onChangeText={(v) => set('amount', v)} placeholder="Auto-calculated from qty × rate" keyboardType="decimal-pad" />
        <FormField label="E-Way Bill No" optional value={form.eway_bill_no} onChangeText={(v) => set('eway_bill_no', v)} placeholder="Optional" />
        <FormField label="Nature of Processing" optional value={form.nature_of_processing} onChangeText={(v) => set('nature_of_processing', v)} placeholder="Optional" />
        <FormField label="Reference No" optional value={form.reference_no} onChangeText={(v) => set('reference_no', v)} placeholder="Optional" />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveText}>{saving ? 'SAVING...' : 'SAVE'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  form: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  sectionLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },
  chipRow: { marginBottom: theme.spacing.lg },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary },
  chipTextSelected: { color: '#FFFFFF', fontWeight: theme.fontWeight.semibold },
  saveButton: {
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: '#FFFFFF', fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.bold, letterSpacing: 1 },
});
