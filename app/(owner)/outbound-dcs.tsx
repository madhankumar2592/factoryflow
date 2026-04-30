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
import { OutboundDC } from '../../types';

export default function OutboundDCsScreen() {
  const [records, setRecords] = useState<OutboundDC[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    let query = supabase
      .from('outbound_dcs')
      .select('*, clients(*)')
      .order('created_at', { ascending: false });
    if (!showAll) query = query.eq('dc_date', today);
    const { data } = await query;
    setRecords(data ?? []);
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
          <Text style={styles.empty}>No outbound DCs {showAll ? '' : 'today'}.</Text>
        )}
        {records.map((r) => (
          <DCListItem
            key={r.id}
            date={r.dc_date}
            reference={`DC #${r.dc_no}`}
            party={r.clients?.name ?? '—'}
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
        ))}
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
