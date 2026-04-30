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
import { Job, InboundDC } from '../../types';

const emptyForm = {
  job_id: '',
  inbound_dc_id: '',
  material_consumed_kg: '',
  good_qty: '',
  reject_qty: '0',
  notes: '',
};

export default function ProductionLogForm() {
  const { profile, user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recentDCs, setRecentDCs] = useState<InboundDC[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    Promise.all([
      supabase.from('jobs').select('*, clients(*)').eq('status', 'running'),
      supabase.from('inbound_dcs').select('*, suppliers(*)').order('created_at', { ascending: false }).limit(10),
    ]).then(([jobsRes, dcsRes]) => {
      setJobs(jobsRes.data ?? []);
      setRecentDCs(dcsRes.data ?? []);
    });
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const good = parseInt(form.good_qty) || 0;
  const reject = parseInt(form.reject_qty) || 0;
  const total = good + reject;
  const efficiency = total > 0 ? ((good / total) * 100).toFixed(1) : null;

  async function handleSave() {
    if (!form.job_id) { setToast({ message: 'Please select a job', type: 'error' }); return; }
    if (!form.material_consumed_kg) { setToast({ message: 'Material consumed is required', type: 'error' }); return; }
    if (!form.good_qty) { setToast({ message: 'Good quantity is required', type: 'error' }); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from('production_logs').insert({
        company_id: profile?.company_id,
        job_id: form.job_id,
        inbound_dc_id: form.inbound_dc_id || null,
        material_consumed_kg: parseFloat(form.material_consumed_kg),
        good_qty: parseInt(form.good_qty),
        reject_qty: parseInt(form.reject_qty) || 0,
        notes: form.notes.trim() || null,
        created_by: user?.id,
      });
      if (error) throw error;
      setToast({ message: '✓ Production log saved!', type: 'success' });
      setForm(emptyForm);
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>JOB</Text>
        {jobs.map((j) => (
          <TouchableOpacity
            key={j.id}
            style={[styles.selectRow, form.job_id === j.id && styles.selectRowActive]}
            onPress={() => set('job_id', j.id)}
          >
            <Text style={[styles.selectText, form.job_id === j.id && styles.selectTextActive]}>
              {j.item_name}
            </Text>
            {j.clients && (
              <Text style={[styles.selectSub, form.job_id === j.id && { color: 'rgba(255,255,255,0.7)' }]}>
                {j.clients.name}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.lg }]}>INBOUND DC (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, !form.inbound_dc_id && styles.chipSelected]}
            onPress={() => set('inbound_dc_id', '')}
          >
            <Text style={[styles.chipText, !form.inbound_dc_id && styles.chipTextSelected]}>None</Text>
          </TouchableOpacity>
          {recentDCs.map((dc) => (
            <TouchableOpacity
              key={dc.id}
              style={[styles.chip, form.inbound_dc_id === dc.id && styles.chipSelected]}
              onPress={() => set('inbound_dc_id', dc.id)}
            >
              <Text style={[styles.chipText, form.inbound_dc_id === dc.id && styles.chipTextSelected]}>
                #{dc.challan_no}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FormField label="Material Consumed (KG)" value={form.material_consumed_kg} onChangeText={(v) => set('material_consumed_kg', v)} placeholder="0.00" keyboardType="decimal-pad" />
        <FormField label="Good Quantity (pcs)" value={form.good_qty} onChangeText={(v) => set('good_qty', v)} placeholder="0" keyboardType="number-pad" />
        <FormField label="Reject Quantity (pcs)" value={form.reject_qty} onChangeText={(v) => set('reject_qty', v)} placeholder="0" keyboardType="number-pad" />

        {efficiency !== null && (
          <View style={[styles.efficiencyBox, { borderColor: parseFloat(efficiency) >= 90 ? theme.colors.success : theme.colors.warning }]}>
            <Text style={styles.effLabel}>EFFICIENCY</Text>
            <Text style={[styles.effValue, { color: parseFloat(efficiency) >= 90 ? theme.colors.success : theme.colors.warning }]}>
              {efficiency}%
            </Text>
            <Text style={styles.effSub}>{good} good / {total} total</Text>
          </View>
        )}

        <FormField label="Notes" optional value={form.notes} onChangeText={(v) => set('notes', v)} placeholder="Optional shift notes" multiline style={{ height: 80 }} />

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
  selectRow: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  selectRowActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  selectText: { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  selectTextActive: { color: '#FFFFFF' },
  selectSub: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
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
  efficiencyBox: {
    borderWidth: 2,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  effLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
  },
  effValue: {
    fontSize: theme.fontSize.hero,
    fontWeight: theme.fontWeight.bold,
    marginVertical: theme.spacing.xs,
  },
  effSub: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
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
