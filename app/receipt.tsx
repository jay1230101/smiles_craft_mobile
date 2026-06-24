import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { Redirect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ms, s } from '@/lib/responsive';
import { useActiveBillStore } from '@/store/active-bill';
import { colors, spacing, typography } from '@/theme';
import type { BillReceiptData } from '@/types/billing';

const HEADING_COLOR = '#1A202C';
const SUBTITLE_COLOR = '#64748B';

export default function ReceiptScreen() {
  const router = useRouter();
  const receipt = useActiveBillStore((s) => s.receipt);
  const clear = useActiveBillStore((s) => s.clear);
  const [sharing, setSharing] = useState(false);

  if (!receipt) {
    return <Redirect href="/(tabs)/billing" />;
  }

  const done = () => {
    clear();
    router.replace('/(tabs)/billing');
  };

  const share = async () => {
    setSharing(true);
    try {
      const html = renderReceiptHtml(receipt);
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt ${receipt.receiptNumber}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing unavailable', 'The receipt PDF was generated but sharing is not available on this device.');
      }
    } catch (err) {
      Alert.alert('Could not share receipt', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSharing(false);
    }
  };

  const patientFullName = `${receipt.patient.name} ${receipt.patient.family}`.trim();

  return (
    <Screen contentContainerStyle={styles.container} edges={['top']}>
      <View style={styles.successBlock}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={ms(36)} color="#FFFFFF" />
        </View>
        <Text style={styles.successTitle}>Payment Recorded</Text>
        <Text style={styles.successSubtitle}>{formatMoney(receipt.amountPaid, receipt.currency)}</Text>
      </View>

      <View style={styles.receiptCard}>
        <Text style={styles.receiptHeader}>Smiles Craft Dental Clinic</Text>
        <Text style={styles.receiptSub}>Payment Receipt</Text>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Receipt #</Text>
          <Text style={styles.metaValue}>{receipt.receiptNumber}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Date</Text>
          <Text style={styles.metaValue}>{formatDate(receipt.date)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Patient</Text>
          <Text style={styles.metaValue}>{patientFullName || 'Patient'}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.lineItemsTitle}>Line Items</Text>
        {receipt.lineItems.map((item, idx) => (
          <View key={`${item.procedure}-${idx}`} style={styles.lineItem}>
            <View style={styles.lineItemText}>
              <Text style={styles.lineItemName}>{item.procedure}</Text>
              {item.toothNumber ? (
                <Text style={styles.lineItemMeta}>{item.toothNumber}</Text>
              ) : null}
            </View>
            <Text style={styles.lineItemAmount}>{formatMoney(item.amount, receipt.currency)}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Amount Paid</Text>
          <Text style={styles.totalValue}>{formatMoney(receipt.amountPaid, receipt.currency)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Remaining Balance</Text>
          <Text style={styles.metaValue}>{formatMoney(receipt.remainingBalance, receipt.currency)}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share receipt"
        onPress={share}
        disabled={sharing}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
        {sharing ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="share-outline" size={ms(18)} color="#FFFFFF" />
            <Text style={styles.primaryLabel}>Share Receipt</Text>
          </>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Done"
        onPress={done}
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
        <Text style={styles.secondaryLabel}>Done</Text>
      </Pressable>
    </Screen>
  );
}

function formatMoney(n: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${(Math.round(n * 100) / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

// Inline HTML template rendered by expo-print into a PDF. Kept simple and
// dependency-free so it prints cleanly across iOS and Android print
// pipelines without needing custom fonts.
function renderReceiptHtml(receipt: BillReceiptData): string {
  const patientName = `${receipt.patient.name} ${receipt.patient.family}`.trim() || 'Patient';
  const rows = receipt.lineItems
    .map(
      (it) => `
      <tr>
        <td>${escapeHtml(it.procedure)}${it.toothNumber ? ` <span class="muted">(${escapeHtml(it.toothNumber)})</span>` : ''}</td>
        <td class="amount">${formatMoney(it.amount, receipt.currency)}</td>
      </tr>`,
    )
    .join('');
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt ${escapeHtml(receipt.receiptNumber)}</title>
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A202C; padding: 32px; }
          h1 { font-size: 22px; margin: 0; }
          h2 { font-size: 14px; margin: 4px 0 24px; color: #64748B; font-weight: normal; }
          .meta { margin: 4px 0; font-size: 13px; }
          .meta strong { display: inline-block; min-width: 110px; color: #64748B; font-weight: 500; }
          .divider { border-top: 1px solid #E2E8F0; margin: 16px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { text-align: left; padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
          th { color: #64748B; font-weight: 500; }
          .amount { text-align: right; }
          .muted { color: #64748B; font-size: 12px; }
          .total { font-size: 18px; font-weight: bold; }
          .total-label { color: #014CA9; }
          .footer { text-align: center; margin-top: 32px; color: #94A3B8; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>Smiles Craft Dental Clinic</h1>
        <h2>Payment Receipt</h2>

        <div class="meta"><strong>Receipt #</strong> ${escapeHtml(receipt.receiptNumber)}</div>
        <div class="meta"><strong>Date</strong> ${escapeHtml(formatDate(receipt.date))}</div>
        <div class="meta"><strong>Patient</strong> ${escapeHtml(patientName)}</div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th>Procedure</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr>
              <td class="total total-label">Amount Paid</td>
              <td class="amount total">${formatMoney(receipt.amountPaid, receipt.currency)}</td>
            </tr>
            <tr>
              <td>Remaining Balance</td>
              <td class="amount">${formatMoney(receipt.remainingBalance, receipt.currency)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">Thank you — Smiles Craft</div>
      </body>
    </html>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  successBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  successCircle: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: HEADING_COLOR,
  },
  successSubtitle: {
    ...typography.title.large,
    fontFamily: 'Inter_700Bold',
    fontSize: ms(28),
    color: colors.primary[500],
  },
  receiptCard: {
    borderRadius: s(14),
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.background.base,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  receiptHeader: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: HEADING_COLOR,
    textAlign: 'center',
  },
  receiptSub: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    ...typography.body.medium,
    color: SUBTITLE_COLOR,
  },
  metaValue: {
    ...typography.body.medium,
    color: HEADING_COLOR,
  },
  lineItemsTitle: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
    marginBottom: spacing.xs,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  lineItemText: {
    flex: 1,
    gap: 2,
  },
  lineItemName: {
    ...typography.body.medium,
    color: HEADING_COLOR,
  },
  lineItemMeta: {
    ...typography.body.small,
    color: SUBTITLE_COLOR,
  },
  lineItemAmount: {
    ...typography.body.medium,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: HEADING_COLOR,
  },
  totalValue: {
    ...typography.title.medium,
    fontFamily: 'Inter_700Bold',
    color: colors.primary[500],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: s(52),
    borderRadius: s(12),
    backgroundColor: colors.primary[500],
  },
  primaryLabel: {
    ...typography.label.large,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: s(48),
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.base,
  },
  secondaryLabel: {
    ...typography.label.large,
    color: colors.primary[500],
  },
  pressed: {
    opacity: 0.7,
  },
});
