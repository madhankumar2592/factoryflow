import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { SummaryCard } from '../../components/SummaryCard';
import { theme } from '../../constants/theme';

interface DashboardData {
  materialIn: number;
  goodProduction: number;
  rejects: number;
  efficiency: number | null;
  outboundCount: number;
  recentActivity: any[];
}

export default function OwnerDashboard() {
  const { profile } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const [data, setData] = useState<DashboardData>({
    materialIn: 0, goodProduction: 0, rejects: 0,
    efficiency: null, outboundCount: 0, recentActivity: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [inbRes, prodRes, outRes, actInb, actProd, actOut] = await Promise.all([
      supabase.from('inbound_dcs').select('quantity_kg').eq('challan_date', today),
      supabase.from('production_logs').select('good_qty, reject_qty').gte('created_at', today),
      supabase.from('outbound_dcs').select('id', { count: 'exact', head: true }).eq('dc_date', today),
      supabase.from('inbound_dcs').select('challan_no, challan_date, suppliers(name), quantity_kg').order('created_at', { ascending: false }).limit(5),
      supabase.from('production_logs').select('good_qty, reject_qty, created_at, jobs(item_name)').order('created_at', { ascending: false }).limit(3),
      supabase.from('outbound_dcs').select('dc_no, dc_date, clients(name), quantity').order('created_at', { ascending: false }).limit(3),
    ]);

    const materialIn = (inbRes.data ?? []).reduce((s, r) => s + (r.quantity_kg || 0), 0);
    const goodProduction = (prodRes.data ?? []).reduce((s, r) => s + (r.good_qty || 0), 0);
    const rejects = (prodRes.data ?? []).reduce((s, r) => s + (r.reject_qty || 0), 0);
    const total = goodProduction + rejects;
    const efficiency = total > 0 ? Math.round((goodProduction / total) * 100) : null;

    const recentActivity = [
      ...(actInb.data ?? []).map((r: any) => ({
        type: 'Inbound DC', ref: `#${r.challan_no}`, party: r.suppliers?.name ?? '—', qty: `${r.quantity_kg} KG`,
      })),
      ...(actProd.data ?? []).map((r: any) => ({
        type: 'Production', ref: r.jobs?.item_name ?? '—', party: `${r.good_qty} good / ${r.reject_qty} reject`, qty: '',
      })),
      ...(actOut.data ?? []).map((r: any) => ({
        type: 'Outbound DC', ref: `#${r.dc_no}`, party: r.clients?.name ?? '—', qty: `${r.quantity} pcs`,
      })),
    ];

    setData({ materialIn, goodProduction, rejects, efficiency, outboundCount: outRes.count ?? 0, recentActivity });
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.container, isWeb && styles.containerWeb]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>
              {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
            </Text>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.sub}>
              {profile?.companies?.name ?? 'FactoryFlow'} · Today's summary
            </Text>
          </View>
        </View>

        <View style={[styles.cardsGrid, isWeb && styles.cardsGridWeb]}>
          <SummaryCard title="Material In" value={data.materialIn.toFixed(1)} unit="KG" />
          <SummaryCard title="Good Production" value={data.goodProduction} unit="pcs" color={theme.colors.success} />
          <SummaryCard title="Rejects" value={data.rejects} unit="pcs" color={theme.colors.danger} />
          <SummaryCard
            title="Efficiency"
            value={data.efficiency !== null ? `${data.efficiency}%` : '—'}
            color={data.efficiency !== null && data.efficiency >= 90 ? theme.colors.success : theme.colors.warning}
          />
          <SummaryCard title="Outbound DCs" value={data.outboundCount} unit="today" />
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {data.recentActivity.length === 0 ? (
          <Text style={styles.empty}>No activity yet today.</Text>
        ) : (
          data.recentActivity.map((item, i) => (
            <View key={i} style={[styles.activityRow, i % 2 === 0 && styles.activityRowAlt]}>
              <View style={styles.actBadge}>
                <Text style={styles.actBadgeText}>{item.type}</Text>
              </View>
              <Text style={styles.actRef}>{item.ref}</Text>
              <Text style={styles.actParty}>{item.party}</Text>
              {item.qty ? <Text style={styles.actQty}>{item.qty}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg },
  containerWeb: { maxWidth: 1200, alignSelf: 'center', width: '100%' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
  },
  greeting: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  title: { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold },
  sub: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 6 },
  signout: { fontSize: theme.fontSize.sm, color: theme.colors.danger },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginBottom: theme.spacing.xl },
  cardsGridWeb: { flexDirection: 'row' },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.md,
  },
  empty: { color: theme.colors.textSecondary, fontSize: theme.fontSize.md },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  activityRowAlt: { backgroundColor: theme.colors.surface },
  actBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  actBadgeText: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary },
  actRef: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold, flex: 1 },
  actParty: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary },
  actQty: { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.medium, color: theme.colors.textPrimary },
});
