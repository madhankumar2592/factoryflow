import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../../constants/theme';

const ITEMS = [
  {
    route: '/(owner)/misc/suppliers' as const,
    icon: '🏭',
    label: 'Suppliers',
    desc: 'Add, view and remove raw material suppliers',
  },
  {
    route: '/(owner)/misc/users' as const,
    icon: '👥',
    label: 'Users',
    desc: 'Manage owner and supervisor accounts',
  },
];

export default function MiscIndex() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Text style={styles.sectionLabel}>ADMIN TOOLS</Text>
        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.card}
            onPress={() => router.push(item.route)}
            activeOpacity={0.75}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardLabel}>{item.label}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { padding: theme.spacing.lg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textTertiary,
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    marginLeft: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  icon: { fontSize: 28, marginRight: theme.spacing.md },
  cardText: { flex: 1 },
  cardLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  cardDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  chevron: {
    fontSize: 24,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.sm,
  },
});
