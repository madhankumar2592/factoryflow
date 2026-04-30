import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Toast } from '../../components/Toast';
import { theme } from '../../constants/theme';
import { Vendor, InboundDC } from '../../types';

type JobItem = {
  item_name: string;
  client_id: string;
  material_consumed_kg: string;
  good_qty: string;
  reject_qty: string;
  notes: string;
};

const emptyJobItem: JobItem = {
  item_name: '', client_id: '',
  material_consumed_kg: '', good_qty: '', reject_qty: '0', notes: '',
};

export default function ProductionLogForm() {
  const { profile, user } = useAuthStore();
  const [clients, setClients]     = useState<Vendor[]>([]);
  const [recentDCs, setRecentDCs] = useState<InboundDC[]>([]);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [inboundDcId, setInboundDcId] = useState('');
  const [jobItems, setJobItems]   = useState<JobItem[]>([]);
  const [addingJob, setAddingJob] = useState(false);
  const [jobForm, setJobForm]     = useState<JobItem>(emptyJobItem);

  useEffect(() => {
    Promise.all([
      supabase.from('vendors').select('*').in('type', ['client', 'both']).order('name'),
      supabase.from('inbound_dcs').select('*, vendors!supplier_id(*)').order('created_at', { ascending: false }).limit(10),
    ]).then(([c, d]) => {
      setClients(c.data ?? []);
      setRecentDCs(d.data ?? []);
    });
  }, []);

  function setField(f: keyof JobItem, v: string) {
    setJobForm((p) => ({ ...p, [f]: v }));
  }

  const itemGood   = parseInt(jobForm.good_qty) || 0;
  const itemReject = parseInt(jobForm.reject_qty) || 0;
  const itemTotal  = itemGood + itemReject;
  const itemEff    = itemTotal > 0 ? ((itemGood / itemTotal) * 100).toFixed(1) : null;

  function addJobItem() {
    if (!jobForm.item_name.trim()) { setToast({ message: 'Enter item / part name', type: 'error' }); return; }
    if (!jobForm.client_id)        { setToast({ message: 'Select a client', type: 'error' }); return; }
    if (!jobForm.good_qty)         { setToast({ message: 'Good quantity is required', type: 'error' }); return; }
    if (!jobForm.material_consumed_kg) { setToast({ message: 'Material consumed is required', type: 'error' }); return; }
    setJobItems((p) => [...p, jobForm]);
    setJobForm(emptyJobItem);
    setAddingJob(false);
  }

  // Find or create a job for a given item_name + client_id, return job id
  async function resolveJobId(item_name: string, client_id: string): Promise<string> {
    // Look for existing job with same name + client in this company
    const { data: existing } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', profile?.company_id)
      .eq('client_id', client_id)
      .ilike('item_name', item_name.trim())
      .limit(1)
      .single();

    if (existing) return existing.id;

    // Create new job on the fly
    const { data: created, error } = await supabase
      .from('jobs')
      .insert({
        company_id: profile?.company_id,
        client_id,
        item_name: item_name.trim(),
        status: 'running',
      })
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  }

  async function handleSave() {
    if (jobItems.length === 0) { setToast({ message: 'Add at least one job output', type: 'error' }); return; }

    setSaving(true);
    try {
      // Resolve (or create) job IDs for all items
      const resolvedIds = await Promise.all(
        jobItems.map((item) => resolveJobId(item.item_name, item.client_id))
      );

      const totalGood   = jobItems.reduce((s, i) => s + (parseInt(i.good_qty) || 0), 0);
      const totalReject = jobItems.reduce((s, i) => s + (parseInt(i.reject_qty) || 0), 0);
      const totalMat    = jobItems.reduce((s, i) => s + (parseFloat(i.material_consumed_kg) || 0), 0);

      const { data: log, error: logErr } = await supabase
        .from('production_logs')
        .insert({
          company_id:           profile?.company_id,
          job_id:               resolvedIds[0],
          inbound_dc_id:        inboundDcId || null,
          material_consumed_kg: totalMat,
          good_qty:             totalGood,
          reject_qty:           totalReject,
          created_by:           user?.id,
        })
        .select('id')
        .single();
      if (logErr) throw logErr;

      const { error: itemsErr } = await supabase.from('production_log_items').insert(
        jobItems.map((item, i) => ({
          log_id:               log.id,
          company_id:           profile?.company_id,
          job_id:               resolvedIds[i],
          material_consumed_kg: parseFloat(item.material_consumed_kg) || 0,
          good_qty:             parseInt(item.good_qty) || 0,
          reject_qty:           parseInt(item.reject_qty) || 0,
          notes:                item.notes.trim() || null,
        }))
      );
      if (itemsErr) throw itemsErr;

      setToast({ message: `✓ Production log saved! (${jobItems.length} job${jobItems.length > 1 ? 's' : ''})`, type: 'success' });
      setJobItems([]);
      setInboundDcId('');
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

        {/* Inbound DC link */}
        <Text style={styles.sectionLabel}>INBOUND DC (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, !inboundDcId && styles.chipSelected]}
            onPress={() => setInboundDcId('')}
          >
            <Text style={[styles.chipText, !inboundDcId && styles.chipTextSelected]}>None</Text>
          </TouchableOpacity>
          {recentDCs.map((dc) => (
            <TouchableOpacity
              key={dc.id}
              style={[styles.chip, inboundDcId === dc.id && styles.chipSelected]}
              onPress={() => setInboundDcId(dc.id)}
            >
              <Text style={[styles.chipText, inboundDcId === dc.id && styles.chipTextSelected]}>
                #{dc.challan_no}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Job outputs list */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.md }]}>
          JOB OUTPUTS {jobItems.length > 0 ? `(${jobItems.length})` : ''}
        </Text>

        {jobItems.map((item, i) => {
          const g   = parseInt(item.good_qty) || 0;
          const r   = parseInt(item.reject_qty) || 0;
          const tot = g + r;
          const eff = tot > 0 ? ((g / tot) * 100).toFixed(0) : '—';
          return (
            <View key={i} style={styles.itemCard}>
              <View style={styles.itemCardLeft}>
                <Text style={styles.itemIdx}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDesc}>{item.item_name}</Text>
                  <Text style={styles.itemMeta}>
                    {clientName(item.client_id)}  ·  {g} good · {r} reject · {eff}% · {item.material_consumed_kg} KG
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setJobItems((p) => p.filter((_, j) => j !== i))}
                style={styles.removeBtn}
              >
                <Text style={styles.removeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add job form */}
        {addingJob ? (
          <View style={styles.miniForm}>
            <Text style={styles.miniTitle}>Add Job Output</Text>

            {/* Item name — free text */}
            <Text style={styles.fieldLabel}>ITEM / PART NAME *</Text>
            <TextInput
              style={styles.miniInput}
              value={jobForm.item_name}
              onChangeText={(v) => setField('item_name', v)}
              placeholder="e.g. Motor End Shield, Gear Housing"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="words"
            />

            {/* Client selector */}
            <Text style={styles.fieldLabel}>CLIENT *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: theme.spacing.sm }}>
              {clients.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.clientChip, jobForm.client_id === c.id && styles.clientChipActive]}
                  onPress={() => setField('client_id', c.id)}
                >
                  <Text style={[styles.clientChipText, jobForm.client_id === c.id && styles.clientChipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Qty row */}
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>GOOD QTY *</Text>
                <TextInput
                  style={styles.miniInput}
                  value={jobForm.good_qty}
                  onChangeText={(v) => setField('good_qty', v)}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>REJECT QTY</Text>
                <TextInput
                  style={styles.miniInput}
                  value={jobForm.reject_qty}
                  onChangeText={(v) => setField('reject_qty', v)}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>MATERIAL CONSUMED (KG) *</Text>
            <TextInput
              style={styles.miniInput}
              value={jobForm.material_consumed_kg}
              onChangeText={(v) => setField('material_consumed_kg', v)}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="decimal-pad"
            />

            {itemEff !== null && (
              <View style={[styles.effBox, {
                borderColor: parseFloat(itemEff) >= 90 ? theme.colors.success : theme.colors.warning,
              }]}>
                <Text style={styles.effLabel}>EFFICIENCY</Text>
                <Text style={[styles.effValue, {
                  color: parseFloat(itemEff) >= 90 ? theme.colors.success : theme.colors.warning,
                }]}>
                  {itemEff}%
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>NOTES (optional)</Text>
            <TextInput
              style={[styles.miniInput, { height: 72 }]}
              value={jobForm.notes}
              onChangeText={(v) => setField('notes', v)}
              placeholder="Optional notes"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
            />

            <View style={styles.miniBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setAddingJob(false); setJobForm(emptyJobItem); }}
              >
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={addJobItem}>
                <Text style={styles.addTxt}>Add to List</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addDash} onPress={() => setAddingJob(true)}>
            <Text style={styles.addDashTxt}>+ Add Job Output</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveTxt}>{saving ? 'SAVING...' : 'SAVE LOG'}</Text>
        </TouchableOpacity>

      </ScrollView>
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  form: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },

  sectionLabel: {
    fontSize: theme.fontSize.xs, fontWeight: '600',
    color: theme.colors.textSecondary, letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },

  chipRow: { marginBottom: theme.spacing.lg },
  chip: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm, backgroundColor: theme.colors.surface,
  },
  chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary },
  chipTextSelected: { color: '#FFF', fontWeight: '600' },

  itemCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md, padding: theme.spacing.md,
    marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border,
  },
  itemCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  itemIdx: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.textTertiary, width: 18 },
  itemDesc: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.textPrimary },
  itemMeta: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginTop: 2 },
  removeBtn: { paddingLeft: theme.spacing.sm, paddingVertical: 4 },
  removeTxt: { fontSize: 16, color: theme.colors.danger },

  miniForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg, padding: theme.spacing.md,
    marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  miniTitle: {
    fontSize: theme.fontSize.md, fontWeight: '700',
    color: theme.colors.textPrimary, marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    fontSize: 10, fontWeight: '700',
    color: theme.colors.textSecondary, letterSpacing: 0.8, marginBottom: 4,
  },
  miniInput: {
    height: 44, backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md, color: theme.colors.textPrimary,
    borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.sm,
  },

  clientChip: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.md, paddingVertical: 8,
    marginRight: theme.spacing.sm, backgroundColor: theme.colors.background,
  },
  clientChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  clientChipText: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary, fontWeight: '500' },
  clientChipTextActive: { color: '#FFF', fontWeight: '700' },

  effBox: {
    borderWidth: 2, borderRadius: theme.radius.lg, padding: theme.spacing.md,
    alignItems: 'center', marginBottom: theme.spacing.md,
  },
  effLabel: { fontSize: theme.fontSize.xs, fontWeight: '600', color: theme.colors.textSecondary, letterSpacing: 1 },
  effValue: { fontSize: theme.fontSize.xxl, fontWeight: '700', marginVertical: 4 },

  miniBtns: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  cancelBtn: {
    flex: 1, height: 44, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
  },
  cancelTxt: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, fontWeight: '500' },
  addBtn: {
    flex: 2, height: 44, backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
  },
  addTxt: { fontSize: theme.fontSize.md, color: '#FFF', fontWeight: '700' },

  addDash: {
    height: 48, borderWidth: 1.5, borderColor: theme.colors.primary,
    borderRadius: theme.radius.md, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md,
  },
  addDashTxt: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.primary },

  saveBtn: {
    height: 56, backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  saveTxt: { color: '#FFF', fontSize: theme.fontSize.md, fontWeight: '700', letterSpacing: 1 },
});
