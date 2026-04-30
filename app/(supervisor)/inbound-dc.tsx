import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { FormField } from '../../components/FormField';
import { Toast } from '../../components/Toast';
import { theme } from '../../constants/theme';
import { Vendor } from '../../types';

type LineItem = { item_desc: string; hsn_code: string; quantity_kg: string; rate_per_kg: string; amount: string };
const emptyItem: LineItem = { item_desc: '', hsn_code: '', quantity_kg: '', rate_per_kg: '', amount: '' };
const emptyForm = {
  supplier_id: '', challan_no: '',
  challan_date: new Date().toISOString().split('T')[0],
  eway_bill_no: '', nature_of_processing: '', reference_no: '',
};

export default function InboundDCForm() {
  const { profile, user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Vendor[]>([]);
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
    supabase.from('vendors').select('*').in('type', ['supplier', 'both']).order('name')
      .then(({ data }) => setSuppliers(data ?? []));
  }, []);

  function setField(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  function setItemField(f: keyof LineItem, v: string) {
    setItemForm((p) => {
      const n = { ...p, [f]: v };
      if (f === 'quantity_kg' || f === 'rate_per_kg') {
        const qty = parseFloat(f === 'quantity_kg' ? v : p.quantity_kg) || 0;
        const rate = parseFloat(f === 'rate_per_kg' ? v : p.rate_per_kg) || 0;
        n.amount = qty && rate ? (qty * rate).toFixed(2) : '';
      }
      return n;
    });
  }

  function addItem() {
    if (!itemForm.item_desc.trim()) { setToast({ message: 'Item description is required', type: 'error' }); return; }
    if (!itemForm.quantity_kg) { setToast({ message: 'Quantity is required', type: 'error' }); return; }
    setItems((p) => [...p, itemForm]);
    setItemForm(emptyItem);
    setAddingItem(false);
  }

  async function handleSave() {
    if (!form.supplier_id) { setToast({ message: 'Please select a supplier', type: 'error' }); return; }
    if (!form.challan_no.trim()) { setToast({ message: 'Challan No is required', type: 'error' }); return; }
    if (items.length === 0) { setToast({ message: 'Add at least one item', type: 'error' }); return; }

    setSaving(true);
    try {
      const totalQty = items.reduce((s, i) => s + (parseFloat(i.quantity_kg) || 0), 0);
      const totalAmt = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

      const { data: dc, error: dcErr } = await supabase.from('inbound_dcs').insert({
        company_id: profile?.company_id,
        supplier_id: form.supplier_id,
        challan_no: form.challan_no.trim(),
        challan_date: form.challan_date,
        item_desc: items.length === 1 ? items[0].item_desc : `${items.length} items`,
        quantity_kg: totalQty,
        amount: totalAmt || null,
        eway_bill_no: form.eway_bill_no.trim() || null,
        nature_of_processing: form.nature_of_processing.trim() || null,
        reference_no: form.reference_no.trim() || null,
        created_by: user?.id,
      }).select('id').single();
      if (dcErr) throw dcErr;

      const { error: itemsErr } = await supabase.from('product_items').insert(
        items.map((item) => ({
          company_id: profile?.company_id,
          dc_type: 'inbound',
          inbound_dc_id: dc.id,
          item_desc: item.item_desc.trim(),
          hsn_code: item.hsn_code.trim() || null,
          quantity_kg: parseFloat(item.quantity_kg),
          rate_per_kg: item.rate_per_kg ? parseFloat(item.rate_per_kg) : null,
          amount: item.amount ? parseFloat(item.amount) : null,
        }))
      );
      if (itemsErr) throw itemsErr;

      setToast({ message: `✓ Inbound DC saved! (${items.length} item${items.length > 1 ? 's' : ''})`, type: 'success' });
      setForm({ ...emptyForm, challan_date: new Date().toISOString().split('T')[0] });
      setItems([]);
    } catch (err: any) {
      setToast({ message: err.message ?? 'Failed to save', type: 'error' });
    } finally { setSaving(false); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>SUPPLIER</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {suppliers.map((s) => (
            <TouchableOpacity key={s.id} style={[styles.chip, form.supplier_id === s.id && styles.chipSelected]}
              onPress={() => setField('supplier_id', s.id)}>
              <Text style={[styles.chipText, form.supplier_id === s.id && styles.chipTextSelected]}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FormField label="Challan No" value={form.challan_no} onChangeText={(v) => setField('challan_no', v)} placeholder="e.g. 7180" />
        <FormField label="Challan Date" value={form.challan_date} onChangeText={(v) => setField('challan_date', v)} placeholder="YYYY-MM-DD" />
        <FormField label="E-Way Bill No" optional value={form.eway_bill_no} onChangeText={(v) => setField('eway_bill_no', v)} placeholder="Optional" />
        <FormField label="Nature of Processing" optional value={form.nature_of_processing} onChangeText={(v) => setField('nature_of_processing', v)} placeholder="Optional" />
        <FormField label="Reference No" optional value={form.reference_no} onChangeText={(v) => setField('reference_no', v)} placeholder="Optional" />

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
                  {item.quantity_kg} KG{item.rate_per_kg ? `  ·  ₹${item.rate_per_kg}/KG` : ''}{item.amount ? `  ·  ₹${parseFloat(item.amount).toLocaleString('en-IN')}` : ''}
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
            <TextInput style={styles.miniInput} value={itemForm.item_desc} onChangeText={(v) => setItemField('item_desc', v)}
              placeholder="e.g. Aluminium Ingots ADC 12" placeholderTextColor={theme.colors.textTertiary} />
            <Text style={styles.fieldLabel}>HSN CODE (optional)</Text>
            <TextInput style={styles.miniInput} value={itemForm.hsn_code} onChangeText={(v) => setItemField('hsn_code', v)}
              placeholder="e.g. 76012010" placeholderTextColor={theme.colors.textTertiary} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>QTY (KG) *</Text>
                <TextInput style={styles.miniInput} value={itemForm.quantity_kg} onChangeText={(v) => setItemField('quantity_kg', v)}
                  placeholder="0.00" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>RATE/KG (opt)</Text>
                <TextInput style={styles.miniInput} value={itemForm.rate_per_kg} onChangeText={(v) => setItemField('rate_per_kg', v)}
                  placeholder="0.00" placeholderTextColor={theme.colors.textTertiary} keyboardType="decimal-pad" />
              </View>
            </View>
            {!!itemForm.amount && <Text style={styles.amountCalc}>Amount: ₹{parseFloat(itemForm.amount).toLocaleString('en-IN')}</Text>}
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
  amountCalc: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.success, marginBottom: theme.spacing.sm },
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
