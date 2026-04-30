import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { FormField } from '../../components/FormField';
import { Toast } from '../../components/Toast';
import { theme } from '../../constants/theme';
import { Vendor, Job } from '../../types';

type LineItem = { item_desc: string; hsn_code: string; quantity: string; value: string };
const emptyItem: LineItem = { item_desc: '', hsn_code: '', quantity: '', value: '' };
const emptyForm = {
  client_id: '', job_id: '', dc_no: '',
  dc_date: new Date().toISOString().split('T')[0],
  vehicle_no: '', eway_bill_no: '', party_dc_no: '', order_no: '',
};

export default function OutboundDCForm() {
  const { profile, user } = useAuthStore();
  const [clients, setClients] = useState<Vendor[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<LineItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [addingItem, setAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState<LineItem>(emptyItem);

  function toggleItemExpand(i: number) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  useEffect(() => {
    supabase.from('vendors').select('*').in('type', ['client', 'both']).order('name')
      .then(({ data }) => setClients(data ?? []));
  }, []);

  useEffect(() => {
    if (!form.client_id) { setJobs([]); return; }
    supabase.from('jobs').select('*').eq('client_id', form.client_id).eq('status', 'running')
      .then(({ data }) => setJobs(data ?? []));
  }, [form.client_id]);

  function setField(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  function addItem() {
    if (!itemForm.item_desc.trim()) { setToast({ message: 'Item description is required', type: 'error' }); return; }
    if (!itemForm.quantity) { setToast({ message: 'Quantity is required', type: 'error' }); return; }
    setItems((p) => [...p, itemForm]);
    setItemForm(emptyItem);
    setAddingItem(false);
  }

  async function handleSave() {
    if (!form.client_id) { setToast({ message: 'Please select a client', type: 'error' }); return; }
    if (!form.dc_no.trim()) { setToast({ message: 'DC No is required', type: 'error' }); return; }
    if (items.length === 0) { setToast({ message: 'Add at least one item', type: 'error' }); return; }

    setSaving(true);
    try {
      const totalQty = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
      const totalVal = items.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);

      const { data: dc, error: dcErr } = await supabase.from('outbound_dcs').insert({
        company_id: profile?.company_id,
        client_id: form.client_id,
        job_id: form.job_id || null,
        dc_no: form.dc_no.trim(),
        dc_date: form.dc_date,
        item_desc: items.length === 1 ? items[0].item_desc : `${items.length} items`,
        quantity: totalQty,
        value: totalVal || null,
        vehicle_no: form.vehicle_no.trim() || null,
        eway_bill_no: form.eway_bill_no.trim() || null,
        party_dc_no: form.party_dc_no.trim() || null,
        order_no: form.order_no.trim() || null,
        created_by: user?.id,
      }).select('id').single();
      if (dcErr) throw dcErr;

      const { error: itemsErr } = await supabase.from('product_items').insert(
        items.map((item) => ({
          company_id: profile?.company_id,
          dc_type: 'outbound',
          outbound_dc_id: dc.id,
          item_desc: item.item_desc.trim(),
          hsn_code: item.hsn_code.trim() || null,
          quantity: parseFloat(item.quantity),
          value: item.value ? parseFloat(item.value) : null,
        }))
      );
      if (itemsErr) throw itemsErr;

      setToast({ message: `✓ Outbound DC saved! (${items.length} item${items.length > 1 ? 's' : ''})`, type: 'success' });
      setForm({ ...emptyForm, dc_date: new Date().toISOString().split('T')[0] });
      setItems([]);
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to save', type: 'error' });
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>CLIENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {clients.map((c) => (
            <TouchableOpacity key={c.id} style={[styles.chip, form.client_id === c.id && styles.chipSelected]}
              onPress={() => setField('client_id', c.id)}>
              <Text style={[styles.chipText, form.client_id === c.id && styles.chipTextSelected]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {jobs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>JOB (optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {jobs.map((j) => (
                <TouchableOpacity key={j.id} style={[styles.chip, form.job_id === j.id && styles.chipSelected]}
                  onPress={() => setField('job_id', j.id)}>
                  <Text style={[styles.chipText, form.job_id === j.id && styles.chipTextSelected]}>{j.item_name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <FormField label="DC No" value={form.dc_no} onChangeText={(v) => setField('dc_no', v)} placeholder="e.g. 2271" />
        <FormField label="DC Date" value={form.dc_date} onChangeText={(v) => setField('dc_date', v)} placeholder="YYYY-MM-DD" />
        <FormField label="Vehicle No" optional value={form.vehicle_no} onChangeText={(v) => setField('vehicle_no', v)} placeholder="e.g. TN 37 AB 1234" autoCapitalize="characters" />
        <FormField label="E-Way Bill No" optional value={form.eway_bill_no} onChangeText={(v) => setField('eway_bill_no', v)} placeholder="Optional" />
        <FormField label="Party's DC No" optional value={form.party_dc_no} onChangeText={(v) => setField('party_dc_no', v)} placeholder="Optional" />
        <FormField label="Order No" optional value={form.order_no} onChangeText={(v) => setField('order_no', v)} placeholder="Optional" />

        {/* Items */}
        <Text style={[styles.sectionLabel, { marginTop: theme.spacing.md }]}>
          ITEMS {items.length > 0 ? `(${items.length})` : ''}
        </Text>

        {items.map((item, i) => {
          const isExpanded = expandedItems.has(i);
          return (
            <TouchableOpacity key={i} style={styles.itemCard} onPress={() => toggleItemExpand(i)} activeOpacity={0.7}>
              <View style={styles.itemCardLeft}>
                <Text style={styles.itemIdx}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDesc}>{item.item_desc}</Text>
                  <Text style={styles.itemMeta}>
                    {item.quantity} pcs{item.value ? `  ·  ₹${parseFloat(item.value).toLocaleString('en-IN')}` : ''}
                  </Text>
                  {isExpanded && item.hsn_code ? (
                    <Text style={styles.itemSub}>HSN: {item.hsn_code}</Text>
                  ) : null}
                </View>
              </View>
              <Text style={styles.itemChevron}>{isExpanded ? '▲' : '▼'}</Text>
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation?.(); setItems((p) => p.filter((_, j) => j !== i)); }}
                style={styles.removeBtn}
              >
                <Text style={styles.removeTxt}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {addingItem ? (
          <View style={styles.miniForm}>
            <Text style={styles.miniTitle}>Add Item</Text>
            <Text style={styles.fieldLabel}>ITEM DESCRIPTION *</Text>
            <TextInput style={styles.miniInput} value={itemForm.item_desc} onChangeText={(v) => setItemForm((p) => ({ ...p, item_desc: v }))}
              placeholder="e.g. Gear Housing - Aluminium" placeholderTextColor={theme.colors.textTertiary} />
            <Text style={styles.fieldLabel}>HSN CODE (optional)</Text>
            <TextInput style={styles.miniInput} value={itemForm.hsn_code} onChangeText={(v) => setItemForm((p) => ({ ...p, hsn_code: v }))}
              placeholder="e.g. 73259990" placeholderTextColor={theme.colors.textTertiary} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>QUANTITY (pcs) *</Text>
                <TextInput style={styles.miniInput} value={itemForm.quantity} onChangeText={(v) => setItemForm((p) => ({ ...p, quantity: v }))}
                  placeholder="0" placeholderTextColor={theme.colors.textTertiary} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>VALUE ₹ (opt)</Text>
                <TextInput style={styles.miniInput} value={itemForm.value} onChangeText={(v) => setItemForm((p) => ({ ...p, value: v }))}
                  placeholder="0.00" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={styles.miniBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAddingItem(false); setItemForm(emptyItem); }}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addBtn} onPress={addItem}>
                <Text style={styles.addTxt}>Add to List</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addDash} onPress={() => setAddingItem(true)}>
            <Text style={styles.addDashTxt}>+ Add Item</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveTxt}>{saving ? 'SAVING...' : 'SAVE DC'}</Text>
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
  itemSub: { fontSize: theme.fontSize.xs, color: theme.colors.textSecondary, marginTop: 2 },
  itemChevron: { fontSize: 9, color: theme.colors.textTertiary, marginHorizontal: 4 },
  removeBtn: { paddingLeft: theme.spacing.sm, paddingVertical: 4 },
  removeTxt: { fontSize: 16, color: theme.colors.danger },
  miniForm: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border },
  miniTitle: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: theme.spacing.md },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: 0.8, marginBottom: 4 },
  miniInput: { height: 44, backgroundColor: theme.colors.background, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, fontSize: theme.fontSize.md, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.sm },
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
