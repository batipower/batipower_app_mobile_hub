import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatEuro, formatInteger, formatPercent, formatRelative } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { FinancePnlMonthResponse } from '@/types/hubFinance';

import { BASIS_LABELS, PNL_STATUS_LABELS, formatSignedEuros, monthStatus } from './pnl';

type MonthDetailSheetProps = {
  visible: boolean;
  year: number | undefined;
  monthLabel: string;
  /** Calcul enregistré du mois ; `null` tant qu'il n'est pas disponible. */
  data: FinancePnlMonthResponse | null;
  /** Montants sensibles (marge, résultat) visibles, sinon masqués. */
  showAmounts: boolean;
  onClose: () => void;
};

const MASK = '•••• €';

const cents = (value: number | null | undefined) => (value == null ? '—' : formatEuro(value / 100));

/**
 * Détail d'un mois du P&L, en feuille : chaque ligne du compte de résultat avec le prévu, le
 * comptabilisé dans Teogest et l'écart, puis la marge et le résultat (masqués par défaut).
 */
export function MonthDetailSheet({
  visible,
  year,
  monthLabel,
  data,
  showAmounts,
  onClose,
}: MonthDetailSheetProps) {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const sensitive = (value: string) => (showAmounts ? value : MASK);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheet, Platform.OS === 'android' && { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            {monthLabel} {year ?? ''}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            style={styles.close}
          >
            <X size={20} color={t.text} />
          </Pressable>
        </View>

        {data ? (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + spacing['2xl'] },
            ]}
          >
            <Text style={styles.meta}>
              {PNL_STATUS_LABELS[monthStatus(data)]} · calculé{' '}
              {formatRelative(data.computedAt) ?? '—'} · {formatInteger(data.internal.orders)}{' '}
              commandes, {formatInteger(data.internal.invoices)} factures,{' '}
              {formatInteger(data.internal.slips)} avoirs
            </Text>

            <View style={styles.table}>
              <View style={[styles.line, styles.lineHead]}>
                <Text style={[styles.cellLabel, styles.headText]}>Poste</Text>
                <Text style={[styles.cell, styles.headText]}>Prévu</Text>
                <Text style={[styles.cell, styles.headText]}>Teogest</Text>
              </View>
              {data.lines.map((line) => (
                <View key={line.id} style={styles.line}>
                  <View style={styles.cellLabel}>
                    <Text style={styles.lineName}>{line.label}</Text>
                    {line.gapCents !== null ? (
                      <Text style={styles.lineGap}>
                        Écart {formatSignedEuros(line.gapCents)}
                        {line.gapPct === null ? '' : ` (${formatPercent(line.gapPct)})`}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.cell}>{cents(line.forecastCents)}</Text>
                  <Text style={[styles.cell, styles.cellStrong]}>
                    {cents(line.accountingCents)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.summary}>
              <SummaryRow
                label="Marge"
                forecast={sensitive(cents(data.margin.forecastCents))}
                accounting={sensitive(cents(data.margin.accountingCents))}
              />
              <SummaryRow
                label="Résultat"
                forecast={sensitive(cents(data.result.estimatedCents))}
                accounting={sensitive(cents(data.result.accountingCents))}
                note={`Estimé sur : ${BASIS_LABELS[data.result.estimatedBasis].toLowerCase()}`}
              />
            </View>
            {!showAmounts ? (
              <Text style={styles.meta}>
                Marge et résultat sont masqués : activez « Marge » sur l&apos;écran Financier.
              </Text>
            ) : null}
          </ScrollView>
        ) : (
          <Text style={styles.meta}>Ce mois n&apos;a pas encore été calculé.</Text>
        )}
      </View>
    </Modal>
  );
}

function SummaryRow({
  label,
  forecast,
  accounting,
  note,
}: {
  label: string;
  forecast: string;
  accounting: string;
  note?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.line}>
      <View style={styles.cellLabel}>
        <Text style={styles.lineName}>{label}</Text>
        {note ? <Text style={styles.lineGap}>{note}</Text> : null}
      </View>
      <Text style={styles.cell}>{forecast}</Text>
      <Text style={[styles.cell, styles.cellStrong]}>{accounting}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  sheet: { flex: 1, backgroundColor: t.bgElevated },
  header: {
    minHeight: hitTarget + spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  close: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surfaceStrong,
  },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },
  meta: {
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.textSubtle,
    paddingHorizontal: spacing.xl,
  },
  table: { borderRadius: radius.md, backgroundColor: t.surface, overflow: 'hidden' },
  summary: { borderRadius: radius.md, backgroundColor: t.surface, overflow: 'hidden' },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  lineHead: { backgroundColor: t.surfaceStrong, paddingVertical: spacing.sm },
  headText: { fontSize: 11, fontWeight: '700', color: t.textSubtle },
  cellLabel: { flex: 1.3, gap: 1 },
  cell: { flex: 1, textAlign: 'right', fontSize: fontSize.xs, color: t.textMuted },
  cellStrong: { fontWeight: '700', color: t.text },
  lineName: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  lineGap: { fontSize: 11, color: t.textSubtle },
}));
