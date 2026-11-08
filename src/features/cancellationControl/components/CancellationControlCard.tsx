import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, ChevronRight } from 'lucide-react-native';

import type { HubCancellationControlItem } from '@/api/hubCancellationControl';
import { Badge, Button } from '@/components/ui';
import { warehouseLabel } from '@/features/pricing/options';
import { formatDateTime, formatEuro } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';

import {
  controlOutcome,
  creditNoteView,
  formatAge,
  hasAnyAction,
  type CancellationControlTab,
  type RowActions,
  type TextTone,
} from '../display';

export type CancellationCardHandlers = {
  onOpenOrder: (item: HubCancellationControlItem) => void;
  onRecheck: (item: HubCancellationControlItem) => void;
  onIgnore: (item: HubCancellationControlItem) => void;
  onValidateCreditNote: (item: HubCancellationControlItem) => void;
  onReviewCreditNote: (item: HubCancellationControlItem) => void;
  onUnreviewCreditNote: (item: HubCancellationControlItem) => void;
};

type CardProps = CancellationCardHandlers & {
  item: HubCancellationControlItem;
  tab: CancellationControlTab;
  actions: RowActions;
  /** Mutation en cours sur cette ligne : désactive ses boutons et affiche un spinner. */
  pending: 'recheck' | 'validate' | 'review' | null;
  highlighted: boolean;
};

function useToneColor() {
  const t = useTheme();
  return (tone: TextTone) =>
    ({
      danger: t.danger,
      warning: t.warning,
      success: t.success,
      muted: t.textSubtle,
      neutral: t.text,
    })[tone];
}

/**
 * Alerte du contrôle des annulations : commande, entrepôt, BL encore présents, résultat du
 * contrôle eBatPro, avoir, puis actions selon le rôle. Équivalent d'une ligne du tableau web.
 */
function CancellationControlCardBase({
  item,
  tab,
  actions,
  pending,
  highlighted,
  onOpenOrder,
  onRecheck,
  onIgnore,
  onValidateCreditNote,
  onReviewCreditNote,
  onUnreviewCreditNote,
}: CardProps) {
  const styles = useStyles();
  const t = useTheme();
  const toneColor = useToneColor();
  const outcome = controlOutcome(item, tab);
  const creditNote = creditNoteView(item);
  const title = item.ebatRef || item.orderReference;
  const busy = pending !== null;

  return (
    <View style={[styles.card, highlighted && styles.highlighted]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir la commande ${title}`}
        onPress={() => onOpenOrder(item)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.header}>
          <Text style={styles.reference} numberOfLines={1}>
            {title}
          </Text>
          <ChevronRight size={16} color={t.textFaint} />
        </View>
        {item.ebatRef ? <Text style={styles.subReference}>{item.orderReference}</Text> : null}

        <View style={styles.badges}>
          <Badge label={warehouseLabel(item.warehouse)} tone="blue" />
          {item.purpose === 'EBAT_DUPLICATE' ? (
            <Badge
              label={`Doublon eBat${item.targetEbatNumber ? ` ${item.targetEbatNumber}` : ''}`}
              tone="amber"
            />
          ) : null}
          {item.origin ? <Badge label={item.origin} tone="neutral" /> : null}
        </View>

        <View style={styles.facts}>
          {item.ebatNumber ? (
            <Fact
              label="Commande eBat"
              value={
                [
                  item.ebatNumber,
                  item.purpose === 'EBAT_DUPLICATE' &&
                  item.targetEbatNumber &&
                  item.targetEbatNumber !== item.ebatNumber
                    ? `cible ${item.targetEbatNumber}`
                    : null,
                  item.ebatStatusLabel,
                ]
                  .filter(Boolean)
                  .join(' · ')
              }
              mono
            />
          ) : null}
          {item.deliveryNotes.length > 0 ? (
            <Fact label="BL trouvés" value={item.deliveryNotes.join('\n')} mono />
          ) : null}
          {item.estimatedPurchaseHT != null ? (
            <Fact label="Achat HT estimé" value={formatEuro(item.estimatedPurchaseHT)} />
          ) : null}
          <Fact
            label="Validée par"
            value={[item.validatedByName || '—', formatDateTime(item.validatedAt)]
              .filter(Boolean)
              .join(' · ')}
          />
          <Fact label="Dernière vérif." value={formatDateTime(item.checkedAt) ?? '—'} />
          <Fact label="Ancienneté" value={formatAge(item.daysSinceValidation)} />
        </View>

        <View style={styles.block}>
          <Text style={styles.blockLabel}>Contrôle</Text>
          {outcome.map((line, index) => (
            <Text
              key={index}
              style={[
                styles.blockText,
                { color: toneColor(line.tone) },
                line.tone === 'muted' && styles.italic,
              ]}
            >
              {line.text}
            </Text>
          ))}
        </View>

        {creditNote ? (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Avoir</Text>
            <Text style={[styles.blockText, styles.bold, { color: toneColor(creditNote.tone) }]}>
              {creditNote.title}
            </Text>
            {creditNote.lines.map((line) => (
              <Text key={line} style={[styles.blockText, { color: t.textMuted }]}>
                {line}
              </Text>
            ))}
            {creditNote.reference ? (
              <Text style={[styles.blockText, styles.mono, { color: t.text }]}>
                {creditNote.reference}
              </Text>
            ) : null}
            {creditNote.comment ? (
              <Text style={[styles.blockText, styles.italic, { color: t.textSubtle }]}>
                {creditNote.comment}
              </Text>
            ) : null}
            {creditNote.reviewed ? (
              <View style={styles.reviewed}>
                <BadgeCheck size={14} color={t.success} />
                <Text style={[styles.blockText, { color: t.success }]}>
                  Déclaration validée {creditNote.reviewed}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {hasAnyAction(actions) ? (
        <View style={styles.actions}>
          {actions.validateCreditNote ? (
            <Button
              label="Valider l'avoir"
              loading={pending === 'validate'}
              disabled={busy}
              onPress={() => onValidateCreditNote(item)}
              style={styles.action}
            />
          ) : null}
          {actions.reviewCreditNote ? (
            <Button
              label="Valider la déclaration"
              loading={pending === 'review'}
              disabled={busy}
              onPress={() => onReviewCreditNote(item)}
              style={styles.action}
            />
          ) : null}
          {actions.unreviewCreditNote ? (
            <Button
              label="Remettre à revoir"
              variant="outline"
              loading={pending === 'review'}
              disabled={busy}
              onPress={() => onUnreviewCreditNote(item)}
              style={styles.action}
            />
          ) : null}
          {actions.recheckIgnore ? (
            <>
              <Button
                label="Re-vérifier"
                variant="outline"
                loading={pending === 'recheck'}
                disabled={busy}
                onPress={() => onRecheck(item)}
                style={styles.action}
              />
              <Button
                label="Ignorer"
                variant="outline"
                disabled={busy}
                onPress={() => onIgnore(item)}
                style={styles.action}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

export const CancellationControlCard = memo(CancellationControlCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: 'hidden',
    ...shadow.sm,
  },
  highlighted: { borderColor: t.warning, borderWidth: 1.5 },
  body: { gap: spacing.sm, padding: spacing.lg },
  pressed: { backgroundColor: t.cardPressed },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    flex: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  subReference: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textSubtle },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  facts: { gap: spacing.xs + 2 },
  fact: { flexDirection: 'row', gap: spacing.md },
  factLabel: { width: 112, fontSize: fontSize.xs, color: t.textSubtle },
  factValue: { flex: 1, fontSize: fontSize.xs, fontWeight: '600', color: t.text },
  mono: { fontFamily: monoFontFamily },
  block: {
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  blockText: { fontSize: fontSize.xs, lineHeight: 17 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  reviewed: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: t.border,
  },
  action: { flexGrow: 1, flexBasis: '45%' },
}));
