import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Monitor, Smartphone, Tablet, Tag } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { OriginLogo } from '@/features/orders/components/OriginLogo';
import { deviceLabel, originLabel } from '@/features/orders/orderDisplay';
import { formatEuro, formatInteger, formatPercent } from '@/lib/format';
import {
  fontSize,
  makeStyles,
  monoFontFamily,
  radius,
  shadow,
  spacing,
  useTheme,
  withAlpha,
} from '@/theme';
import type { HubDayOrderRow, HubOrderDevice } from '@/types/hubDashboard';

import { formatParisTime } from '../dates';

type DayOrderRowProps = {
  order: HubDayOrderRow;
  showMargin: boolean;
};

/** Ouvre la fiche d'une commande depuis le cockpit (pile de l'onglet Cockpit). */
function openOrder(reference: string) {
  router.push({ pathname: '/hub/cockpit/commande/[reference]', params: { reference } });
}

const DEVICE_ICONS = { mobile: Smartphone, tablet: Tablet, desktop: Monitor } as const;

/** Code promo de la commande : code (ou « Remise » si inconnu) et remise TTC ; rien sans remise. */
function PromoBadge({ promo }: { promo: HubDayOrderRow['promo'] }) {
  const styles = useStyles();
  const t = useTheme();
  if (!promo?.used) return null;
  const code = promo.code?.trim() || null;
  const discount =
    promo.discountTTC != null && promo.discountTTC > 0 ? formatEuro(promo.discountTTC) : null;
  const color = code ? t.success : t.warning;
  return (
    <View
      style={[
        styles.promo,
        { borderColor: withAlpha(color, 0.5), backgroundColor: withAlpha(color, 0.12) },
      ]}
      accessible
      accessibilityLabel={`${code ? `Code promo ${code}` : 'Remise appliquée'}${discount ? `, remise ${discount} TTC` : ''}`}
    >
      {code ? <Tag size={10} color={color} /> : null}
      <Text style={[styles.promoText, { color }]} numberOfLines={1}>
        {code ?? 'Remise'}
        {discount ? ` · −${discount} TTC` : ''}
      </Text>
    </View>
  );
}

/** Commande réalisée d'un jour : référence, heure, origine (logo), promo, appareil, CA HT et marge. */
export const DayOrderRow = memo(function DayOrderRow({ order, showMargin }: DayOrderRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const marginPct = order.caHT > 0 ? (order.marginHT / order.caHT) * 100 : null;
  const device = order.device && deviceLabel(order.device) ? order.device : null;
  const DeviceIcon = device ? DEVICE_ICONS[device as HubOrderDevice] : null;

  return (
    <Pressable
      onPress={() => openOrder(order.reference)}
      accessibilityRole="button"
      accessibilityLabel={`Commande ${order.reference}, ${formatEuro(order.caHT)} HT`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.cardPressed }]}
    >
      <OriginLogo origin={order.origin} size={36} />
      <View style={styles.main}>
        <View style={styles.top}>
          <Text style={styles.reference} numberOfLines={1}>
            {order.reference}
          </Text>
          <Text style={styles.time}>{formatParisTime(order.createdAt)}</Text>
          {DeviceIcon && device ? (
            <View accessible accessibilityLabel={`Appareil : ${deviceLabel(device)}`}>
              <DeviceIcon size={12} color={t.textSubtle} />
            </View>
          ) : null}
        </View>
        <View style={styles.badges}>
          <Text style={styles.origin} numberOfLines={1}>
            {originLabel(order.origin)}
          </Text>
          <PromoBadge promo={order.promo} />
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
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    ...shadow.sm,
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
  origin: { fontSize: 11, fontWeight: '700', color: t.textMuted },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: 190,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  promoText: { flexShrink: 1, fontSize: 10, fontWeight: '700' },
  units: { fontSize: 11, color: t.textSubtle },
  amounts: { alignItems: 'flex-end', gap: 2 },
  ca: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  margin: { fontSize: 11, fontWeight: '600', color: t.textMuted },
}));
