import { Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

import { deploySummary } from '../../domain/model';
import { BrandBlock } from '../BrandBlock';
import { FieldCard } from '../FieldCard';
import { useStudio } from '../StudioContext';
import { ProgressBar, StudioCard, StudioHeading } from '../ui';

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Ce qui sera écrit, conservé ou attend une décision au prochain déploiement. */
function DeploySummary() {
  const styles = useStyles();
  const t = useTheme();
  const studio = useStudio();
  const counts = deploySummary(studio.fieldViews.map((field) => field.decision));
  return (
    <Text style={styles.summary}>
      <Text style={styles.bold}>Au déploiement : </Text>
      {plural(counts.WRITE, 'champ écrit', 'champs écrits')} sur le site,{' '}
      {plural(counts.KEEP, 'conservé', 'conservés')} tel qu’en ligne
      {counts.DECIDE > 0 ? (
        <>
          , <Text style={{ color: t.warning, fontWeight: '700' }}>{counts.DECIDE} à décider</Text>
        </>
      ) : null}
      .
    </Text>
  );
}

/** Onglet Contenu : marque, rédaction (nom, textes) et référencement (meta, slug). */
export function ContentTab() {
  const styles = useStyles();
  const studio = useStudio();
  const { bulk } = studio;
  const fiche = studio.fieldViews.filter((field) => field.group === 'fiche');
  const seo = studio.fieldViews.filter((field) => field.group === 'seo');
  const showFields =
    Boolean(studio.draft?.preparedAt) || studio.fieldViews.some((f) => f.proposal || f.value);

  return (
    <View style={styles.root}>
      <StudioCard>
        <Button
          label={
            studio.pendingFieldCount === 0
              ? 'Tout est validé'
              : `Tout valider (${studio.pendingFieldCount})`
          }
          loading={Boolean(bulk)}
          disabled={!studio.draft || studio.jobBusy || Boolean(bulk) || studio.pendingFieldCount === 0}
          onPress={() => void studio.acceptAll()}
        />
        <Text style={styles.hint}>
          La saisie est enregistrée automatiquement. Valider confirme le texte qui sera écrit.
        </Text>
        {showFields ? <DeploySummary /> : null}
        {bulk ? (
          <View style={styles.bulk}>
            <ProgressBar value={Math.round((bulk.done / bulk.total) * 100)} />
            <Text style={styles.hint}>
              Validation {bulk.done}/{bulk.total}
            </Text>
          </View>
        ) : null}
      </StudioCard>

      <BrandBlock />

      {!showFields && !studio.jobBusy ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucune proposition pour l’instant</Text>
          <Text style={styles.hint}>
            Lancez la préparation pour générer le nom, les textes et le référencement à partir de la
            fiche actuelle.
          </Text>
        </View>
      ) : null}

      {showFields ? (
        <>
          <View style={styles.section}>
            <StudioHeading>Rédaction</StudioHeading>
            {fiche.map((field) => (
              <FieldCard key={field.key} field={field} />
            ))}
          </View>
          <View style={styles.section}>
            <StudioHeading>Référencement</StudioHeading>
            {seo.map((field) => (
              <FieldCard key={field.key} field={field} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.lg },
  section: { gap: spacing.md },
  hint: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  bold: { fontWeight: '700', color: t.text },
  summary: { fontSize: fontSize.xs, color: t.text, lineHeight: 18 },
  bulk: { gap: 4 },
  empty: {
    gap: spacing.xs,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.borderStrong,
  },
  emptyTitle: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
}));
