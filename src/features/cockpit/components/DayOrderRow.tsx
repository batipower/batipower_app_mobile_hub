import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { originLabel, originTone } from '@/features/orders/orderDisplay';
import { formatEuro, formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';
import type { HubDayOrderRow } from '@/types/hubDashboard';

import { formatParisTime } from '../dates';

type DayOrderRowProps = {
  order: HubDayOrderRow;
  showMargin: boolean;
};

/** Ouvre la fiche d'une commande depuis le cockpit (pile de l'onglet Cockpit). */
function openOrder(reference: string) {
  router.push({ pathname: '/hub/cockpit/commande/[reference]', params: { reference } });
}

/** Commande réalisée d'un jour : référence, heure, origine, CA HT et (au choix) marge. */
export const DayOrderRow = memo(function DayOrderRow({ order, showMargin }: DayOrderRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const marginPct = order.caHT > 0 ? (order.marginHT / order.caHT) * 100 : null;

  return (
    <Pressable
      onPress={() => openOrder(order.reference)}
      accessibilityRole="button"
      accessibilityLabel={`Commande ${order.reference}, ${formatEuro(order.caHT)} HT`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.cardPressed }]}
    >
      <View style={styles.main}>
        <View style={styles.top}>
          <Text style={styles.reference} numberOfLines={1}>
            {order.reference}
          </Text>
          <Text style={styles.time}>{formatParisTime(order.createdAt)}</Text>
        </View>
        <View style={styles.badges}>
          <Badge label={originLabel(order.origin)} tone={originTone(order.origin)} />
          {order.fromQuote ? <Badge label="Devis" tone="purple" /> : null}
          {order.incomplete ? <Badge label="Marge à confirmer" tone="amber" /> : null}
          <Text style={styles.units}>
            {formatInteger(order.units)} unité{order.units > 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      <View style={styles.amounts}>
        <Text style={styles.ca}>{formatEuro(order.caHT)}</Text>
        {showMargin ? (
          <Text style={[styles.margin, order.marginHT < 0 && { color: t.danger }]}>
            {formatEuro(order.marginHT)}
            {marginPct !== null ? ` · ${formatPercent(marginPct)}` : ''}
          </Text>
        ) : (
          <Text style={styles.margin}>HT</Text>
        )}
      </View>
      <ChevronRight size={16} color={t.textFaint} />
    </Pressable>
  );
});

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  main: { flex: 1, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: {
    flexShrink: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.accentText,
  },
  time: { fontSize: fontSize.xs, color: t.textSubtle },
  badges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  units: { fontSize: 11, color: t.textSubtle },
  amounts: { alignItems: 'flex-end', gap: 2 },
  ca: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  margin: { fontSize: 11, fontWeight: '600', color: t.textMuted },
}));
