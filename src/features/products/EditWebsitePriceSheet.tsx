import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Button, InfoRow, TextField } from '@/components/ui';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { Segment, SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { formatEuro, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { HubWebsitePricing } from '@/types/hubWebsite';

import { useUpdateWebsitePrice } from './hooks/useUpdateWebsitePrice';
import { useWebsitePricing } from './hooks/useWebsitePricing';
import {
  hasActivePromo,
  marginFromCost,
  parseDecimal,
  toInput,
  ttcForMarginPct,
  ttcToHT,
} from './websitePricing';

type Mode = 'ttc' | 'margin';

const MODES: readonly Segment<Mode>[] = [
  { key: 'ttc', label: 'Prix TTC' },
  { key: 'margin', label: 'Marge % cible' },
];

/**
 * Modification du prix de vente du produit sur le site : saisie du prix TTC, ou d'une marge
 * cible en % qui en déduit le TTC. L'aperçu montre la marge qui en résulte avant d'enregistrer.
 */
export function EditWebsitePriceSheet() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  if (!reference) return null;
  return <EditWebsitePrice reference={reference} />;
}

function EditWebsitePrice({ reference }: { reference: string }) {
  const { data: pricing, isPending, error, refetch } = useWebsitePricing(reference, true);

  if (pricing) return <PriceForm reference={reference} pricing={pricing} />;

  return (
    <SheetScreen title="Prix du site" closeLabel="Annuler">
      {isPending && !error ? (
        <ListSkeleton rows={1} height={120} />
      ) : (
        <ErrorBanner
          error={error}
          fallback="Impossible de charger le prix du site"
          onRetry={() => void refetch()}
        />
      )}
    </SheetScreen>
  );
}

/** Formulaire monté une fois le prix chargé (les valeurs initiales en dépendent). */
function PriceForm({ reference, pricing }: { reference: string; pricing: HubWebsitePricing }) {
  const styles = useStyles();
  const t = useTheme();
  const update = useUpdateWebsitePrice();

  const costHT = pricing.margin?.costHT ?? null;
  const promo = hasActivePromo(pricing);
  // Marge du prix catalogue (sans promo) : point de départ du mode « marge cible ».
  const catalogMargin = marginFromCost(pricing.basePriceHT, costHT);

  const [mode, setMode] = useState<Mode>('ttc');
  const [ttcText, setTtcText] = useState(toInput(pricing.basePriceTTC));
  const [pctText, setPctText] = useState(
    catalogMargin.marginPct == null ? '' : String(catalogMargin.marginPct).replace('.', ','),
  );

  const typedTtc = parseDecimal(ttcText);
  const typedPct = parseDecimal(pctText);
  const newTtc =
    mode === 'ttc'
      ? typedTtc != null && typedTtc > 0
        ? Math.round(typedTtc * 100) / 100
        : null
      : typedPct != null
        ? ttcForMarginPct(typedPct, costHT, pricing.taxRatePct)
        : null;

  const invalid = newTtc == null;
  const unchanged = newTtc != null && Math.abs(newTtc - pricing.basePriceTTC) < 0.005;
  const noCost = mode === 'margin' && costHT == null;

  const newHT = newTtc != null ? ttcToHT(newTtc, pricing.taxRatePct) : null;
  const preview = newHT != null ? marginFromCost(newHT, costHT) : null;
  const negative = preview?.marginHT != null && preview.marginHT < 0;

  const save = () => {
    if (newTtc == null || unchanged || noCost) return;
    update.mutate({ reference, payload: { priceTTC: newTtc } }, { onSuccess: () => router.back() });
  };

  return (
    <SheetScreen
      title="Prix du site"
      closeLabel="Annuler"
      footer={
        <Button
          label="Enregistrer"
          loading={update.isPending}
          disabled={invalid || unchanged || noCost}
          onPress={save}
        />
      }
    >
      <Text style={styles.reference}>{reference}</Text>
      <SegmentedControl segments={MODES} value={mode} onChange={setMode} />

      {mode === 'ttc' ? (
        <TextField
          label="Prix de vente TTC (€)"
          value={ttcText}
          onChangeText={setTtcText}
          keyboardType="decimal-pad"
          returnKeyType="done"
          autoFocus
          error={typedTtc == null || typedTtc <= 0 ? 'Saisissez un prix supérieur à 0.' : undefined}
          onSubmitEditing={save}
        />
      ) : (
        <TextField
          label="Marge cible (% du prix de vente HT)"
          value={pctText}
          onChangeText={setPctText}
          keyboardType="decimal-pad"
          returnKeyType="done"
          autoFocus
          error={
            noCost
              ? "Le prix d'achat fixe n'est pas renseigné : la marge ne peut pas être calculée."
              : invalid
                ? 'Saisissez une marge inférieure à 100 %.'
                : undefined
          }
          onSubmitEditing={save}
        />
      )}

      <View style={styles.preview}>
        <InfoRow label="Prix actuel TTC" value={formatEuro(pricing.basePriceTTC)} />
        <InfoRow label="Nouveau prix TTC" value={newTtc != null ? formatEuro(newTtc) : '—'} />
        <InfoRow label="Nouveau prix HT" value={newHT != null ? formatEuro(newHT) : '—'} />
        <InfoRow
          label={promo ? 'Nouvelle marge (prix catalogue)' : 'Nouvelle marge'}
          value={
            preview?.marginHT == null
              ? '—'
              : `${formatEuro(preview.marginHT)} HT (${formatPercent(preview.marginPct)})`
          }
        />
      </View>

      {negative ? (
        <Text style={[styles.hint, { color: t.danger }]}>
          Attention : à ce prix, le produit se vend à perte.
        </Text>
      ) : null}
      {promo ? (
        <Text style={styles.hint}>
          Une promotion est en cours : elle s&apos;appliquera sur ce nouveau prix catalogue.
        </Text>
      ) : null}
      <Text style={styles.hint}>
        Le prix est enregistré sur le site (PrestaShop) puis le catalogue est réindexé.
      </Text>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  reference: { fontSize: fontSize.sm, fontWeight: '700', color: t.textMuted },
  preview: { gap: spacing.md },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
