import { View } from 'react-native';

import { makeStyles, spacing } from '@/theme';
import type { HubProductHeader } from '@/types/product';

import { EvolutionSection } from './EvolutionSection';
import { MonthlySalesSection } from './MonthlySalesSection';
import { PriceVolumeSection } from './PriceVolumeSection';

type HistoryTabProps = {
  header: HubProductHeader;
  /** SUPERADMIN : voit le CA TTC et peut appliquer la prévision suggérée. */
  isSuperAdmin: boolean;
};

/** Onglet « Historique » de la fiche produit : ventes passées, évolution et prix par marketplace. */
export function HistoryTab({ header, isSuperAdmin }: HistoryTabProps) {
  const styles = useStyles();
  return (
    <View style={styles.root}>
      <MonthlySalesSection header={header} canSeeRevenue={isSuperAdmin} canEdit={isSuperAdmin} />
      <EvolutionSection reference={header.reference} canSeeRevenue={isSuperAdmin} />
      <PriceVolumeSection reference={header.reference} canSeeRevenue={isSuperAdmin} />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { gap: spacing.lg },
}));
