import { Text, View } from 'react-native';
import { Lock, TriangleAlert } from 'lucide-react-native';

import { ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { HubProductHeader } from '@/types/product';

import { MarketplaceCard } from './components/MarketplaceCard';
import { MARKETPLACE_CONFIG } from './config';
import { useProductPricing } from './hooks/useProductPricing';

type Props = {
  header: HubProductHeader;
  /** SUPERADMIN : peut agir sur les offres. MANAGER : lecture seule, valeurs financières masquées. */
  canEdit: boolean;
};

/**
 * Onglet « Marketplaces » de la fiche produit : une carte par marketplace (prix pratiqué, BuyBox,
 * concurrence, marge, identifiants). Lecture pour SUPERADMIN et MANAGER ; les actions sur les
 * offres (créer, modifier, retirer, objectif, commission…) sont réservées au SUPERADMIN.
 */
export function MarketplacesTab({ header, canEdit }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const { data: pricing, isPending, error, refetch } = useProductPricing(header.reference, true);
  const restricted = header.flags.tooFragile || header.flags.tooVoluminous;

  if (!pricing) {
    return isPending && !error ? (
      <ListSkeleton rows={3} height={190} />
    ) : (
      <ErrorBanner
        error={error}
        fallback="Impossible de charger les marketplaces"
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <View style={styles.list}>
      {restricted ? (
        <View style={[styles.banner, { backgroundColor: withAlpha(t.warning, 0.12) }]}>
          <TriangleAlert size={16} color={t.warning} />
          <Text style={styles.bannerText}>
            Produit {header.flags.tooFragile ? 'fragile' : 'volumineux'} : le suivi BuyBox des
            marketplaces est interdit.
          </Text>
        </View>
      ) : null}
      {!canEdit ? (
        <View style={styles.banner}>
          <Lock size={14} color={t.textSubtle} />
          <Text style={styles.bannerText}>
            Lecture seule : marge, commission et objectifs sont réservés au Super Admin.
          </Text>
        </View>
      ) : null}
      {MARKETPLACE_CONFIG.map((config) => (
        <MarketplaceCard
          key={config.key}
          pricing={pricing}
          config={config}
          ean={header.ean}
          canEdit={canEdit}
          masked={!canEdit}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: spacing.lg },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  bannerText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
}));
