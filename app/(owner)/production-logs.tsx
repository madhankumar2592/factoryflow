import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { DCListItem } from '../../components/DCListItem';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { theme } from '../../constants/theme';
import { ProductionLog, ProductionLogItem } from '../../types';

export default function ProductionLogsScreen() {
  const [records, setRecords] = useState<(ProductionLog & { production_log_items: ProductionLogItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    let query = supabase
      .from('production_logs')
      .select('*, jobs(*, vendors!client_id(*))')
      .order('created_at', { ascending: false });
    if (!showAll) query = query.gte('created_at', today);
    const { data: logs } = await query;

    if (!logs || logs.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    // Fetch log items with job details for these logs
    const { data: items } = await supabase
      .from('production_log_items')
      .select('*, jobs(item_name)')
      .in('log_id', logs.map((l) => l.id));

    const merged = logs.map((log) => ({
      ...log,
      production_log_items: (items ?? []).filter((item) => item.log_id === log.id),
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
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {records.length === 0 && (
          <Text style={styles.empty}>No production logs {showAll ? '' : 'today'}.</Text>
        )}
        {records.map((r) => {
          const hasItems = r.production_log_items.length > 0;
          const total = r.good_qty + r.reject_qty;
          const eff = total > 0 ? ((r.good_qty / total) * 100).toFixed(1) : '—';

          // Build line items from production_log_items if present
          const lineItems = hasItems
            ? r.production_log_items.map((item) => {
                const g = item.good_qty;
                const rj = item.reject_qty;
                const t = g + rj;
                const e = t > 0 ? `${((g / t) * 100).toFixed(0)}%` : '—';
                return {
                  desc: (item.jobs as any)?.item_name ?? `Job ${item.job_id.slice(0, 6)}`,
                  qty: `${g}+${rj} · ${e}`,
                  amount: `${item.material_consumed_kg} KG`,
                };
              })
            : undefined;

          // Summary label: multi-job or single
          const jobLabel = hasItems && r.production_log_items.length > 1
            ? `${r.production_log_items.length} jobs`
            : r.jobs?.item_name ?? 'Production';

          return (
            <DCListItem
              key={r.id}
              date={new Date(r.created_at).toLocaleDateString('en-IN')}
              reference={jobLabel}
              party={`${r.good_qty} good / ${r.reject_qty} reject`}
              quantity={`${eff}%`}
              lineItems={lineItems}
              details={{
                'Material Consumed': `${r.material_consumed_kg} KG`,
                'Good Qty': r.good_qty,
                'Reject Qty': r.reject_qty,
                'Efficiency': `${eff}%`,
                'Notes': !hasItems ? r.notes : undefined,
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
  filterBar: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterBtn: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  filterBtnActive: {
    color: theme.colors.background,
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  list: { padding: theme.spacing.lg },
  empty: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md, textAlign: 'center', marginTop: theme.spacing.xxl },
});
