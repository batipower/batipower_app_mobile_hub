import { Text, View } from 'react-native';
import { AlertTriangle, Sparkles } from 'lucide-react-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Badge, Button } from '@/components/ui';
import { formatDateTime, formatEuro } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, spacing, useTheme } from '@/theme';

import { AmountRow } from '../../components/QuoteFields';
import { normalizeTaxRate } from '../../lib/quote-math';
import { useQuoteEditor } from '../QuoteEditorProvider';

/**
 * Proposition intelligente (IA) : prix proposés par ligne (coût, concurrence, plancher, marge),
 * appliqués aux lignes dont le prix n'a pas été saisi à la main. Exigée avant l'envoi ou
 * l'acceptation du devis, comme sur le web.
 */
export function AiSheet() {
  const { state, derived, pricing, proposePricing } = useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const proposal = state.pricingProposal;
  const editable = !derived.readOnly;
  const productLines = state.lines.filter((l) => (l.lineType ?? 'product') === 'product');

  return (
    <SheetScreen
      title="Proposition IA"
      closeLabel="OK"
      closeDisabled={pricing.busy}
      footer={
        editable ? (
          <View style={styles.footer}>
            <Button
              label={proposal ? 'Relancer la proposition' : 'Lancer la proposition'}
              leadingIcon={<Sparkles size={16} color={t.onAccent} />}
              loading={pricing.busy}
              disabled={productLines.length === 0}
              onPress={() => void proposePricing()}
            />
            <Text style={styles.hint}>
              L’analyse peut prendre jusqu’à une minute. Les prix saisis à la main ne sont pas modifiés.
            </Text>
          </View>
        ) : undefined
      }
    >
      {pricing.error ? (
        <View style={styles.alert}>
          <AlertTriangle size={14} color={t.danger} />
          <Text style={styles.alertText}>{pricing.error}</Text>
        </View>
      ) : null}

      {!proposal ? (
        <Text style={styles.muted}>
          Aucune proposition pour ce devis. Lancez l’analyse : elle confronte le coût d’achat, les prix concurrents
          et le transport pour proposer un prix de vente par ligne.
        </Text>
      ) : (
        <>
          <SheetSection title="Synthèse">
            <AmountRow label="Total HT proposé" value={formatEuro(proposal.estimatedFinalHT)} strong />
            <AmountRow label="Coût d'achat HT" value={formatEuro(proposal.totalCostHT)} tone="muted" />
            <AmountRow
              label="Marge globale"
              value={`${formatEuro(proposal.globalMarginHT)} · ${proposal.globalMarginPercent.toFixed(1)} %`}
              tone={proposal.globalMarginHT < 0 ? 'danger' : 'success'}
            />
            {state.pricingGeneratedAt ? (
              <Text style={styles.muted}>Générée le {formatDateTime(state.pricingGeneratedAt.toISOString())}</Text>
            ) : null}
            {proposal.rationale ? <Text style={styles.rationale}>{proposal.rationale}</Text> : null}
            {proposal.warnings.map((w) => (
              <View key={w} style={styles.alert}>
                <AlertTriangle size={14} color={t.warning} />
                <Text style={[styles.alertText, { color: t.warning }]}>{w}</Text>
              </View>
            ))}
          </SheetSection>

          <SheetSection title={`Détail par ligne (${proposal.lines.length})`}>
            {proposal.lines.map((pl, i) => {
              const tr = normalizeTaxRate(pl.vatRate || 0.2);
              return (
                <View key={`${pl.reference}-${i}`} style={styles.line}>
                  <View style={styles.lineHead}>
                    <Text style={styles.lineRef} numberOfLines={1}>
                      {pl.reference}
                    </Text>
                    {!pl.found ? <Badge label="Introuvable" tone="red" /> : null}
                  </View>
                  {pl.designation ? (
                    <Text style={styles.lineSub} numberOfLines={2}>
                      {pl.designation}
                    </Text>
                  ) : null}
                  {pl.found ? (
                    <>
                      <AmountRow
                        label={`Prix proposé × ${pl.quantity}`}
                        value={
                          pl.proposedUnitHT != null
                            ? `${formatEuro(pl.proposedUnitHT * (1 + tr))} TTC`
                            : '—'
                        }
                      />
                      <AmountRow
                        label="Concurrent le moins cher"
                        value={pl.competitorMinHT != null ? `${formatEuro(pl.competitorMinHT * (1 + tr))} TTC` : '—'}
                        tone="muted"
                      />
                      <AmountRow
                        label="Marge attendue"
                        value={
                          pl.expectedMarginPercent != null
                            ? `${pl.expectedMarginPercent.toFixed(1)} %`
                            : '—'
                        }
                        tone={pl.expectedMarginPercent != null && pl.expectedMarginPercent < 0 ? 'danger' : 'success'}
                      />
                    </>
                  ) : null}
                  {pl.rationale ? <Text style={styles.lineSub}>{pl.rationale}</Text> : null}
                </View>
              );
            })}
          </SheetSection>
        </>
      )}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: spacing.sm, paddingBottom: spacing.md },
  hint: { fontSize: fontSize.xs, color: t.textMuted, textAlign: 'center' },
  muted: { fontSize: fontSize.sm, color: t.textMuted, lineHeight: 20 },
  rationale: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  alert: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  alertText: { flex: 1, fontSize: fontSize.xs, fontWeight: '600', color: t.danger },
  line: { gap: spacing.xs, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: t.border },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  lineRef: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text, fontFamily: monoFontFamily },
  lineSub: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
}));
