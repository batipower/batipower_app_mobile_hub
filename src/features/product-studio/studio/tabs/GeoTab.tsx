import { Alert, Pressable, Text, View } from 'react-native';

import { Badge } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { StudioFieldKey } from '@/types/hubStudio';

import { geoOf, visibleText } from '../../domain/model';
import { RefreshBar } from '../RefreshBar';
import { useStudio } from '../StudioContext';
import { CharCount, StudioCard, StudioHeading } from '../ui';

/** Onglet GEO : aperçu du résultat de recherche et de la réponse générative (introduction + FAQ). */
export function GeoTab() {
  const styles = useStyles();
  const t = useTheme();
  const studio = useStudio();
  const { draft, blocks } = studio;
  const geo = geoOf(draft);
  const valueOf = (key: StudioFieldKey) =>
    studio.fieldViews.find((field) => field.key === key)?.value ?? '';
  const refreshing = blocks.refreshGeo.isPending;
  // Le recalcul peut relever le score : les critères de mise en ligne sont recontrôlés après, pas avant.
  const deployDisabled =
    !draft?.preparedAt || studio.jobBusy || studio.jobStarting || studio.blocking;

  const intro = visibleText(geo?.introHtml ?? '');
  const faq = geo?.faq ?? [];
  const complete = Boolean(intro) && faq.length >= 3;
  const title = valueOf('metaTitle');
  const meta = valueOf('metaDescription');
  const slug = valueOf('linkRewrite') || studio.reference;

  const confirmRemove = (index: number, question: string) =>
    Alert.alert('Supprimer la question', question, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => blocks.removeGeoFaq.mutate(index),
      },
    ]);

  return (
    <View style={styles.root}>
      <RefreshBar
        pending={refreshing}
        disabled={!draft?.preparedAt}
        onRefresh={() => blocks.refreshGeo.mutate()}
        secondaryAction={{
          label: 'Recalculer et déployer',
          pendingLabel: 'Recalcul et déploiement…',
          pending: studio.refreshingAndDeploying,
          disabled: deployDisabled,
          onPress: studio.requestRefreshAndDeploy,
        }}
      >
        Aperçu du résultat de recherche et de la réponse générative. « Recalculer » met à jour le
        brouillon seulement : rien n’est publié. « Recalculer et déployer » republie en plus le GEO
        sur le site, avec la fiche (PrestaShop, mise en ligne, Google Merchant).
      </RefreshBar>

      <StudioCard>
        <StudioHeading>Aperçu Google</StudioHeading>
        <Text style={styles.serpUrl} numberOfLines={1}>{`https://batipower.fr/…/${slug}`}</Text>
        <Text style={styles.serpTitle}>{title}</Text>
        <Text style={styles.serpMeta}>{meta}</Text>
        <CharCount value={title} min={30} max={70} hint="titre" />
        <CharCount value={meta} min={110} max={160} hint="meta description" />
      </StudioCard>

      {!intro && faq.length === 0 ? (
        <StudioCard>
          <StudioHeading>Réponse générative</StudioHeading>
          <Text style={styles.text}>
            {draft?.preparedAt
              ? 'Aucun contenu GEO dans ce brouillon. Utilisez « Recalculer ».'
              : 'Le GEO sera généré à la préparation de la fiche.'}
          </Text>
        </StudioCard>
      ) : (
        <StudioCard>
          <View style={styles.headRow}>
            <StudioHeading>Réponse générative</StudioHeading>
            <Badge
              label={complete ? 'GEO complet' : 'GEO incomplet'}
              tone={complete ? 'green' : 'amber'}
            />
            <Text style={styles.count}>
              {faq.length} question{faq.length > 1 ? 's' : ''}
            </Text>
          </View>
          {intro ? (
            <Text style={styles.text}>{intro}</Text>
          ) : (
            <Text style={[styles.text, { color: t.warning }]}>Introduction GEO manquante.</Text>
          )}
          {faq.map((item, index) => (
            <View key={`${index}-${item.question}`} style={styles.faq}>
              <View style={styles.faqHead}>
                <Text style={[styles.question, styles.flex]}>{item.question}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Supprimer la question"
                  disabled={blocks.removeGeoFaq.isPending || refreshing}
                  hitSlop={8}
                  onPress={() => confirmRemove(index, item.question)}
                >
                  <Text style={[styles.remove, { color: t.danger }]}>Supprimer</Text>
                </Pressable>
              </View>
              <Text style={styles.answer}>{item.answer}</Text>
            </View>
          ))}
        </StudioCard>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  flex: { flex: 1 },
  serpUrl: { fontSize: 11, color: t.success },
  serpTitle: { fontSize: fontSize.base, lineHeight: 22, color: t.info },
  serpMeta: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { marginLeft: 'auto', fontSize: 11, color: t.textSubtle },
  text: { fontSize: fontSize.sm, lineHeight: 20, color: t.text },
  faq: {
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  faqHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  question: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  answer: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  remove: { fontSize: 11, fontWeight: '700' },
}));
