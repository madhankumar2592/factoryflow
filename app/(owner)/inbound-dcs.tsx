import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { DCListItem } from '../../components/DCListItem';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { theme } from '../../constants/theme';
import { InboundDC, ProductItem } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { buildInboundHTML, printOrDownload } from '../../lib/challanPdf';

export default function InboundDCsScreen() {
  const { profile } = useAuthStore();
  const company = {
    name:    (profile?.companies as any)?.name    ?? '',
    gstin:   (profile?.companies as any)?.gstin   ?? '',
    address: (profile?.companies as any)?.address ?? '',
  };
  const [records, setRecords] = useState<(InboundDC & { product_items: ProductItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    let query = supabase
      .from('inbound_dcs')
      .select('*, vendors!supplier_id(*)')
      .order('created_at', { ascending: false });
    if (!showAll) query = query.eq('challan_date', today);
    const { data: dcs } = await query;

    if (!dcs || dcs.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    // Fetch product items for these DCs
    const { data: items } = await supabase
      .from('product_items')
      .select('*')
      .eq('dc_type', 'inbound')
      .in('inbound_dc_id', dcs.map((d) => d.id));

    const merged = dcs.map((dc) => ({
      ...dc,
      product_items: (items ?? []).filter((item) => item.inbound_dc_id === dc.id),
    }));

    setRecords(merged);
    setLoading(false);
  }, [showAll, today]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.filterBar}>
        <TouchableOpacity onPress={() => setShowAll(false)}>
          <Text style={[styles.filterBtn, !showAll && styles.filterBtnActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowAll(true)}>
          <Text style={[styles.filterBtn, showAll && styles.filterBtnActive]}>All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {records.length === 0 && (
          <Text style={styles.empty}>No inbound DCs {showAll ? '' : 'today'}.</Text>
        )}
        {records.map((r) => {
          const hasItems = r.product_items.length > 0;
          const totalQty = hasItems
            ? r.product_items.reduce((s, i) => s + (i.quantity_kg || 0), 0)
            : r.quantity_kg;

          const lineItems = hasItems
            ? r.product_items.map((item) => ({
                desc: item.item_desc,
                qty: `${item.quantity_kg} KG`,
                amount: item.amount ? `₹${item.amount.toLocaleString('en-IN')}` : undefined,
                hsn: item.hsn_code,
                subDetail: item.rate_per_kg ? `₹${item.rate_per_kg}/KG` : undefined,
              }))
            : undefined;

          return (
            <DCListItem
              key={r.id}
              date={r.challan_date}
              reference={`Challan #${r.challan_no}`}
              party={(r.vendors as any)?.name ?? '—'}
              quantity={`${totalQty} KG`}
              lineItems={lineItems}
              details={{
                'Items': hasItems ? undefined : r.item_desc,
                'Rate/KG': r.rate_per_kg ? `₹${r.rate_per_kg}` : undefined,
                'Amount': r.amount ? `₹${r.amount.toLocaleString('en-IN')}` : undefined,
                'E-Way Bill': r.eway_bill_no,
                'Processing': r.nature_of_processing,
                'Reference': r.reference_no,
              }}
              onDownload={() => {
                const html = buildInboundHTML(
                  { challan_no: r.challan_no, challan_date: r.challan_date, eway_bill_no: r.eway_bill_no, nature_of_processing: r.nature_of_processing, reference_no: r.reference_no },
                  { name: (r.vendors as any)?.name ?? '', gstin: (r.vendors as any)?.gstin, address: (r.vendors as any)?.address },
                  hasItems ? r.product_items.map((i) => ({ item_desc: i.item_desc, hsn_code: i.hsn_code, quantity_kg: i.quantity_kg, rate_per_kg: i.rate_per_kg, amount: i.amount }))
                           : [{ item_desc: r.item_desc, quantity_kg: r.quantity_kg, rate_per_kg: r.rate_per_kg, amount: r.amount }],
                  company,
                );
                printOrDownload(html, `Challan-${r.challan_no}.pdf`);
              }}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  filterBar: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  filterBtn: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  filterBtnActive: { color: theme.colors.background, backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  list: { padding: theme.spacing.lg },
  empty: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, textAlign: 'center', marginTop: theme.spacing.xxl },
});
