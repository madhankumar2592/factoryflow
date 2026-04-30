import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { DCListItem } from '../../components/DCListItem';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { theme } from '../../constants/theme';
import { OutboundDC, ProductItem } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { buildOutboundHTML, printOrDownload } from '../../lib/challanPdf';

type QuickDate = 'today' | 'week' | 'month' | 'all' | 'custom';
type SortBy = 'newest' | 'oldest' | 'qty_desc' | 'qty_asc';

const QUICK_DATES: { key: QuickDate; label: string }[] = [
  { key: 'today',  label: 'Today' },
  { key: 'week',   label: 'This Week' },
  { key: 'month',  label: 'This Month' },
  { key: 'all',    label: 'All' },
  { key: 'custom', label: '📅 Custom' },
];

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'newest',   label: 'Newest first' },
  { key: 'oldest',   label: 'Oldest first' },
  { key: 'qty_desc', label: 'Qty: High → Low' },
  { key: 'qty_asc',  label: 'Qty: Low → High' },
];

/** Native HTML date input — renders a calendar popup on web */
function DatePicker({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={dpStyles.wrap}>
      <Text style={dpStyles.label}>{label}</Text>
      {/* @ts-ignore — web-only JSX */}
      <input
        type="date"
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          height: 40,
          border: '1.5px solid #000000',
          borderRadius: 12,
          paddingLeft: 12,
          paddingRight: 12,
          fontSize: 14,
          fontFamily: 'inherit',
          color: value ? '#000000' : '#AEAEB2',
          backgroundColor: '#FFFFFF',
          cursor: 'pointer',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
    </View>
  );
}
const dpStyles = StyleSheet.create({
  wrap: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
});

const inlineDateStyle = {
  height: 36,
  border: '1.5px solid #000000',
  borderRadius: 18,
  paddingLeft: 12,
  paddingRight: 12,
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#000000',
  backgroundColor: '#FFFFFF',
  cursor: 'pointer',
  outline: 'none',
  width: 140,
};

export default function OutboundDCsScreen() {
  const { profile } = useAuthStore();
  const company = {
    name:    (profile?.companies as any)?.name    ?? '',
    gstin:   (profile?.companies as any)?.gstin   ?? '',
    address: (profile?.companies as any)?.address ?? '',
  };
  const [records, setRecords] = useState<(OutboundDC & { product_items: ProductItem[] })[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [quickDate, setQuickDate] = useState<QuickDate>('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [sortBy, setSortBy]     = useState<SortBy>('newest');
  const [showSort, setShowSort] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    const { data: dcs } = await supabase
      .from('outbound_dcs')
      .select('*, vendors!client_id(*)')
      .order('dc_date', { ascending: false });

    if (!dcs || dcs.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const { data: items } = await supabase
      .from('product_items')
      .select('*')
      .eq('dc_type', 'outbound')
      .in('outbound_dc_id', dcs.map((d) => d.id));

    const merged = dcs.map((dc) => ({
      ...dc,
      product_items: (items ?? []).filter((item) => item.outbound_dc_id === dc.id),
    }));

    setRecords(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = useMemo(() => {
    let result = [...records];

    // Date filter
    if (quickDate === 'custom') {
      if (fromDate) result = result.filter((r) => r.dc_date >= fromDate);
      if (toDate)   result = result.filter((r) => r.dc_date <= toDate);
    } else {
      const now = new Date();
      if (quickDate === 'today') {
        result = result.filter((r) => r.dc_date === today);
      } else if (quickDate === 'week') {
        const from = new Date(now); from.setDate(from.getDate() - 7);
        result = result.filter((r) => new Date(r.dc_date) >= from);
      } else if (quickDate === 'month') {
        const from = new Date(now); from.setMonth(from.getMonth() - 1);
        result = result.filter((r) => new Date(r.dc_date) >= from);
      }
      // 'all' → no date filter
    }

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        r.item_desc?.toLowerCase().includes(q) ||
        r.dc_no?.toLowerCase().includes(q) ||
        (r.vendors as any)?.name?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest')   return new Date(b.dc_date).getTime() - new Date(a.dc_date).getTime();
      if (sortBy === 'oldest')   return new Date(a.dc_date).getTime() - new Date(b.dc_date).getTime();
      if (sortBy === 'qty_desc') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'qty_asc')  return (a.quantity || 0) - (b.quantity || 0);
      return 0;
    });

    return result;
  }, [records, search, quickDate, fromDate, toDate, sortBy, today]);

  const totalQty = filtered.reduce((s, r) => s + (r.quantity || 0), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Search bar ── */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        {/* @ts-ignore */}
        <input
          placeholder="Search product, DC no, client…"
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 16,
            color: '#000000',
            backgroundColor: 'transparent',
            fontFamily: 'inherit',
          }}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Date filter pills + inline custom pickers ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {QUICK_DATES.map((d) => {
          const active = quickDate === d.key;
          return (
            <TouchableOpacity
              key={d.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => {
                setQuickDate(d.key);
                if (d.key !== 'custom') { setFromDate(''); setToDate(''); }
              }}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Inline date pickers — only when Custom is active */}
        {quickDate === 'custom' && (
          <View style={styles.inlineDates}>
            {/* @ts-ignore */}
            <input
              type="date"
              value={fromDate}
              onChange={(e: any) => setFromDate(e.target.value)}
              style={inlineDateStyle}
            />
            <Text style={styles.dateSep}>→</Text>
            {/* @ts-ignore */}
            <input
              type="date"
              value={toDate}
              onChange={(e: any) => setToDate(e.target.value)}
              style={inlineDateStyle}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Sort + summary row ── */}
      <View style={styles.sortSummaryRow}>
        <Text style={styles.summaryText}>
          {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
          {totalQty > 0 ? `  ·  ${totalQty.toLocaleString('en-IN')} pcs` : ''}
        </Text>
        <TouchableOpacity
          style={[styles.sortBtn, showSort && styles.sortBtnActive]}
          onPress={() => setShowSort((v) => !v)}
        >
          <Text style={[styles.sortBtnText, showSort && styles.sortBtnTextActive]}>
            ⇅ {SORT_OPTIONS.find((s) => s.key === sortBy)?.label ?? 'Sort'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      {showSort && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortOption, sortBy === s.key && styles.sortOptionActive]}
              onPress={() => { setSortBy(s.key); setShowSort(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === s.key && styles.sortOptionTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── List ── */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <Text style={styles.empty}>
            {search ? `No results for "${search}"` : 'No outbound DCs found.'}
          </Text>
        ) : (
          filtered.map((r) => {
            const hasItems = r.product_items.length > 0;
            const lineItems = hasItems
              ? r.product_items.map((item) => ({
                  desc: item.item_desc,
                  qty: `${item.quantity} pcs`,
                  amount: item.value ? `₹${item.value.toLocaleString('en-IN')}` : undefined,
                  hsn: item.hsn_code,
                }))
              : undefined;

            return (
              <DCListItem
                key={r.id}
                date={r.dc_date}
                reference={`DC #${r.dc_no}`}
                party={(r.vendors as any)?.name ?? '—'}
                quantity={`${r.quantity} pcs`}
                lineItems={lineItems}
                details={{
                  'Item':        hasItems ? undefined : r.item_desc,
                  'Value':       r.value ? `₹${r.value.toLocaleString('en-IN')}` : undefined,
                  'Vehicle':     r.vehicle_no,
                  'E-Way Bill':  r.eway_bill_no,
                  'Party DC No': r.party_dc_no,
                  'Order No':    r.order_no,
                }}
                onDownload={() => {
                  const html = buildOutboundHTML(
                    { dc_no: r.dc_no, dc_date: r.dc_date, vehicle_no: r.vehicle_no, eway_bill_no: r.eway_bill_no, party_dc_no: r.party_dc_no, order_no: r.order_no },
                    { name: (r.vendors as any)?.name ?? '', gstin: (r.vendors as any)?.gstin, address: (r.vendors as any)?.address },
                    hasItems ? r.product_items.map((i) => ({ item_desc: i.item_desc, hsn_code: i.hsn_code, quantity: i.quantity, value: i.value }))
                             : [{ item_desc: r.item_desc, quantity: r.quantity, value: r.value ?? undefined }],
                    company,
                  );
                  printOrDownload(html, `DC-${r.dc_no}.pdf`);
                }}
              />
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    backgroundColor: '#FFFFFF',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  clearBtn: { paddingLeft: 8 },
  clearBtnText: { fontSize: 14, color: theme.colors.textSecondary },

  pillRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  pill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: '#000000' },
  pillText: { fontSize: theme.fontSize.sm, fontWeight: '600', color: '#000000' },
  pillTextActive: { color: '#FFFFFF' },

  inlineDates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dateSep: { fontSize: 14, color: theme.colors.textSecondary, paddingHorizontal: 4 },

  sortSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summaryText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: '500' },
  sortBtn: {
    height: 36,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortBtnActive: { backgroundColor: '#000000' },
  sortBtnText: { fontSize: theme.fontSize.sm, fontWeight: '600', color: '#000000' },
  sortBtnTextActive: { color: '#FFFFFF' },

  sortDropdown: {
    marginHorizontal: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: theme.radius.md,
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing.xs,
    overflow: 'hidden',
  },
  sortOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortOptionActive: { backgroundColor: '#000000' },
  sortOptionText: { fontSize: theme.fontSize.md, color: '#000000', fontWeight: '500' },
  sortOptionTextActive: { color: '#FFFFFF', fontWeight: '700' },

  list: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm },
  empty: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
});
