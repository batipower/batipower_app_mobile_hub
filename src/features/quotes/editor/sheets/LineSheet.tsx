import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button, Chip, TextField } from '@/components/ui';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, spacing, useTheme } from '@/theme';

import { AmountRow, QuoteTextArea } from '../../components/QuoteFields';
import { lineTotalTTC, round2 } from '../../lib/quote-math';
import { NumberField } from '../components/NumberField';
import { useQuoteEditor } from '../QuoteEditorProvider';

/** Édition d'une ligne du devis : produit (quantité, prix, remise, colis, remarque) ou titre / texte. */
export function LineSheet() {
  const { k } = useLocalSearchParams<{ k: string }>();
  const { state, derived, updateLine, setLineQuantity, removeLine, moveLine } = useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const index = state.lines.findIndex((l) => l.key === k);
  const line = state.lines[index];
  const editable = !derived.readOnly;

  if (!line) {
    return (
      <SheetScreen title="Ligne" closeLabel="OK">
        <Text style={styles.muted}>Cette ligne n’existe plus.</Text>
      </SheetScreen>
    );
  }

  const remove = () =>
    Alert.alert('Supprimer cette ligne ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          router.back();
          removeLine(line.key);
        },
      },
    ]);

  const reorder = editable ? (
    <View style={styles.row}>
      <Button
        variant="outline"
        label="Monter"
        leadingIcon={<ArrowUp size={16} color={t.accentText} />}
        disabled={index === 0}
        onPress={() => moveLine(line.key, -1)}
        style={styles.flex}
      />
      <Button
        variant="outline"
        label="Descendre"
        leadingIcon={<ArrowDown size={16} color={t.accentText} />}
        disabled={index === state.lines.length - 1}
        onPress={() => moveLine(line.key, 1)}
        style={styles.flex}
      />
    </View>
  ) : null;

  const removeButton = editable ? (
    <Button
      variant="outline"
      destructive
      label="Supprimer la ligne"
      leadingIcon={<Trash2 size={16} color={t.danger} />}
      onPress={remove}
    />
  ) : null;

  const type = line.lineType ?? 'product';
  if (type !== 'product') {
    return (
      <SheetScreen title={type === 'title' ? 'Titre de section' : 'Texte libre'} closeLabel="OK">
        <QuoteTextArea
          label={type === 'title' ? 'Titre' : 'Texte'}
          value={line.content ?? ''}
          onChangeText={(v) => updateLine(line.key, { content: v })}
          editable={editable}
          minHeight={type === 'title' ? 56 : 120}
          autoFocus={!line.content}
        />
        {reorder}
        {removeButton}
      </SheetScreen>
    );
  }

  const tr = line.taxRate;
  const catalogHT = line.catalogPriceTTC > 0 ? line.catalogPriceTTC / (1 + tr) : 0;
  const unitTTC = line.unitPriceHT * (1 + tr);
  const total = lineTotalTTC(line.quantity, line.unitPriceHT, tr);
  const proposal = state.pricingProposal?.lines.find((p) => p.reference.trim() === line.reference.trim());
  const proposedHT = proposal?.found && proposal.proposedUnitHT != null ? proposal.proposedUnitHT : null;
  const mode = line.priceMode ?? 'proposed';

  const setUnitTTC = (ttc: number) => {
    const ht = ttc / (1 + tr);
    const discount = catalogHT > 0 && ht < catalogHT ? Math.round((1 - ht / catalogHT) * 1000) / 10 : 0;
    updateLine(line.key, { unitPriceHT: ht, discountPct: discount, priceMode: 'custom' });
  };
  const setDiscount = (d: number) =>
    updateLine(line.key, {
      unitPriceHT: catalogHT > 0 ? catalogHT * (1 - d / 100) : line.unitPriceHT,
      discountPct: d,
      priceMode: 'custom',
    });
  const useCatalog = () =>
    updateLine(line.key, { unitPriceHT: catalogHT, discountPct: 0, priceMode: 'catalog' });
  const useProposal = () => {
    if (proposedHT == null) return;
    const capped = catalogHT > 0 ? Math.min(proposedHT, catalogHT) : proposedHT;
    updateLine(line.key, { unitPriceHT: round2(capped), priceMode: 'proposed' });
  };

  const baseCost =
    line.negotiatedCostHT != null && line.negotiatedCostHT > 0
      ? line.negotiatedCostHT
      : line.costHT != null && line.costHT > 0
        ? line.costHT
        : null;
  const cost = baseCost != null ? baseCost + (line.ecotaxHT ?? 0) : null;
  const unitMargin = cost != null ? line.unitPriceHT - cost : null;
  const marginPct = unitMargin != null && line.unitPriceHT > 0 ? (unitMargin / line.unitPriceHT) * 100 : null;

  return (
    <SheetScreen title={line.reference} closeLabel="OK">
      <View style={styles.head}>
        <Text style={styles.label}>{line.productLabel || line.reference}</Text>
        <Text style={styles.reference}>
          {line.reference}
          {line.active === false ? '  ·  Inactif sur PrestaShop' : ''}
        </Text>
        {!line.prestashopProductId ? (
          <Text style={styles.warn}>Produit non lié à PrestaShop : la conversion en commande sera bloquée.</Text>
        ) : null}
      </View>

      <SheetSection title="Quantité et prix">
        <NumberField
          label="Quantité"
          value={line.quantity}
          decimals={0}
          min={1}
          onValueChange={(v) => setLineQuantity(line.key, v)}
          editable={editable}
        />
        <NumberField
          label="Prix unitaire client"
          suffix="€ TTC"
          value={round2(unitTTC)}
          min={0}
          onValueChange={setUnitTTC}
          editable={editable}
        />
        <NumberField
          label="Remise sur le prix catalogue"
          suffix="%"
          value={line.discountPct}
          decimals={1}
          min={0}
          max={100}
          onValueChange={setDiscount}
          editable={editable && catalogHT > 0}
        />
        {editable ? (
          <View style={styles.row}>
            <Chip label="Prix catalogue" active={mode === 'catalog'} onPress={useCatalog} />
            {proposedHT != null ? (
              <Chip label={`Prix IA (${formatEuro(proposedHT * (1 + tr))})`} active={mode === 'proposed'} onPress={useProposal} />
            ) : null}
          </View>
        ) : null}
        {line.catalogPriceTTC > 0 ? (
          <Text style={styles.muted}>
            Catalogue : {formatEuro(line.catalogPriceTTC)} TTC
            {line.baseCatalogPriceTTC ? ` (avant promo site : ${formatEuro(line.baseCatalogPriceTTC)})` : ''}
          </Text>
        ) : (
          <Text style={styles.warn}>Pas de prix catalogue : saisissez le prix client.</Text>
        )}
      </SheetSection>

      <SheetSection title="Colis">
        <NumberField
          label="Nombre de colis de cette ligne"
          value={line.nbColisLine ?? 1}
          decimals={0}
          min={1}
          onValueChange={(v) => updateLine(line.key, { nbColisLine: v, nbColisLineManual: true })}
          editable={editable}
        />
        <Text style={styles.muted}>
          {line.nbPieceByColis ? `${line.nbPieceByColis} pièce(s) par colis. ` : ''}
          {line.weightInGrams ? `Poids unitaire : ${line.weightInGrams} g.` : 'Poids inconnu.'}
        </Text>
      </SheetSection>

      <SheetSection title="Remarque">
        <TextField
          label="Remarque sur la ligne (visible sur le devis)"
          value={line.note ?? ''}
          onChangeText={(v) => updateLine(line.key, { note: v })}
          editable={editable}
          maxLength={300}
        />
      </SheetSection>

      <SheetSection title="Récapitulatif">
        <AmountRow label="Total ligne TTC" value={formatEuro(total)} strong />
        {cost != null ? (
          <>
            <AmountRow label="Prix d'achat HT (écotaxe incluse)" value={formatEuro(cost)} tone="muted" />
            <AmountRow
              label="Marge unitaire"
              value={`${formatEuro(unitMargin)}${marginPct != null ? ` · ${marginPct.toFixed(1)} %` : ''}`}
              tone={unitMargin != null && unitMargin < 0 ? 'danger' : 'success'}
            />
          </>
        ) : (
          <Text style={styles.muted}>Prix d’achat inconnu : marge non calculable.</Text>
        )}
      </SheetSection>

      {reorder}
      {removeButton}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  head: { gap: 2 },
  label: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  reference: { fontSize: fontSize.xs, color: t.textMuted, fontFamily: monoFontFamily },
  warn: { fontSize: fontSize.xs, fontWeight: '600', color: t.warning },
  muted: { fontSize: fontSize.xs, color: t.textMuted },
  row: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  flex: { flex: 1 },
}));
