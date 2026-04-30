import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { DCListItem } from '../../components/DCListItem';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { theme } from '../../constants/theme';
import { OutboundDC } from '../../types';

type DateFilter = 'today' | 'week' | 'month' | 'all';
type SortBy = 'newest' | 'oldest' | 'qty_desc' | 'qty_asc';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
];

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'qty_desc', label: 'Qty ↓' },
  { key: 'qty_asc', label: 'Qty ↑' },
];

export default function OutboundDCsScreen() {
  const [records, setRecords] = useState<OutboundDC[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [showSort, setShowSort] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('outbound_dcs')
      .select('*, clients(*)')
      .order('dc_date', { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = useMemo(() => {
    let result = [...records];

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      result = result.filter((r) => r.dc_date === today);
    } else if (dateFilter === 'week') {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      result = result.filter((r) => new Date(r.dc_date) >= from);
    } else if (dateFilter === 'month') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      result = result.filter((r) => new Date(r.dc_date) >= from);
    }

    // Search — by item name, DC number, or client name
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        r.item_desc?.toLowerCase().includes(q) ||
        r.dc_no?.toLowerCase().includes(q) ||
        (r.clients as any)?.name?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.dc_date).getTime() - new Date(a.dc_date).getTime();
      if (sortBy === 'oldest') return new Date(a.dc_date).getTime() - new Date(b.dc_date).getTime();
      if (sortBy === 'qty_desc') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'qty_asc') return (a.quantity || 0) - (b.quantity || 0);
      return 0;
    });

    return result;
  }, [records, search, dateFilter, sortBy, today]);

  const totalQty = filtered.reduce((s, r) => s + (r.quantity || 0), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by product, DC no, client…"
          placeholderTextColor={theme.colors.textTertiary}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date filter pills + Sort button */}
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
          {DATE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.pill, dateFilter === f.key && styles.pillActive]}
              onPress={() => setDateFilter(f.key)}
            >
              <Text style={[styles.pillText, dateFilter === f.key && styles.pillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[styles.sortBtn, showSort && styles.sortBtnActive]}
          onPress={() => setShowSort((v) => !v)}
        >
          <Text style={[styles.sortBtnText, showSort && styles.sortBtnTextActive]}>
            ⇅ Sort
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort options row */}
      {showSort && (
        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortPill, sortBy === s.key && styles.sortPillActive]}
              onPress={() => { setSortBy(s.key); setShowSort(false); }}
            >
              <Text style={[styles.sortPillText, sortBy === s.key && styles.sortPillTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
          {filtered.length > 0 ? ` · ${totalQty.toLocaleString('en-IN')} pcs total` : ''}
        </Text>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <Text style={styles.empty}>
            {search ? `No results for "${search}"` : `No outbound DCs found.`}
          </Text>
        ) : (
          filtered.map((r) => (
            <DCListItem
              key={r.id}
              date={r.dc_date}
              reference={`DC #${r.dc_no}`}
              party={(r.clients as any)?.name ?? '—'}
              quantity={`${r.quantity} pcs`}
              details={{
                'Item': r.item_desc,
                'HSN': r.hsn_code,
                'Value': r.value ? `₹${r.value.toLocaleString('en-IN')}` : undefined,
                'Vehicle': r.vehicle_no,
                'E-Way Bill': r.eway_bill_no,
                'Party DC No': r.party_dc_no,
                'Order No': r.order_no,
              }}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 44,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  clearBtn: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    paddingLeft: 8,
  },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pillScroll: { flex: 1 },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.xs,
    backgroundColor: theme.colors.background,
  },
  pillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sortBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginLeft: theme.spacing.sm,
  },
  sortBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortBtnText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  sortBtnTextActive: {
    color: '#FFFFFF',
  },

  sortRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sortPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  sortPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  sortPillText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  sortPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  summaryRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  summaryText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    fontWeight: '500',
  },

  list: { padding: theme.spacing.lg, paddingTop: theme.spacing.sm },
  empty: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
    marginTop: theme.spacing.xxl,
  },
});
