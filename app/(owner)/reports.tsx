import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { theme } from '../../constants/theme';

type Period = 'today' | 'week' | 'month';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  if (period === 'today') {
    return { from: to, to };
  }
  const from = new Date(now);
  if (period === 'week') {
    from.setDate(from.getDate() - 6);
  } else {
    from.setDate(from.getDate() - 29);
  }
  return { from: from.toISOString().split('T')[0], to };
}

interface Stats {
  materialIn: number;
  goodOutput: number;
  rejectOutput: number;
  materialConsumed: number;
  outboundCount: number;
  outboundQty: number;
}

interface ClientBreakdown {
  name: string;
  qty: number;
}

export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('today');
  const [stats, setStats] = useState<Stats | null>(null);
  const [breakdown, setBreakdown] = useState<ClientBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { from, to } = getDateRange(period);

    // Run all queries in parallel
    const [inboundRes, productionRes, outboundRes, outboundBreakdownRes] = await Promise.all([
      supabase
        .from('inbound_dcs')
        .select('quantity_kg')
        .gte('challan_date', from)
        .lte('challan_date', to),

      supabase
        .from('production_logs')
        .select('good_qty, reject_qty, material_consumed_kg')
        .gte('created_at', `${from}T00:00:00`)
        .lte('created_at', `${to}T23:59:59`),

      supabase
        .from('outbound_dcs')
        .select('quantity')
        .gte('dc_date', from)
        .lte('dc_date', to),

      supabase
        .from('outbound_dcs')
        .select('quantity, vendors!client_id(name)')
        .gte('dc_date', from)
        .lte('dc_date', to),
    ]);

    const inboundData = inboundRes.data ?? [];
    const productionData = productionRes.data ?? [];
    const outboundData = outboundRes.data ?? [];
    const outboundBreakdown = outboundBreakdownRes.data ?? [];

    const materialIn = inboundData.reduce((s, r) => s + (r.quantity_kg ?? 0), 0);
    const goodOutput = productionData.reduce((s, r) => s + (r.good_qty ?? 0), 0);
    const rejectOutput = productionData.reduce((s, r) => s + (r.reject_qty ?? 0), 0);
    const materialConsumed = productionData.reduce((s, r) => s + (r.material_consumed_kg ?? 0), 0);
    const outboundCount = outboundData.length;
    const outboundQty = outboundData.reduce((s, r) => s + (r.quantity ?? 0), 0);

    // Group outbound breakdown by client
    const clientMap: Record<string, number> = {};
    for (const dc of outboundBreakdown) {
      const clientName = (dc.vendors as any)?.name ?? 'Unknown';
      clientMap[clientName] = (clientMap[clientName] ?? 0) + (dc.quantity ?? 0);
    }
    const clientRows: ClientBreakdown[] = Object.entries(clientMap)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);

    setStats({ materialIn, goodOutput, rejectOutput, materialConsumed, outboundCount, outboundQty });
    setBreakdown(clientRows);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  function efficiencyColor(pct: number): string {
    if (pct >= 90) return '#16A34A';
    if (pct >= 75) return '#D97706';
    return '#DC2626';
  }

  const efficiency =
    stats && stats.goodOutput + stats.rejectOutput > 0
      ? (stats.goodOutput / (stats.goodOutput + stats.rejectOutput)) * 100
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Period selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.pill, period === p.key && styles.pillActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.pillText, period === p.key && styles.pillTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {stats && (
            <>
              {/* Stat cards */}
              <Text style={styles.sectionLabel}>SUMMARY</Text>

              <View style={styles.statsGrid}>
                {/* Material Received */}
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {stats.materialIn.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.statUnit}>KG</Text>
                  <Text style={styles.statLabel}>Material Received</Text>
                </View>

                {/* Good Output */}
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {stats.goodOutput.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.statUnit}>pcs</Text>
                  <Text style={styles.statLabel}>Good Output</Text>
                </View>

                {/* Rejects */}
                <View style={styles.statCard}>
                  <Text style={[styles.statValue, stats.rejectOutput > 0 && { color: '#DC2626' }]}>
                    {stats.rejectOutput.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.statUnit}>pcs</Text>
                  <Text style={styles.statLabel}>Rejects</Text>
                </View>

                {/* Efficiency */}
                <View style={styles.statCard}>
                  {efficiency !== null ? (
                    <>
                      <Text style={[styles.statValue, { color: efficiencyColor(efficiency) }]}>
                        {efficiency.toFixed(1)}
                      </Text>
                      <Text style={styles.statUnit}>%</Text>
                    </>
                  ) : (
                    <Text style={[styles.statValue, { color: theme.colors.textTertiary }]}>
                      —
                    </Text>
                  )}
                  <Text style={styles.statLabel}>Efficiency</Text>
                </View>

                {/* Outbound DCs */}
                <View style={[styles.statCard, styles.statCardWide]}>
                  <View style={styles.statCardRow}>
                    <View style={styles.statCardHalf}>
                      <Text style={styles.statValue}>
                        {stats.outboundCount}
                      </Text>
                      <Text style={styles.statUnit}>DCs</Text>
                      <Text style={styles.statLabel}>Outbound DCs</Text>
                    </View>
                    <View style={[styles.statCardHalf, styles.statCardHalfRight]}>
                      <Text style={styles.statValue}>
                        {stats.outboundQty.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.statUnit}>pcs</Text>
                      <Text style={styles.statLabel}>Total Dispatched</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Per-client breakdown */}
              {breakdown.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: theme.spacing.lg }]}>
                    OUTBOUND BY CLIENT
                  </Text>
                  <View style={styles.breakdownCard}>
                    {breakdown.map((row, i) => (
                      <View
                        key={row.name}
                        style={[
                          styles.breakdownRow,
                          i < breakdown.length - 1 && styles.breakdownRowBorder,
                        ]}
                      >
                        <Text style={styles.breakdownClient}>{row.name}</Text>
                        <Text style={styles.breakdownQty}>
                          {row.qty.toLocaleString('en-IN')} pcs
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {breakdown.length === 0 && stats.outboundCount === 0 && (
                <Text style={styles.empty}>No outbound data for this period.</Text>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  filterRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: '#FFF', fontWeight: '700' },

  container: { padding: theme.spacing.lg },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'flex-start',
  },
  statCardWide: {
    minWidth: '100%',
    flex: undefined,
    width: '100%',
  },
  statCardRow: {
    flexDirection: 'row',
    width: '100%',
  },
  statCardHalf: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statCardHalfRight: {
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    paddingLeft: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 34,
  },
  statUnit: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },

  breakdownCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  breakdownRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  breakdownClient: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  breakdownQty: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },

  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.xxl,
  },
});
