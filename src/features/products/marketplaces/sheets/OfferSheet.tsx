import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, InfoRow, TextField } from '@/components/ui';
import { parseDecimal, toInput } from '@/features/products/websitePricing';
import { formatEuro, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, useTheme } from '@/theme';

import { useMarketplaceMutations } from '../hooks/useMarketplaceMutations';
import {
  computeMargin,
  computeOfferStockPrefill,
  suggestOfferPriceTTC,
} from '../viewModel';
import {
  MarketplaceSheetData,
  useSheetParams,
  type SheetData,
} from './MarketplaceSheetData';

/**
 * Création (`mode=create`) ou mise à jour (`mode=update`) d'une offre marketplace : prix TTC et
 * quantité, préremplis depuis l'objectif et les stocks, avec la marge estimée avant validation.
 */
export function OfferSheet() {
  const params = useSheetParams();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  if (!params) return null;
  const update = mode === 'update';
  return (
    <MarketplaceSheetData title={update ? "Mise à jour de l'offre" : "Création d'offre"} params={params}>
      {(data) => <OfferForm data={data} update={update} />}
    </MarketplaceSheetData>
  );
}

function OfferForm({ data, update }: { data: SheetData; update: boolean }) {
  const styles = useStyles();
  const t = useTheme();
  const { reference, config, pricing, header, view } = data;
  const { createOffer, updateOffer } = useMarketplaceMutations(reference);
  const mutation = update ? updateOffer : createOffer;

  const suggested = update ? view.actualPrice : suggestOfferPriceTTC(view);
  const prefillQty = Math.max(
    computeOfferStockPrefill(header?.stock.flevy, header?.stock.dombasle, pricing.supplierQuantityMultiplier),
    update ? 0 : 1,
  );
  const [price, setPrice] = useState(toInput(suggested));
  const [quantity, setQuantity] = useState(String(prefillQty));

  const priceTTC = parseDecimal(price);
  const qty = quantity.trim() === '' ? null : Number(quantity);
  const qtyValid = qty != null && Number.isInteger(qty) && qty >= 0;
  // Bricoman : l'offre se crée à partir de l'offre Leroy Merlin, sans prix ni quantité à saisir.
  const fromLeroyMerlin = !update && config.key === 'bricoman';
  const priceValid = priceTTC != null && priceTTC > 0;
  const valid = fromLeroyMerlin || (priceValid && qtyValid);
  const country = view.country;

  const margin =
    priceValid
      ? computeMargin({
          priceTTC,
          fixPriceHT: pricing.fixPriceHT,
          costCarrierHT: pricing.costCarrierHT,
          rate: view.commissionRate,
          marketplace: config.key,
          country,
        })
      : null;

  const submit = () => {
    if (!valid || mutation.isPending) return;
    const apiCountry = country === 'FR' ? undefined : country;
    const body = fromLeroyMerlin
      ? {}
      : { priceTTC: priceTTC ?? undefined, quantity: qty ?? undefined };
    if (update) {
      updateOffer.mutate(
        { marketplace: config.key, payload: { ...body, country: apiCountry } },
        { onSuccess: () => router.back() },
      );
    } else {
      createOffer.mutate(
        { marketplace: config.key, payload: { ...body, countries: apiCountry ? [apiCountry] : undefined } },
        { onSuccess: () => router.back() },
      );
    }
  };

  const where = country === 'FR' ? config.label : `${config.label} ${country}`;

  return (
    <SheetScreen
      title={update ? `Mettre à jour ${where}` : `Créer une offre ${where}`}
      closeLabel="Annuler"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label={update ? 'Mettre à jour' : "Créer l'offre"}
          loading={mutation.isPending}
          disabled={!valid}
          onPress={submit}
        />
      }
    >
      <Text style={styles.reference}>{reference}</Text>
      {fromLeroyMerlin ? (
        <Text style={styles.hint}>
          L&apos;offre Bricoman est créée à partir de l&apos;offre Leroy Merlin existante.
        </Text>
      ) : (
        <>
          <TextField
            label="Prix TTC (€)"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            returnKeyType="next"
            editable={!mutation.isPending}
            error={price.trim() !== '' && !priceValid ? 'Saisissez un prix supérieur à 0.' : undefined}
          />
          <TextField
            label="Quantité"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            returnKeyType="done"
            editable={!mutation.isPending}
            error={quantity.trim() !== '' && !qtyValid ? 'Saisissez un entier positif.' : undefined}
            onSubmitEditing={submit}
          />
          {margin ? (
            <InfoRow
              label="Marge estimée"
              value={`${formatEuro(margin.marginEur)} HT (${formatPercent(margin.marginPercent)})`}
            />
          ) : null}
          {margin && margin.marginEur < 0 ? (
            <Text style={[styles.hint, { color: t.danger }]}>
              Attention : à ce prix, l&apos;offre se vend à perte.
            </Text>
          ) : null}
          <Text style={styles.hint}>
            {update
              ? 'Le prix actuel et le stock vendable (Flévy + Dombasle) sont préremplis.'
              : "Prix prérempli depuis le prix d'équilibre ou l'objectif ; quantité depuis le stock vendable."}
          </Text>
        </>
      )}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  reference: { fontSize: fontSize.sm, fontWeight: '700', color: t.textMuted },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
