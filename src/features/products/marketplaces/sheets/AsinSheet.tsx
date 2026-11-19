import { useEffect, useRef, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, InfoRow, TextField } from '@/components/ui';
import { Segment, SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { parseDecimal, toInput } from '@/features/products/websitePricing';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { HubAsinPreview, HubDeployAsinPayload } from '@/types/hubProductMarketplaces';

import { useMarketplaceMutations } from '../hooks/useMarketplaceMutations';
import { computeOfferStockPrefill, suggestOfferPriceTTC } from '../viewModel';
import { MarketplaceSheetData, type SheetData } from './MarketplaceSheetData';

type Strategy = 'auto' | 'same' | 'new';

const STRATEGIES: readonly Segment<Strategy>[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'same', label: 'SKU existant' },
  { key: 'new', label: 'Nouveau SKU' },
];

function asPreview(value: unknown): HubAsinPreview | null {
  return value && typeof value === 'object' ? (value as HubAsinPreview) : null;
}

/**
 * Déploiement d'une offre Amazon sur un ASIN précis (ASIN forcé) : un diagnostic sans écriture
 * se lance à l'ouverture et préremplit l'ASIN du product-staging lié, le prix et le stock, puis
 * l'offre est créée et l'ASIN lié au produit après confirmation.
 */
export function AsinSheet() {
  const { reference } = useLocalSearchParams<{ reference?: string }>();
  if (!reference) return null;
  return (
    <MarketplaceSheetData title="Déployer avec un ASIN" params={{ reference, marketplace: 'amazon', country: 'FR' }}>
      {(data) => <AsinForm data={data} />}
    </MarketplaceSheetData>
  );
}

function AsinForm({ data }: { data: SheetData }) {
  const styles = useStyles();
  const t = useTheme();
  const { reference, pricing, header, view } = data;
  const { previewAsin, deployAsin } = useMarketplaceMutations(reference);

  const suggestedPrice = suggestOfferPriceTTC(view);
  const suggestedQty = computeOfferStockPrefill(
    header?.stock.flevy,
    header?.stock.dombasle,
    pricing.supplierQuantityMultiplier,
  );
  const [asin, setAsin] = useState('');
  const [price, setPrice] = useState(toInput(suggestedPrice));
  const [quantity, setQuantity] = useState(String(Math.max(suggestedQty, 1)));
  const [strategy, setStrategy] = useState<Strategy>('auto');
  const [force, setForce] = useState(false);
  const [preview, setPreview] = useState<HubAsinPreview | null>(null);

  const priceTTC = parseDecimal(price);
  const qty = quantity.trim() === '' ? null : Number(quantity);
  const payload = (): HubDeployAsinPayload => ({
    asin: asin.trim().toUpperCase() || undefined,
    priceTTC: priceTTC != null && priceTTC > 0 ? priceTTC : undefined,
    quantity: qty != null && Number.isInteger(qty) && qty >= 0 ? qty : undefined,
    skuStrategy: strategy,
    force: force || undefined,
  });

  // Diagnostic initial, une seule fois à l'ouverture.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    previewAsin.mutate(
      {
        priceTTC: suggestedPrice ?? undefined,
        quantity: suggestedQty > 0 ? suggestedQty : undefined,
        skuStrategy: 'auto',
      },
      {
        onSuccess: (result) => {
          const next = asPreview(result);
          setPreview(next);
          if (next?.asin) setAsin(next.asin);
          if (suggestedPrice == null && next?.priceTTC != null) setPrice(toInput(next.priceTTC));
          if (next?.quantity != null && suggestedQty <= 0) setQuantity(String(next.quantity));
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uniquement à l'ouverture
  }, []);

  const loadingPreview = previewAsin.isPending;
  const asinMissing = asin.trim().length === 0;
  const linkedAsins = preview?.linkedAsins ?? [];
  const warnings = preview?.warnings ?? [];
  const busy = loadingPreview || deployAsin.isPending;

  const refreshPreview = () =>
    previewAsin.mutate(payload(), { onSuccess: (result) => setPreview(asPreview(result)) });

  const deploy = () =>
    Alert.alert(
      'Déployer sur cet ASIN ?',
      `L'offre Amazon est créée sur l'ASIN ${asin.trim().toUpperCase()} et liée au produit.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déployer',
          onPress: () => deployAsin.mutate(payload(), { onSuccess: () => router.back() }),
        },
      ],
    );

  return (
    <SheetScreen
      title="Déployer avec un ASIN"
      closeLabel="Annuler"
      closeDisabled={deployAsin.isPending}
      footer={
        <View style={styles.footer}>
          <Button
            label="Aperçu"
            variant="outline"
            loading={loadingPreview}
            disabled={asinMissing || deployAsin.isPending}
            onPress={refreshPreview}
            style={styles.footerButton}
          />
          <Button
            label="Déployer"
            loading={deployAsin.isPending}
            disabled={asinMissing || busy}
            onPress={deploy}
            style={styles.footerButton}
          />
        </View>
      }
    >
      <Text style={styles.reference}>{reference}</Text>
      <TextField
        label="ASIN"
        value={asin}
        onChangeText={(text) => setAsin(text.toUpperCase())}
        placeholder="B0XXXXXXXX"
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!busy}
      />
      {loadingPreview ? <Text style={styles.hint}>Diagnostic en cours…</Text> : null}
      {!loadingPreview && preview?.asinSource === 'staging' ? (
        <Text style={styles.hint}>ASIN issu de l&apos;analyse product-staging.</Text>
      ) : null}
      <View style={styles.pair}>
        <View style={styles.pairItem}>
          <TextField
            label="Prix TTC (€)"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            editable={!busy}
          />
        </View>
        <View style={styles.pairItem}>
          <TextField
            label="Quantité"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            editable={!busy}
          />
        </View>
      </View>
      <Text style={styles.label}>Stratégie SKU</Text>
      <SegmentedControl segments={STRATEGIES} value={strategy} onChange={setStrategy} />

      {preview ? (
        <View style={styles.preview}>
          {preview.amazonTitle ? <Text style={styles.previewTitle}>{preview.amazonTitle}</Text> : null}
          {preview.stagingBuyboxPriceTTC != null ? (
            <InfoRow
              label="BuyBox staging"
              value={`${formatEuro(preview.stagingBuyboxPriceTTC)}${preview.stagingBuyboxSeller ? ` (${preview.stagingBuyboxSeller})` : ''}`}
            />
          ) : null}
          <InfoRow
            label="ASIN sur le SKU"
            value={`${preview.currentAsinOnSku ?? 'aucun'}${preview.currentListingStatus?.length ? ` · ${preview.currentListingStatus.join(', ')}` : ''}`}
            mono
          />
          {preview.asinMismatch ? (
            <Text style={[styles.warning, { color: t.warning }]}>
              L&apos;offre actuelle est sur un autre ASIN que celui ciblé.
            </Text>
          ) : null}
          {preview.skuCandidates ? (
            <InfoRow label="SKU candidats" value={`${preview.skuCandidates.same} / ${preview.skuCandidates.new}`} mono />
          ) : null}
          {linkedAsins.length > 0 ? (
            <InfoRow label="ASIN déjà liés" value={linkedAsins.join(', ')} mono />
          ) : null}
          {warnings.map((warning) => (
            <Text key={warning} style={[styles.warning, { color: t.danger }]}>
              {warning}
            </Text>
          ))}
          {!preview.asin && preview.message ? (
            <Text style={[styles.warning, { color: t.danger }]}>{preview.message}</Text>
          ) : null}
        </View>
      ) : null}

      {linkedAsins.length > 0 ? (
        <View style={styles.forceRow}>
          <Text style={styles.forceLabel}>Créer quand même (un ASIN est déjà lié à cette fiche)</Text>
          <Switch value={force} onValueChange={setForce} disabled={busy} />
        </View>
      ) : null}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  reference: { fontSize: fontSize.sm, fontWeight: '700', color: t.textMuted },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1 },
  preview: { gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: t.surface },
  previewTitle: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  warning: { fontSize: fontSize.xs, lineHeight: 17, fontWeight: '600' },
  forceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  forceLabel: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
  footer: { flexDirection: 'row', gap: spacing.md },
  footerButton: { flex: 1 },
}));
