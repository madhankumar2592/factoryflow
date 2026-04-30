import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { theme } from '../../../constants/theme';
import { Job, JobStatus } from '../../../types';

type FilterKey = 'all' | JobStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'running',   label: 'Running' },
  { key: 'paused',    label: 'Paused' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_BADGE: Record<JobStatus, { label: string; color: string; bg: string }> = {
  running:   { label: 'Running',   color: '#16A34A', bg: '#F0FDF4' },
  paused:    { label: 'Paused',    color: '#D97706', bg: '#FFFBEB' },
  completed: { label: 'Completed', color: '#6E6E73', bg: '#F5F5F5' },
};

const STATUS_PICKER_OPTIONS: { key: JobStatus; label: string }[] = [
  { key: 'running',   label: 'Running' },
  { key: 'paused',    label: 'Paused' },
  { key: 'completed', label: 'Completed' },
];

type JobWithClient = Job & { vendors: { name: string } | null };

export default function JobsScreen() {
  const [jobs, setJobs] = useState<JobWithClient[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*, vendors!client_id(name)')
      .order('created_at', { ascending: false });
    setJobs((data as JobWithClient[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const countFor = (key: FilterKey) =>
    key === 'all' ? jobs.length : jobs.filter((j) => j.status === key).length;

  const displayed = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  async function handleStatusChange(id: string, status: JobStatus) {
    setUpdatingId(id);
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setExpandedId(null);
      await load();
    }
    setUpdatingId(null);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.pill, filter === f.key && styles.pillActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
              {f.label} ({countFor(f.key)})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {displayed.length === 0 ? (
          <Text style={styles.empty}>
            {jobs.length === 0 ? 'No jobs found.' : `No ${filter} jobs.`}
          </Text>
        ) : (
          displayed.map((job) => {
            const badge = STATUS_BADGE[job.status];
            const isExpanded = expandedId === job.id;
            const isUpdating = updatingId === job.id;

            return (
              <TouchableOpacity
                key={job.id}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => setExpandedId(isExpanded ? null : job.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardName}>{job.item_name}</Text>
                    <Text style={styles.cardClient}>
                      {(job.vendors as any)?.name ?? '—'}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.picker}>
                    <Text style={styles.pickerLabel}>CHANGE STATUS</Text>
                    <View style={styles.pickerRow}>
                      {STATUS_PICKER_OPTIONS.map((opt) => {
                        const optBadge = STATUS_BADGE[opt.key];
                        const isActive = job.status === opt.key;
                        return (
                          <TouchableOpacity
                            key={opt.key}
                            style={[
                              styles.pickerBtn,
                              { borderColor: optBadge.color },
                              isActive && { backgroundColor: optBadge.bg },
                              isUpdating && { opacity: 0.5 },
                            ]}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              if (!isUpdating && !isActive) {
                                handleStatusChange(job.id, opt.key);
                              }
                            }}
                            disabled={isUpdating}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.pickerBtnText, { color: optBadge.color }]}>
                              {isUpdating && isActive ? '…' : opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLeft: { flex: 1 },
  cardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardClient: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.xl,
    marginRight: theme.spacing.sm,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 10, color: theme.colors.textTertiary },

  picker: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  pickerBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  pickerBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },

  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.xxl,
  },
});
