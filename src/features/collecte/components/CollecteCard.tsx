import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Copy } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { Badge, Button } from '@/components/ui';
import { fontSize, makeStyles, monoFontFamily, radius, shadow, spacing, useTheme } from '@/theme';
import type { UncollectedColis } from '@/types/hubCollecte';

import { AGE_BADGE_TONE, ageTone, formatAge, formatShortDateTime } from '../display';
import type { CollecteActionKind } from '../hooks/useCollecteActions';

export type CollecteCardHandlers = {
  onOpenOrder: (row: UncollectedColis) => void;
  onHistory: (row: UncollectedColis) => void;
  onCollect: (row: UncollectedColis) => void;
  onDeliver: (row: UncollectedColis) => void;
};

type CardProps = CollecteCardHandlers & {
  row: UncollectedColis;
  /** Action en cours sur la commande de cette ligne : désactive ses boutons. */
  pending: CollecteActionKind | null;
};

async function copyTracking(noSuivi: string) {
  try {
    await Clipboard.setStringAsync(noSuivi);
    void Haptics.selectionAsync().catch(() => undefined);
    toast.success('N° de suivi copié');
  } catch {
    toast.error('Copie impossible');
  }
}

/**
 * Colis expédié non collecté : commande, colis n/N, transporteur, n° de suivi, ancienneté et
 * état de l'historique d'étiquettes, puis les actions. Équivalent d'une ligne du tableau web.
 */
function CollecteCardBase({ row, pending, onOpenOrder, onHistory, onCollect, onDeliver }: CardProps) {
  const styles = useStyles();
  const t = useTheme();
  const tone = ageTone(row.ageHours);
  const busy = pending !== null;
  const showBatref = !!row.batrefReference && row.batrefReference !== row.orderReference;

  return (
    <View style={[styles.card, tone === 'over72' && styles.cardCritical]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir la commande ${row.orderReference}`}
        onPress={() => onOpenOrder(row)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.header}>
          <Text style={styles.reference} numberOfLines={1}>
            {row.orderReference}
          </Text>
          <Badge label={formatAge(row.ageHours)} tone={AGE_BADGE_TONE[tone]} />
          <ChevronRight size={16} color={t.textFaint} />
        </View>
        {showBatref ? <Text style={styles.subReference}>{row.batrefReference}</Text> : null}

        <View style={styles.facts}>
          <Fact label="Colis" value={`${row.coliNumber}/${row.totalColis}`} />
          <Fact label="Transporteur" value={row.carrier || '—'} />
          <Fact label="Impression" value={formatShortDateTime(row.dateImpression)} />
          <Fact label="Expédié le" value={formatShortDateTime(row.dateExpedie)} />
          <Fact label="Étiquettes" value={String(row.labelCount)} />
        </View>

        <View style={styles.trackingRow}>
          {row.noSuivi ? (
            <Text style={styles.tracking} numberOfLines={1} selectable>
              {row.noSuivi}
            </Text>
          ) : (
            <Text style={[styles.tracking, { color: t.danger }]}>Sans étiquette</Text>
          )}
          {row.noSuivi ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copier le n° de suivi"
              hitSlop={10}
              onPress={() => void copyTracking(row.noSuivi)}
            >
              <Copy size={16} color={t.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {row.collectedViaHistory ? (
          <View style={styles.badges}>
            <Badge label="Collecté via ancienne étiquette" tone="amber" />
            {row.viaHistoryCollectedAt ? (
              <Text style={styles.viaDate}>le {formatShortDateTime(row.viaHistoryCollectedAt)}</Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        <Button
          label="Historique"
          variant="outline"
          disabled={busy}
          onPress={() => onHistory(row)}
          style={styles.action}
        />
        <Button
          label="Collecter"
          loading={pending === 'collect'}
          disabled={busy}
          onPress={() => onCollect(row)}
          style={styles.action}
        />
        <Button
          label="Livrer"
          variant="secondary"
          loading={pending === 'deliver'}
          disabled={busy}
          onPress={() => onDeliver(row)}
          style={styles.action}
        />
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

export const CollecteCard = memo(CollecteCardBase);

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardCritical: { borderColor: t.danger },
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
  facts: { gap: spacing.xs + 2 },
  fact: { flexDirection: 'row', gap: spacing.md },
  factLabel: { width: 96, fontSize: fontSize.xs, color: t.textSubtle },
  factValue: { flex: 1, fontSize: fontSize.xs, fontWeight: '600', color: t.text },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  tracking: {
    flex: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: t.text,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs + 2 },
  viaDate: { fontSize: fontSize.xs, color: t.textSubtle },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: t.border,
  },
  action: { flex: 1 },
}));
