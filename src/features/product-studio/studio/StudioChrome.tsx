import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, RotateCcw, SkipForward } from 'lucide-react-native';

import { Badge, Button } from '@/components/ui';
import { fontSize, hitTarget, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { StudioStepId } from '@/types/hubStudio';

import { draftStatusCopy, STUDIO_STEPS } from '../domain/model';
import { useStudio } from './StudioContext';
import { ProgressBar } from './ui';

// ─── Relecture en série ───────────────────────────────────────────────────────

export type SessionBarProps = {
  references: readonly string[];
  index: number;
  busy: boolean;
  onNavigate: (index: number) => void;
  onDismiss: () => void;
};

/** Bandeau « Fiche 3 / 12 » : précédente, suivante, écarter et passer à la suivante. */
export function StudioSessionBar({ references, index, busy, onNavigate, onDismiss }: SessionBarProps) {
  const styles = useStyles();
  const t = useTheme();
  const hasPrevious = index > 0;
  const hasNext = index < references.length - 1;
  const percent = references.length ? Math.round(((index + 1) / references.length) * 100) : 0;

  return (
    <View style={styles.sessionWrap}>
      <View style={styles.sessionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fiche précédente"
          disabled={!hasPrevious}
          onPress={() => onNavigate(index - 1)}
          hitSlop={8}
          style={[styles.sessionBtn, !hasPrevious && styles.disabled]}
        >
          <ChevronLeft size={20} color={t.text} />
        </Pressable>
        <View style={styles.sessionCenter}>
          <Text style={styles.sessionLabel}>Relecture</Text>
          <Text style={styles.sessionCount}>
            Fiche {index + 1} / {references.length}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fiche suivante"
          disabled={!hasNext}
          onPress={() => onNavigate(index + 1)}
          hitSlop={8}
          style={[styles.sessionBtn, !hasNext && styles.disabled]}
        >
          <ChevronRight size={20} color={t.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Écarter et passer à la suivante"
          disabled={busy}
          onPress={onDismiss}
          hitSlop={8}
          style={[styles.dismissBtn, busy && styles.disabled]}
        >
          <SkipForward size={14} color={t.textMuted} />
          <Text style={styles.dismissText}>Écarter</Text>
        </Pressable>
      </View>
      <ProgressBar value={percent} />
    </View>
  );
}

// ─── Résumé de la fiche ───────────────────────────────────────────────────────

/** Référence, statut du brouillon et notes (actuelle / projetée). */
export function StudioSummary() {
  const styles = useStyles();
  const studio = useStudio();
  const status = draftStatusCopy(studio.draft);
  const name = studio.fieldViews.find((f) => f.key === 'name')?.current ?? '';
  const projected = studio.draft?.projectedScore?.score;
  const tone = status
    ? ({ sky: 'blue', green: 'green', red: 'red', slate: 'neutral' } as const)[status.tone]
    : 'neutral';
  const guide = studio.launchGuide;
  const toFix = guide.mode === 'blocked' ? guide.todo.length : 0;

  return (
    <View style={styles.summary}>
      <View style={styles.summaryTop}>
        <Text style={styles.reference} numberOfLines={1}>
          {studio.reference}
        </Text>
        {studio.deployScore != null ? (
          <Text style={styles.score}>
            {studio.deployScore}
            {studio.deployGrade ? ` ${studio.deployGrade}` : ''}
            {projected != null ? ` → ${projected}` : ''}
            <Text style={styles.scoreUnit}> /100</Text>
          </Text>
        ) : null}
      </View>
      {name ? (
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      ) : null}
      <View style={styles.badges}>
        {status ? <Badge label={status.label} tone={tone} style={styles.badgeWide} /> : null}
        {toFix > 0 ? (
          <Pressable onPress={() => studio.goToStep(guide.current)} accessibilityRole="button">
            <Badge
              label={`${toFix} point${toFix > 1 ? 's' : ''} à corriger`}
              tone="red"
              style={styles.badgeWide}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Fil d'étapes ─────────────────────────────────────────────────────────────

/** Fil horizontal des 7 étapes : validée (coche), à corriger (point rouge), active (surlignée). */
export function StudioStepper() {
  const styles = useStyles();
  const t = useTheme();
  const studio = useStudio();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const index = STUDIO_STEPS.findIndex((s) => s.id === studio.tab);

  useEffect(() => {
    scrollRef.current?.scrollTo({ x: Math.max(0, index * 104 - 80), animated: true });
  }, [index]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stepper}
      style={styles.stepperScroll}
    >
      {STUDIO_STEPS.map((step) => {
        const active = studio.tab === step.id;
        const validated = studio.isStepValidated(step.id);
        const todo =
          step.id !== 'deployer' &&
          (studio.launchByTab[step.id as Exclude<StudioStepId, 'deployer'>]?.length ?? 0) > 0;
        return (
          <Pressable
            key={step.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => studio.setTab(step.id)}
            style={[
              styles.step,
              active && { backgroundColor: withAlpha(t.accent, 0.18), borderColor: t.accent },
            ]}
          >
            {validated ? (
              <Check size={13} color={t.accentText} strokeWidth={3} />
            ) : todo ? (
              <View style={[styles.todoDot, { backgroundColor: t.danger }]} />
            ) : null}
            <Text style={[styles.stepText, active && { color: t.text, fontWeight: '700' }]}>
              {step.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Pied d'étape ─────────────────────────────────────────────────────────────

const labelOf = (id: string | null) => STUDIO_STEPS.find((s) => s.id === id)?.label ?? '';

/** Valider l'étape et continuer (ou la rouvrir) ; sur « Contenu », tout accepter et valider. */
export function StudioStepFooter() {
  const styles = useStyles();
  const t = useTheme();
  const studio = useStudio();
  const { tab } = studio;
  if (tab === 'deployer') return null;

  const validated = studio.isStepValidated(tab);
  const busy = studio.stepValidating || studio.jobBusy || studio.jobStarting;
  const pendingFields = tab === 'contenu' ? studio.pendingFieldCount : 0;
  const brandMissing = tab === 'contenu' && studio.brandMissing;
  const index = STUDIO_STEPS.findIndex((s) => s.id === tab);

  return (
    <View style={styles.footer}>
      <View style={styles.footerInfo}>
        <Text style={styles.footerStep} numberOfLines={1}>
          Étape {index + 2} sur {STUDIO_STEPS.length + 2} · {labelOf(tab)}
          {validated ? ' · validée' : ''}
        </Text>
        {brandMissing && !validated ? (
          <Text style={[styles.footerWarn, { color: t.danger }]}>Marque obligatoire</Text>
        ) : pendingFields > 0 && !validated ? (
          <Text style={[styles.footerWarn, { color: t.warning }]}>
            {pendingFields} champ{pendingFields > 1 ? 's' : ''} à décider
          </Text>
        ) : null}
      </View>
      <View style={styles.footerActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Étape précédente"
          disabled={!studio.previousStep}
          onPress={studio.goPreviousStep}
          style={[styles.navBtn, !studio.previousStep && styles.disabled]}
        >
          <ArrowLeft size={18} color={t.text} />
        </Pressable>
        <View style={styles.footerMain}>
          {validated ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Button
                  label="Rouvrir"
                  variant="outline"
                  disabled={busy}
                  leadingIcon={<RotateCcw size={15} color={t.text} />}
                  onPress={() => void studio.reopenStep(tab)}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label={labelOf(studio.nextStep)}
                  trailingIcon={<ArrowRight size={16} color={t.onAccent} />}
                  onPress={studio.goNextStep}
                />
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              {pendingFields > 0 ? (
                <View style={styles.flex}>
                  <Button
                    label="Tout accepter"
                    variant="outline"
                    disabled={busy || brandMissing || Boolean(studio.bulk)}
                    onPress={() => void studio.acceptAllAndValidate()}
                  />
                </View>
              ) : null}
              <View style={styles.flex}>
                <Button
                  label="Valider et continuer"
                  loading={studio.stepValidating}
                  disabled={busy || pendingFields > 0 || brandMissing || !studio.draft?.preparedAt}
                  onPress={() => void studio.validateCurrentStep()}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  disabled: { opacity: 0.35 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },

  sessionWrap: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: t.surface,
  },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sessionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: t.surfaceStrong,
  },
  sessionCenter: { flex: 1 },
  sessionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  sessionCount: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: t.surfaceStrong,
  },
  dismissText: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },

  summary: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  reference: {
    flex: 1,
    fontFamily: monoFontFamily,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: t.text,
  },
  score: { fontSize: fontSize.base, fontWeight: '800', color: t.text },
  scoreUnit: { fontSize: fontSize.xs, fontWeight: '500', color: t.textSubtle },
  name: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badgeWide: { maxWidth: 280 },

  stepperScroll: { flexGrow: 0 },
  stepper: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  stepText: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  todoDot: { width: 7, height: 7, borderRadius: 4 },

  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.bg,
  },
  footerInfo: { gap: 2 },
  footerStep: { fontSize: 11, color: t.textSubtle },
  footerWarn: { fontSize: fontSize.xs, fontWeight: '700' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footerMain: { flex: 1 },
  navBtn: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.borderStrong,
  },
}));
