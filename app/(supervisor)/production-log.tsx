import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { FormField } from '../../components/FormField';
import { Toast } from '../../components/Toast';
import { theme } from '../../constants/theme';
import { Job, InboundDC } from '../../types';

type JobItem = { job_id: string; material_consumed_kg: string; good_qty: string; reject_qty: string; notes: string };
const emptyJobItem: JobItem = { job_id: '', material_consumed_kg: '', good_qty: '', reject_qty: '0', notes: '' };

export default function ProductionLogForm() {
  const { profile, user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recentDCs, setRecentDCs] = useState<InboundDC[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [inboundDcId, setInboundDcId] = useState('');
  const [jobItems, setJobItems] = useState<JobItem[]>([]);
  const [addingJob, setAddingJob] = useState(false);
  const [jobForm, setJobForm] = useState<JobItem>(emptyJobItem);

  useEffect(() => {
    Promise.all([
      supabase.from('jobs').select('*, vendors!client_id(*)').eq('status', 'running'),
      supabase.from('inbound_dcs').select('*, vendors!supplier_id(*)').order('created_at', { ascending: false }).limit(10),
    ]).then(([j, d]) => { setJobs(j.data ?? []); setRecentDCs(d.data ?? []); });
  }, []);

  function setJobField(f: keyof JobItem, v: string) {
    setJobForm((p) => ({ ...p, [f]: v }));
  }

  const itemGood = parseInt(jobForm.good_qty) || 0;
  const itemReject = parseInt(jobForm.reject_qty) || 0;
  const itemTotal = itemGood + itemReject;
  const itemEff = itemTotal > 0 ? ((itemGood / itemTotal) * 100).toFixed(1) : null;

  const selectedJob = (id: string) => jobs.find((j) => j.id === id);

  function addJobItem() {
    if (!jobForm.job_id) { setToast({ message: 'Please select a job', type: 'error' }); return; }
    if (!jobForm.good_qty) { setToast({ message: 'Good quantity is required', type: 'error' }); return; }
    if (!jobForm.material_consumed_kg) { setToast({ message: 'Material consumed is required', type: 'error' }); return; }
    setJobItems((p) => [...p, jobForm]);
    setJobForm(emptyJobItem);
    setAddingJob(false);
  }

  async function handleSave() {
    if (jobItems.length === 0) { setToast({ message: 'Add at least one job output', type: 'error' }); return; }

    setSaving(true);
    try {
      const totalGood = jobItems.reduce((s, i) => s + (parseInt(i.good_qty) || 0), 0);
      const totalReject = jobItems.reduce((s, i) => s + (parseInt(i.reject_qty) || 0), 0);
      const totalMat = jobItems.reduce((s, i) => s + (parseFloat(i.material_consumed_kg) || 0), 0);

      const { data: log, error: logErr } = await supabase.from('production_logs').insert({
        company_id: profile?.company_id,
        job_id: jobItems[0].job_id,
        inbound_dc_id: inboundDcId || null,
        material_consumed_kg: totalMat,
        good_qty: totalGood,
        reject_qty: totalReject,
        created_by: user?.id,
      }).select('id').single();
      if (logErr) throw logErr;

      const { error: itemsErr } = await supabase.from('production_log_items').insert(
        jobItems.map((item) => ({
          log_id: log.id,
          company_id: profile?.company_id,
          job_id: item.job_id,
          material_consumed_kg: parseFloat(item.material_consumed_kg) || 0,
          good_qty: parseInt(item.good_qty) || 0,
          reject_qty: parseInt(item.reject_qty) || 0,
          notes: item.notes.trim() || null,
        }))
      );
      if (itemsErr) throw itemsErr;

      setToast({ message: `✓ Production log saved! (${jobItems.length} job${jobItems.length > 1 ? 's' : ''})`, type: 'success' });
      setJobItems([]);
      setInboundDcId('');
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to save', type: 'error' });
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

        {/* Inbound DC link */}
        <Text style={styles.sectionLabel}>INBOUND DC (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <TouchableOpacity style={[styles.chip, !inboundDcId && styles.chipSelected]}
            onPress={() => setInboundDcId('')}>
            <Text style={[styles.chipText, !inboundDcId && styles.chipTextSelected]}>None</Text>
          </TouchableOpacity>
          {recentDCs.map((dc) => (
            <TouchableOpacity key={dc.id} style={[styles.chip, inboundDcId === dc.id && styles.chipSelected]}
              onPress={() => setInboundDcId(dc.id)}>
              <Text style={[styles.chipText, inboundDcId === dc.id && styles.chipTextSelected]}>#{dc.challan_no}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Job outputs */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.md }]}>
          JOB OUTPUTS {jobItems.length > 0 ? `(${jobItems.length})` : ''}
        </Text>

        {jobItems.map((item, i) => {
          const g = parseInt(item.good_qty) || 0;
          const r = parseInt(item.reject_qty) || 0;
          const tot = g + r;
          const eff = tot > 0 ? ((g / tot) * 100).toFixed(0) : '—';
          const job = selectedJob(item.job_id);
          return (
            <View key={i} style={styles.itemCard}>
              <View style={styles.itemCardLeft}>
                <Text style={styles.itemIdx}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDesc}>{job?.item_name ?? '—'}</Text>
                  <Text style={styles.itemMeta}>
                    {g} good · {r} reject · {eff}% eff · {item.material_consumed_kg} KG
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setJobItems((p) => p.filter((_, j) => j !== i))} style={styles.removeBtn}>
                <Text style={styles.removeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {addingJob ? (
          <View style={styles.miniForm}>
            <Text style={styles.miniTitle}>Add Job Output</Text>

            <Text style={styles.fieldLabel}>SELECT JOB *</Text>
            {jobs.map((j) => (
              <TouchableOpacity key={j.id}
                style={[styles.jobRow, jobForm.job_id === j.id && styles.jobRowActive]}
                onPress={() => setJobField('job_id', j.id)}>
                <Text style={[styles.jobRowText, jobForm.job_id === j.id && styles.jobRowTextActive]}>{j.item_name}</Text>
                {j.vendors && (
                  <Text style={[styles.jobRowSub, jobForm.job_id === j.id && { color: 'rgba(255,255,255,0.7)' }]}>
                    {(j.vendors as any).name}
                  </Text>
                )}
              </TouchableOpacity>
            ))}

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>GOOD QTY *</Text>
                <TextInput style={styles.miniInput} value={jobForm.good_qty} onChangeText={(v) => setJobField('good_qty', v)}
                  placeholder="0" placeholderTextColor={theme.colors.textTertiary} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>REJECT QTY</Text>
                <TextInput style={styles.miniInput} value={jobForm.reject_qty} onChangeText={(v) => setJobField('reject_qty', v)}
                  placeholder="0" placeholderTextColor={theme.colors.textTertiary} keyboardType="number-pad" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>MATERIAL CONSUMED (KG) *</Text>
            <TextInput style={styles.miniInput} value={jobForm.material_consumed_kg} onChangeText={(v) => setJobField('material_consumed_kg', v)}
              placeholder="0.00" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" />

            {itemEff !== null && (
              <View style={[styles.effBox, { borderColor: parseFloat(itemEff) >= 90 ? theme.colors.success : theme.colors.warning }]}>
                <Text style={styles.effLabel}>EFFICIENCY</Text>
                <Text style={[styles.effValue, { color: parseFloat(itemEff) >= 90 ? theme.colors.success : theme.colors.warning }]}>
                  {itemEff}%
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>NOTES (optional)</Text>
            <TextInput style={[styles.miniInput, { height: 72 }]} value={jobForm.notes} onChangeText={(v) => setJobField('notes', v)}
              placeholder="Optional notes" placeholderTextColor={theme.colors.textTertiary} multiline />

            <View style={styles.miniBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAddingJob(false); setJobForm(emptyJobItem); }}>
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

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
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
  sectionLabel: { fontSize: theme.fontSize.xs, fontWeight: '600', color: theme.colors.textSecondary, letterSpacing: 1, marginBottom: theme.spacing.sm },
  chipRow: { marginBottom: theme.spacing.lg },
  chip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.xl, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, marginRight: theme.spacing.sm, backgroundColor: theme.colors.surface },
  chipSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: theme.fontSize.sm, color: theme.colors.textPrimary },
  chipTextSelected: { color: '#FFF', fontWeight: '600' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  itemCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  itemIdx: { fontSize: theme.fontSize.sm, fontWeight: '700', color: theme.colors.textTertiary, width: 18 },
  itemDesc: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.textPrimary },
  itemMeta: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginTop: 2 },
  removeBtn: { paddingLeft: theme.spacing.sm, paddingVertical: 4 },
  removeTxt: { fontSize: 16, color: theme.colors.danger },
  miniForm: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  miniTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.8, marginBottom: 4 },
  miniInput: { height: 44, backgroundColor: theme.colors.background, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, fontSize: theme.fontSize.md, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.sm },
  jobRow: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, backgroundColor: theme.colors.background },
  jobRowActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  jobRowText: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.textPrimary },
  jobRowTextActive: { color: '#FFF' },
  jobRowSub: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
  effBox: { borderWidth: 2, borderRadius: theme.radius.lg, padding: theme.spacing.md, alignItems: 'center', marginBottom: theme.spacing.md },
  effLabel: { fontSize: theme.fontSize.xs, fontWeight: '600', color: theme.colors.textSecondary, letterSpacing: 1 },
  effValue: { fontSize: theme.fontSize.xxl, fontWeight: '700', marginVertical: 4 },
  miniBtns: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  cancelBtn: { flex: 1, height: 44, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, fontWeight: '500' },
  addBtn: { flex: 2, height: 44, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  addTxt: { fontSize: theme.fontSize.md, color: '#FFF', fontWeight: '700' },
  addDash: { height: 48, borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: theme.radius.md, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  addDashTxt: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.primary },
  saveBtn: { height: 56, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', marginTop: theme.spacing.md },
  saveTxt: { color: '#FFF', fontSize: theme.fontSize.md, fontWeight: '700', letterSpacing: 1 },
});
