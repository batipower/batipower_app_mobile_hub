import { Pressable, Text, View } from 'react-native';
import { ArrowRight, Check, Rocket, RotateCcw } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { StudioTab } from '@/types/hubStudio';

import { buildDeployRecap, STUDIO_STEPS } from '../../domain/model';
import { useStudio } from '../StudioContext';
import { StudioCard, StudioHeading } from '../ui';

/**
 * Dernière étape du parcours : récapitulatif des étapes validées, ce que le déploiement va faire,
 * et « Valider et déployer » (actif seulement quand tout est validé et que rien ne bloque).
 */
export function DeployStep() {
  const styles = useStyles();
  const t = useTheme();
  const studio = useStudio();
  const steps = STUDIO_STEPS.filter(
    (item): item is { id: StudioTab; label: string } => item.id !== 'deployer',
  );
  const pending = studio.jobStarting || studio.refreshingAndDeploying;
  const blockedByServer = studio.deployBlockers.length > 0 || studio.blocking;
  const ready = studio.allStepsValidated && !blockedByServer && studio.canDeploy;

  return (
    <View style={styles.root}>
      <StudioCard>
        <View style={styles.headRow}>
          <StudioHeading>Étapes de relecture</StudioHeading>
          <Text style={styles.count}>
            {studio.validatedCount}/{studio.totalSteps} validées
          </Text>
        </View>
        {steps.map((item) => {
          const done = studio.isStepValidated(item.id);
          return (
            <View key={item.id} style={styles.stepRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: done ? t.accent : t.surfaceStrong },
                ]}
              >
                {done ? <Check size={12} color={t.onAccent} strokeWidth={3} /> : null}
              </View>
              <Text style={[styles.stepLabel, !done && { color: t.textMuted }]} numberOfLines={1}>
                {item.label}
              </Text>
              {done ? (
                <Pressable
                  disabled={studio.stepValidating || studio.jobBusy}
                  hitSlop={8}
                  style={styles.link}
                  onPress={() => {
                    void studio.reopenStep(item.id);
                    studio.setTab(item.id);
                  }}
                >
                  <RotateCcw size={13} color={t.textMuted} />
                  <Text style={styles.linkMuted}>Rouvrir</Text>
                </Pressable>
              ) : (
                <Pressable hitSlop={8} style={styles.link} onPress={() => studio.setTab(item.id)}>
                  <Text style={[styles.linkText, { color: t.accentText }]}>À valider</Text>
                  <ArrowRight size={13} color={t.accentText} />
                </Pressable>
              )}
            </View>
          );
        })}
      </StudioCard>

      {blockedByServer ? (
        <StudioCard tone="danger">
          <Text style={[styles.blockTitle, { color: t.danger }]}>Mise en ligne bloquée</Text>
          {studio.blocking ? (
            <Text style={styles.line}>
              {'•  Le texte est trop proche de celui du fabricant : l’écriture serait refusée.'}
            </Text>
          ) : null}
          {studio.deployBlockers.map((item) => (
            <Text key={item} style={styles.line}>{`•  ${item}`}</Text>
          ))}
        </StudioCard>
      ) : null}

      <StudioCard>
        <StudioHeading>Ce que fait le déploiement</StudioHeading>
        {buildDeployRecap().map((line) => (
          <Text key={line} style={styles.line}>{`•  ${line}`}</Text>
        ))}
        <Text style={styles.hint}>
          Le déploiement s’exécute en arrière-plan : vous serez notifié à la fin.
        </Text>
      </StudioCard>

      <Button
        label="Valider et déployer"
        leadingIcon={<Rocket size={16} color={t.onAccent} />}
        loading={pending}
        disabled={!ready || pending || studio.jobBusy}
        onPress={studio.requestDeploy}
      />
      {!studio.allStepsValidated ? (
        <Text style={styles.hint}>
          Il reste {studio.remainingSteps.length} étape{studio.remainingSteps.length > 1 ? 's' : ''}{' '}
          à valider : {studio.remainingSteps.join(', ')}.
        </Text>
      ) : null}
      {studio.allStepsValidated && !ready && !studio.jobBusy && studio.deployScoreHint ? (
        <Text style={[styles.hint, { color: t.warning }]}>{studio.deployScoreHint}</Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.lg },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: fontSize.xs, fontWeight: '700', color: t.textMuted },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: fontSize.xs, fontWeight: '700' },
  linkMuted: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  blockTitle: { fontSize: fontSize.sm, fontWeight: '800' },
  line: { fontSize: fontSize.xs, color: t.text, lineHeight: 18 },
  hint: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
}));
