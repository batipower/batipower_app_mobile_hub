import { Pressable, Text, View } from 'react-native';
import { Lock, Pencil } from 'lucide-react-native';

import { formatEuro, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

import { DEFAULT_COMMISSION } from '../config';
import type { MarketplaceConfigEntry } from '../config';
import type { MarketplaceCountryView } from '../viewModel';

type TileProps = {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  /** Rend la tuile cliquable (modification SUPERADMIN). */
  onPress?: () => void;
  masked?: boolean;
};

function Tile({ label, value, sub, color, onPress, masked }: TileProps) {
  const styles = useStyles();
  const t = useTheme();
  const body = (
    <>
      <View style={styles.tileHead}>
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
        {masked ? <Lock size={10} color={t.textFaint} /> : onPress ? <Pencil size={10} color={t.accentText} /> : null}
      </View>
      <Text style={[styles.tileValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {masked ? '••••' : value}
      </Text>
      {sub && !masked ? (
        <Text style={styles.tileSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </>
  );
  if (!onPress || masked) return <View style={styles.tile}>{body}</View>;
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      accessibilityHint="Modifier"
    >
      {body}
    </Pressable>
  );
}

type Props = {
  config: MarketplaceConfigEntry;
  view: MarketplaceCountryView;
  /** MANAGER : les valeurs financières sont masquées. */
  masked: boolean;
  onEditObjective?: () => void;
  onEditCommission?: () => void;
};

/**
 * Quatre repères financiers de l'offre : marge HT et son taux, commission, objectif HT et prix
 * d'équilibre HT (marge nulle). Le SUPERADMIN touche l'objectif ou la commission pour les modifier.
 */
export function MarketplaceKpis({ config, view, masked, onEditObjective, onEditCommission }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const marginColor = view.isProfitable == null ? undefined : view.isProfitable ? t.success : t.danger;
  const rate = view.commissionRate;
  const fallbackRate = DEFAULT_COMMISSION[config.key] * 100;

  return (
    <View style={styles.grid}>
      <Tile
        label="Marge HT"
        value={view.margeHT == null ? '—' : formatEuro(view.margeHT)}
        sub={view.tauxMarge == null ? undefined : formatPercent(view.tauxMarge)}
        color={marginColor}
        masked={masked}
      />
      <Tile
        label="Commission"
        value={rate == null ? `${formatPercent(fallbackRate, 0)} (défaut)` : formatPercent(rate)}
        onPress={onEditCommission}
        masked={masked}
      />
      <Tile
        label="Objectif HT"
        value={view.targetPriceHT == null ? '—' : formatEuro(view.targetPriceHT)}
        onPress={config.targetField && view.country === 'FR' ? onEditObjective : undefined}
        masked={masked}
      />
      <Tile
        label="Prix d'équilibre HT"
        value={view.equilibriumHT == null ? '—' : formatEuro(view.equilibriumHT)}
        sub={view.equilibriumTTC == null ? undefined : `${formatEuro(view.equilibriumTTC)} TTC`}
        masked={masked}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '47%',
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  pressed: { opacity: 0.7 },
  tileHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  tileLabel: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  tileValue: { fontSize: fontSize.base, fontWeight: '800', color: t.text },
  tileSub: { fontSize: fontSize.xs, color: t.textSubtle },
}));
