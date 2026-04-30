import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface DCListItemProps {
  date: string;
  reference: string;
  party: string;
  quantity: string;
  details?: Record<string, string | number | undefined>;
}

export function DCListItem({ date, reference, party, quantity, details }: DCListItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity style={styles.container} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.reference}>{reference}</Text>
          <Text style={styles.party}>{party}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.quantity}>{quantity}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </View>
      {expanded && details && (
        <View style={styles.details}>
          {Object.entries(details).map(([key, val]) =>
            val !== undefined && val !== '' ? (
              <View key={key} style={styles.detailRow}>
                <Text style={styles.detailKey}>{key}</Text>
                <Text style={styles.detailVal}>{String(val)}</Text>
              </View>
            ) : null
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  left: { flex: 1 },
  right: { alignItems: 'flex-end' },
  reference: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  party: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  quantity: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  date: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginLeft: 4,
  },
  details: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailKey: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  detailVal: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
});
