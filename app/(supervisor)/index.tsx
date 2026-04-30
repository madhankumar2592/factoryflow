import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { theme } from '../../constants/theme';

export default function SupervisorHome() {
  const { profile, signOut } = useAuthStore();
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [counts, setCounts] = useState({ inbound: 0, production: 0, outbound: 0 });

  useEffect(() => {
    loadCounts();
  }, []);

  async function loadCounts() {
    const [inb, prod, out] = await Promise.all([
      supabase.from('inbound_dcs').select('id', { count: 'exact', head: true }).eq('challan_date', today),
      supabase.from('production_logs').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('outbound_dcs').select('id', { count: 'exact', head: true }).eq('dc_date', today),
    ]);
    setCounts({
      inbound: inb.count ?? 0,
      production: prod.count ?? 0,
      outbound: out.count ?? 0,
    });
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const actions = [
    {
      label: 'LOG INBOUND DC',
      sublabel: 'Raw material received',
      count: counts.inbound,
      route: '/(supervisor)/inbound-dc' as const,
    },
    {
      label: 'LOG PRODUCTION',
      sublabel: 'Shift output',
      count: counts.production,
      route: '/(supervisor)/production-log' as const,
    },
    {
      label: 'LOG OUTBOUND DC',
      sublabel: 'Goods dispatched',
      count: counts.outbound,
      route: '/(supervisor)/outbound-dc' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'Supervisor'}
          </Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

        <View style={styles.actions}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.route}
              style={styles.actionCard}
              onPress={() => router.push(action.route)}
              activeOpacity={0.85}
            >
              <View style={styles.actionLeft}>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionSublabel}>{action.sublabel}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{action.count} today</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg },
  header: { marginBottom: theme.spacing.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  signoutBtn: {
    marginTop: 4,
  },
  signoutText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.danger,
    fontWeight: '500',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  signout: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.danger,
    marginTop: theme.spacing.xs,
  },
  greeting: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  date: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  actions: { gap: theme.spacing.md },
  actionCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 80,
  },
  actionLeft: { flex: 1 },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.5,
  },
  actionSublabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: theme.fontSize.sm,
    marginTop: 4,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
  },
});
