import { Text, View } from 'react-native';
import { AlertTriangle, Calculator, CheckCircle2 } from 'lucide-react-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

import { AmountRow, ToggleRow } from '../../components/QuoteFields';
import { formatWeight } from '../../lib/quote-math';
import { NumberField } from '../components/NumberField';
import { useQuoteEditor } from '../QuoteEditorProvider';

/**
 * Transport du devis : poids et colis, tarif GLS recommandé, frais de port facturés, offerts ou
 * pris en charge par le fournisseur, et validation manuelle (exigée avant l'envoi).
 */
export function TransportSheet() {
  const { state, derived, patch, runGlsRecommendation, applyRecommendedToFee, recommendedShippingLoading } =
    useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const editable = !derived.readOnly;
  const { weightSummary } = derived;
  const reco = state.recommendedShippingHT;

  return (
    <SheetScreen
      title="Transport"
      closeLabel="OK"
      footer={
        editable ? (
          <View style={styles.footer}>
            <Button
              variant={state.transportChecked ? 'outline' : 'primary'}
              label={state.transportChecked ? '✓ Transport confirmé (annuler)' : 'Confirmer le transport'}
              leadingIcon={
                <CheckCircle2 size={16} color={state.transportChecked ? t.accentText : t.onAccent} />
              }
              onPress={() => patch({ transportChecked: !state.transportChecked })}
            />
            <Text style={styles.hint}>
              Toute modification du poids, des colis ou des frais annule la confirmation.
            </Text>
          </View>
        ) : undefined
      }
    >
      <SheetSection title="Colis et poids">
        <AmountRow
          label="Poids total"
          value={weightSummary.totalWeightGrams > 0 ? formatWeight(weightSummary.totalWeightGrams) : 'Inconnu'}
        />
        <AmountRow label="Poids par colis" value={derived.weightPerParcel > 0 ? formatWeight(derived.weightPerParcel) : '—'} />
        {weightSummary.linesMissingWeight > 0 ? (
          <Text style={styles.warn}>{weightSummary.linesMissingWeight} ligne(s) sans poids : tarif GLS approximatif.</Text>
        ) : null}
        <NumberField
          label="Nombre de colis"
          value={state.nbColis}
          decimals={0}
          min={1}
          onValueChange={(v) => patch({ nbColisOverride: v })}
          editable={editable}
        />
        {state.nbColisOverride != null && editable ? (
          <Button variant="ghost" label="Revenir au calcul automatique" onPress={() => patch({ nbColisOverride: null })} />
        ) : null}
        {derived.hasGlsOutOfScope ? (
          <View style={styles.alert}>
            <AlertTriangle size={14} color={t.danger} />
            <Text style={styles.alertText}>
              {derived.glsOutOfScopeLines.length > 0
                ? `Hors périmètre GLS : ${derived.glsOutOfScopeLines.map((l) => l.reference).join(', ')}.`
                : 'Colis hors périmètre GLS (plus de 30 kg ou dimensions hors limites).'}
            </Text>
          </View>
        ) : null}
      </SheetSection>

      <SheetSection title="Tarif GLS recommandé">
        <Button
          variant="outline"
          label={reco != null ? 'Recalculer le tarif GLS' : 'Calculer le tarif GLS'}
          loading={recommendedShippingLoading}
          leadingIcon={<Calculator size={16} color={t.accentText} />}
          disabled={!editable}
          onPress={() => void runGlsRecommendation()}
        />
        {reco != null ? (
          <>
            <AmountRow label="Recommandé" value={`${formatEuro(reco)} HT`} strong />
            {derived.isRecoStale ? (
              <Text style={styles.warn}>Les colis ou le poids ont changé depuis ce calcul : recalculez.</Text>
            ) : null}
            {editable && state.shippingFeeHT !== reco ? (
              <Button variant="outline" label="Appliquer aux frais de port" onPress={() => void applyRecommendedToFee()} />
            ) : null}
          </>
        ) : state.recommendedShippingError ? (
          <Text style={styles.warn}>{state.recommendedShippingError}</Text>
        ) : null}
      </SheetSection>

      <SheetSection title="Frais de port facturés">
        <NumberField
          label="Frais de port"
          suffix="€ HT"
          value={state.shippingFeeHT}
          min={0}
          onValueChange={(v) => patch({ shippingFeeHT: v })}
          editable={editable}
        />
        <ToggleRow
          label="Transport offert au client"
          hint={state.shippingFeeHT > 0 ? `Économie client : ${formatEuro(state.shippingFeeHT)} HT.` : undefined}
          value={state.shippingFeeOffered}
          onValueChange={(v) => patch({ shippingFeeOffered: v })}
          disabled={!editable}
        />
        <ToggleRow
          label="Livraison offerte par le fournisseur"
          hint="Aucun coût de transport à notre charge pour cette commande."
          value={state.supplierShippingOffered}
          onValueChange={(v) => patch({ supplierShippingOffered: v })}
          disabled={!editable}
        />
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.sm, paddingBottom: spacing.md },
  hint: { fontSize: fontSize.xs, color: t.textMuted, textAlign: 'center' },
  warn: { fontSize: fontSize.xs, fontWeight: '600', color: t.warning },
  alert: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  alertText: { flex: 1, fontSize: fontSize.xs, fontWeight: '600', color: t.danger },
}));
