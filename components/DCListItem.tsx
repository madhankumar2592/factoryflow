import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { theme } from '../constants/theme';

export interface LineItemDisplay {
  desc: string;
  qty: string;
  amount?: string;
  hsn?: string;       // shown when item row is expanded
  subDetail?: string; // extra line e.g. "₹175/KG" for inbound rate
}

interface DCListItemProps {
  date: string;
  reference: string;
  party: string;
  quantity: string;
  details?: Record<string, string | number | undefined>;
  lineItems?: LineItemDisplay[];
  onDownload?: () => void;
}

// Suppress browser focus ring on web
const noOutline = { outline: 'none' };

export function DCListItem({ date, reference, party, quantity, details, lineItems, onDownload }: DCListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedLineItems, setExpandedLineItems] = useState<Set<number>>(new Set());

  function toggleLineItem(i: number) {
    setExpandedLineItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <TouchableOpacity
      style={[styles.container, Platform.OS === 'web' && (noOutline as any)]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
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

      {expanded && (
        <View style={styles.details}>

          {/* Line items table — each row is tappable if it has HSN/subDetail */}
          {lineItems && lineItems.length > 0 && (
            <View style={styles.lineItemsSection}>
              <Text style={styles.lineItemsHeader}>ITEMS</Text>
              {lineItems.map((item, i) => {
                const hasExtra = !!(item.hsn || item.subDetail);
                const isItemExpanded = expandedLineItems.has(i);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.lineItemRow,
                      i < lineItems.length - 1 && styles.lineItemBorder,
                      Platform.OS === 'web' && (noOutline as any),
                    ]}
                    onPress={(e) => {
                      if (hasExtra) {
                        e.stopPropagation?.();
                        toggleLineItem(i);
                      }
                    }}
                    activeOpacity={hasExtra ? 0.6 : 1}
                  >
                    <Text style={styles.lineItemIndex}>{i + 1}</Text>
                    <View style={styles.lineItemMiddle}>
                      <Text style={styles.lineItemDesc}>{item.desc}</Text>
                      {isItemExpanded && item.hsn && (
                        <Text style={styles.lineItemSub}>HSN: {item.hsn}</Text>
                      )}
                      {isItemExpanded && item.subDetail && (
                        <Text style={styles.lineItemSub}>{item.subDetail}</Text>
                      )}
                    </View>
                    <Text style={styles.lineItemQty}>{item.qty}</Text>
                    {item.amount ? <Text style={styles.lineItemAmount}>{item.amount}</Text> : null}
                    {hasExtra && (
                      <Text style={styles.lineItemChevron}>{isItemExpanded ? '▲' : '▼'}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Other details */}
          {details && Object.entries(details).map(([key, val]) =>
            val !== undefined && val !== '' ? (
              <View key={key} style={styles.detailRow}>
                <Text style={styles.detailKey}>{key}</Text>
                <Text style={styles.detailVal}>{String(val)}</Text>
              </View>
            ) : null
          )}

          {/* Download / Print button */}
          {onDownload && (
            <TouchableOpacity
              style={[styles.downloadBtn, Platform.OS === 'web' && (noOutline as any)]}
              onPress={(e) => { e.stopPropagation?.(); onDownload(); }}
            >
              <Text style={styles.downloadTxt}>🖨️  Print / Download PDF</Text>
            </TouchableOpacity>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  left: { flex: 1 },
  right: { alignItems: 'flex-end' },
  reference: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.textPrimary },
  party: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, marginTop: 2 },
  quantity: { fontSize: theme.fontSize.md, fontWeight: '700', color: theme.colors.textPrimary },
  date: { fontSize: theme.fontSize.xs, color: theme.colors.textTertiary, marginTop: 2 },
  chevron: { fontSize: 10, color: theme.colors.textTertiary, marginLeft: 4 },

  details: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.xs,
  },

  lineItemsSection: { marginBottom: theme.spacing.sm },
  lineItemsHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  lineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  lineItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lineItemIndex: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textTertiary,
    width: 16,
    fontWeight: '600',
  },
  lineItemMiddle: { flex: 1 },
  lineItemDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  lineItemSub: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  lineItemQty: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'right',
  },
  lineItemAmount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  lineItemChevron: {
    fontSize: 9,
    color: theme.colors.textTertiary,
    marginLeft: 4,
    width: 12,
    textAlign: 'center',
  },

  downloadBtn: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  downloadTxt: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailKey: { fontSize: theme.fontSize.sm, color: theme.colors.textSecondary, flex: 1 },
  detailVal: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
});
