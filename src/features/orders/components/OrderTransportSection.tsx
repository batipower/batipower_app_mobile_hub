import { Text, View } from 'react-native';

import { DetailSection, InfoRow } from '@/components/ui';
import { formatEuro, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubOrderTransportComparison } from '@/types/order';

import { useOrderTransport } from '../hooks/useOrderTransport';

/** Poids en grammes lisible : « 850 g » sous 1 kg, « 12,5 kg » au-delà. */
function formatWeight(grams: number): string {
  return grams >= 1000
    ? `${(grams / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kg`
    : `${formatInteger(Math.round(grams))} g`;
}

function carrierLabel(data: HubOrderTransportComparison): string {
  const row = data.carriers.find((entry) => entry.carrier === data.usedInMarginCarrier);
  const label = row?.label ?? data.usedInMarginCarrier;
  return data.marginFallbackFrom
    ? `${label} (repli : pas de grille pour ${data.marginFallbackFrom})`
    : label;
}

/**
 * Transport de la commande tel que la marge le calcule : grille utilisée, nombre de colis puis
 * poids et coût de chaque colis (SUPERADMIN, depuis Marges marques). Sans détail colis par colis
 * (API plus ancienne), repli sur la moyenne de la tranche.
 */
export function OrderTransportSection({ reference }: { reference: string }) {
  const styles = useStyles();
  const { data, loading, error } = useOrderTransport(reference, true);

  // Section optionnelle : rien tant que ça charge ou si le comparatif est indisponible.
  if (loading || error || !data) return null;

  const parcels = data.parcels ?? [];
  const tier = data.usedTier;

  return (
    <DetailSection title="Transport (calcul de la marge)">
      <InfoRow label="Grille" value={carrierLabel(data)} />
      <InfoRow label="Colis" value={formatInteger(data.nbColis)} />
      <InfoRow label="Poids total" value={formatWeight(data.weightGrams)} />
      {parcels.length > 0 ? (
        <View style={styles.parcels}>
          {parcels.map((parcel, index) => (
            <View key={index} style={styles.parcel}>
              <Text style={styles.parcelLabel}>{`Colis ${index + 1} · ${formatWeight(parcel.weightG)}`}</Text>
              <Text style={styles.parcelValue}>{formatEuro(parcel.costHT)}</Text>
            </View>
          ))}
        </View>
      ) : tier ? (
        <InfoRow
          label="Par colis"
          value={`${formatWeight(tier.perParcelWeightG)} · ${formatEuro(tier.perParcelCostHT)}`}
        />
      ) : null}
      {data.malusTransportHT > 0 ? (
        <InfoRow label="Malus transport" value={formatEuro(data.malusTransportHT)} />
      ) : null}
      {data.recordedCarrierCostHT != null ? (
        <InfoRow label="Coût enregistré (HT)" value={formatEuro(data.recordedCarrierCostHT)} />
      ) : null}
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  parcels: { gap: spacing.xs, paddingVertical: spacing.xs },
  parcel: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  parcelLabel: { flex: 1, fontSize: fontSize.sm, color: t.textMuted },
  parcelValue: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
}));
