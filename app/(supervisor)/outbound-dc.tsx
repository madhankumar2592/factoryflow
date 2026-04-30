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
import { Client, Job } from '../../types';

const emptyForm = {
  client_id: '',
  job_id: '',
  dc_no: '',
  dc_date: new Date().toISOString().split('T')[0],
  item_desc: '',
  hsn_code: '',
  quantity: '',
  value: '',
  vehicle_no: '',
  eway_bill_no: '',
  party_dc_no: '',
  order_no: '',
};

export default function OutboundDCForm() {
  const { profile, user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    supabase.from('clients').select('*').then(({ data }) => setClients(data ?? []));
  }, []);

  useEffect(() => {
    if (!form.client_id) { setJobs([]); return; }
    supabase
      .from('jobs')
      .select('*')
      .eq('client_id', form.client_id)
      .eq('status', 'running')
      .then(({ data }) => setJobs(data ?? []));
  }, [form.client_id]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.client_id) { setToast({ message: 'Please select a client', type: 'error' }); return; }
    if (!form.dc_no.trim()) { setToast({ message: 'DC No is required', type: 'error' }); return; }
    if (!form.item_desc.trim()) { setToast({ message: 'Item description is required', type: 'error' }); return; }
    if (!form.quantity) { setToast({ message: 'Quantity is required', type: 'error' }); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from('outbound_dcs').insert({
        company_id: profile?.company_id,
        client_id: form.client_id,
        job_id: form.job_id || null,
        dc_no: form.dc_no.trim(),
        dc_date: form.dc_date,
        item_desc: form.item_desc.trim(),
        hsn_code: form.hsn_code.trim() || null,
        quantity: parseFloat(form.quantity),
        value: form.value ? parseFloat(form.value) : null,
        vehicle_no: form.vehicle_no.trim() || null,
        eway_bill_no: form.eway_bill_no.trim() || null,
        party_dc_no: form.party_dc_no.trim() || null,
        order_no: form.order_no.trim() || null,
        created_by: user?.id,
      });
      if (error) throw error;
      setToast({ message: '✓ Outbound DC saved!', type: 'success' });
      setForm({ ...emptyForm, dc_date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>CLIENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {clients.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, form.client_id === c.id && styles.chipSelected]}
              onPress={() => set('client_id', c.id)}
            >
              <Text style={[styles.chipText, form.client_id === c.id && styles.chipTextSelected]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {jobs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>JOB (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {jobs.map((j) => (
                <TouchableOpacity
                  key={j.id}
                  style={[styles.chip, form.job_id === j.id && styles.chipSelected]}
                  onPress={() => set('job_id', j.id)}
                >
                  <Text style={[styles.chipText, form.job_id === j.id && styles.chipTextSelected]}>
                    {j.item_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <FormField label="DC No" value={form.dc_no} onChangeText={(v) => set('dc_no', v)} placeholder="e.g. 2271" />
        <FormField label="DC Date" value={form.dc_date} onChangeText={(v) => set('dc_date', v)} placeholder="YYYY-MM-DD" />
        <FormField label="Item Description" value={form.item_desc} onChangeText={(v) => set('item_desc', v)} placeholder="Description of goods" />
        <FormField label="HSN Code" optional value={form.hsn_code} onChangeText={(v) => set('hsn_code', v)} placeholder="e.g. 73259990" keyboardType="numeric" />
        <FormField label="Quantity" value={form.quantity} onChangeText={(v) => set('quantity', v)} placeholder="0" keyboardType="decimal-pad" />
        <FormField label="Value of Goods (₹)" optional value={form.value} onChangeText={(v) => set('value', v)} placeholder="0.00" keyboardType="decimal-pad" />
        <FormField label="Vehicle No" optional value={form.vehicle_no} onChangeText={(v) => set('vehicle_no', v)} placeholder="e.g. TN 37 AB 1234" autoCapitalize="characters" />
        <FormField label="E-Way Bill No" optional value={form.eway_bill_no} onChangeText={(v) => set('eway_bill_no', v)} placeholder="Optional" />
        <FormField label="Party's DC No" optional value={form.party_dc_no} onChangeText={(v) => set('party_dc_no', v)} placeholder="Optional" />
        <FormField label="Order No" optional value={form.order_no} onChangeText={(v) => set('order_no', v)} placeholder="Optional" />

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  back: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },
  title: { fontSize: theme.fontSize.xl, fontWeight: theme.fontWeight.bold },
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
