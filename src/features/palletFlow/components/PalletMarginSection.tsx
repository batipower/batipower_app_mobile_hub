import { useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

import { DetailSection, Divider, InfoRow } from '@/components/ui';
import { MarginToggle } from '@/features/cockpit/components/CockpitPrimitives';
import { warehouseLabel } from '@/features/pricing/options';
import { formatEuro, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubOrderMarginSimulation, HubPalletQuote } from '@/types/hubPalletFlow';
import type { HubOrder } from '@/types/order';

import { quoteToCompare } from '../display';

const HIDDEN_MARGIN = '•••• €';

type Props = {
  order: HubOrder;
  quotes: HubPalletQuote[];
  simulation: HubOrderMarginSimulation | null;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
};

/**
 * Marge actuelle de la commande et comparaison flux classique (GLS) / flux palette. Masquée par
 * défaut derrière l'oeil (écran regardé par un tiers), comme dans le Cockpit. Réservée au SUPERADMIN,
 * comme `margin-simulation` côté back.
 */
export function PalletMarginSection({ order, quotes, simulation, loading, failed, onRetry }: Props) {
  const styles = useStyles();
  const [visible, setVisible] = useState(false);
  const show = (text: string) => (visible ? text : HIDDEN_MARGIN);

  const quote = quoteToCompare(quotes);
  const classicKey = simulation
    ? ([order.palletNaturalWarehouse, quote?.warehouse, 'DOMBASLE', ...Object.keys(simulation.warehouses)]
        .filter((key): key is string => !!key)
        .find((key) => simulation.warehouses[key]) ?? null)
    : null;
  const classic = simulation && classicKey ? simulation.warehouses[classicKey] : null;
  const best =
    simulation && simulation.bestWarehouse !== classicKey
      ? (simulation.warehouses[simulation.bestWarehouse] ?? null)
      : null;
  // Le scénario palette n'est comparable que s'il porte le prix du devis affiché.
  const palletScenario =
    quote?.quotedPriceHT != null &&
    simulation?.pallet &&
    Math.abs(simulation.pallet.quotedPriceHT - quote.quotedPriceHT) < 0.01
      ? simulation.pallet
      : null;

  const marginDelta =
    classic?.margeHT != null && palletScenario ? palletScenario.margeHT - classic.margeHT : null;
  const transportDelta =
    quote?.quotedPriceHT != null && quote.glsReferencePriceHT
      ? quote.quotedPriceHT - quote.glsReferencePriceHT
      : null;

  const euro = (value: number | null | undefined) => (value != null ? formatEuro(value) : '—');
  const signed = (value: number) => `${value > 0 ? '+' : ''}${formatEuro(value)}`;

  return (
    <DetailSection
      title="Marge actuelle"
      trailing={<MarginToggle visible={visible} onToggle={() => setVisible((v) => !v)} />}
    >
      <InfoRow label="Marge de la commande HT" value={show(euro(order.rentability))} />
      {order.rentabilityRealWithOurPrice != null ? (
        <InfoRow
          label="Marge avec notre prix d'achat HT"
          value={show(euro(order.rentabilityRealWithOurPrice))}
        />
      ) : null}
      {order.carrierCostHT != null ? (
        <InfoRow label="Coût transport enregistré HT" value={euro(order.carrierCostHT)} />
      ) : null}

      <Divider />

      {loading && !simulation ? (
        <ActivityIndicator style={styles.loader} />
      ) : failed && !simulation ? (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.error}>Simulation de marge indisponible. Appuyer pour réessayer.</Text>
        </Pressable>
      ) : !simulation ? (
        <Text style={styles.muted}>Simulation de marge non disponible.</Text>
      ) : (
        <>
          <Text style={styles.subtitle}>
            Flux classique (GLS){classicKey ? ` · ${warehouseLabel(classicKey)}` : ''}
          </Text>
          {classic ? (
            <>
              <InfoRow label="Transport HT" value={euro(classic.carrierCostHT)} />
              <InfoRow
                label="Marge HT"
                value={
                  classic.margeHT != null
                    ? show(
                        `${formatEuro(classic.margeHT)}${classic.margePct != null ? ` (${formatPercent(classic.margePct)})` : ''}`,
                      )
                    : '—'
                }
              />
            </>
          ) : (
            <Text style={styles.muted}>Marge classique non calculable.</Text>
          )}

          <Text style={styles.subtitle}>Flux palette</Text>
          {quote ? (
            <>
              <InfoRow label="Prix palette HT" value={euro(quote.quotedPriceHT)} />
              <InfoRow
                label="Marge HT"
                value={
                  palletScenario
                    ? show(`${formatEuro(palletScenario.margeHT)} (${formatPercent(palletScenario.margePct)})`)
                    : '—'
                }
              />
              {marginDelta != null ? (
                <InfoRow label="Écart de marge vs classique" value={show(signed(marginDelta))} />
              ) : null}
              {transportDelta != null ? (
                <InfoRow label="Écart transport vs GLS" value={signed(transportDelta)} />
              ) : null}
            </>
          ) : (
            <Text style={styles.muted}>En attente du prix palette.</Text>
          )}

          {best ? (
            <Text style={styles.muted}>
              Meilleur entrepôt GLS : {warehouseLabel(simulation.bestWarehouse)},{' '}
              {best.margeHT != null ? show(formatEuro(best.margeHT)) : '—'}
            </Text>
          ) : null}
        </>
      )}
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  loader: { alignSelf: 'center', paddingVertical: spacing.md },
  subtitle: { fontSize: fontSize.xs, fontWeight: '700', color: t.textSubtle, textTransform: 'uppercase' },
  muted: { fontSize: fontSize.sm, color: t.textSubtle },
  error: { fontSize: fontSize.sm, color: t.danger },
}));
