import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { PauseCircle } from 'lucide-react-native';

import { ModuleSwitcherButton } from '@/components/modules/ModuleSwitcherButton';
import { originLabel } from '@/features/orders/orderDisplay';
import { formatInteger, formatRelative } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { MarketplaceSyncSummary } from '@/types/hubDashboard';

import { HubViewMenu } from './HubViewMenu';
import { SystemStatusPills } from './SystemStatusPills';

/** Heure courante, rafraîchie régulièrement (libellés « il y a X min »). */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

type CockpitHeaderProps = {
  /** Horodatage de calcul de la vue d'ensemble (ISO), absent tant qu'elle n'est pas chargée. */
  generatedAt: string | null;
  marketplaceSync: MarketplaceSyncSummary | undefined;
};

/**
 * En-tête du cockpit : titre, fraîcheur des chiffres, sélecteur de module, et bandeau
 * « Synchro en pause » quand des marketplaces ne créent plus leurs commandes dans PrestaShop.
 * Sans lien de configuration : la reprise de la synchro se fait sur le web.
 */
export function CockpitHeader({ generatedAt, marketplaceSync }: CockpitHeaderProps) {
  const styles = useStyles();
  const t = useTheme();
  const now = useNow(30_000);
  const updated = formatRelative(generatedAt, now);
  const paused = marketplaceSync?.pausedMarketplaces ?? [];

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.text}>
          <HubViewMenu current="cockpit" />
          {updated ? (
            <Text style={styles.updated}>Mis à jour {updated} · actualisation automatique</Text>
          ) : null}
          <View style={styles.status}>
            <SystemStatusPills />
          </View>
        </View>
        <ModuleSwitcherButton active="HUB" />
      </View>

      {paused.length > 0 ? (
        <View style={styles.banner} accessibilityRole="alert">
          <PauseCircle size={18} color={t.warning} />
          <Text style={styles.bannerText}>
            Synchro en pause : {paused.map((code) => originLabel(code)).join(', ')}
            {marketplaceSync && marketplaceSync.pendingCount > 0
              ? ` · ${formatInteger(marketplaceSync.pendingCount)} commande${marketplaceSync.pendingCount > 1 ? 's' : ''} en attente`
              : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  text: { flex: 1, gap: 2 },
  updated: { fontSize: fontSize.xs, color: t.textSubtle },
  status: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.warning, 0.35),
    backgroundColor: withAlpha(t.warning, 0.1),
  },
  bannerText: {
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: 17,
    fontWeight: '600',
    color: t.warning,
  },
}));
