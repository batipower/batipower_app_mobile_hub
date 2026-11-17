import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { Badge, Button, type BadgeTone } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { StudioFieldDecision } from '@/types/hubStudio';

import {
  DECISION_HELP,
  decisionLabel,
  explainField,
  MODE_LABEL,
  parseDescriptionSections,
  plainText,
  visibleText,
  type FieldOutcome,
} from '../domain/model';
import type { StudioFieldView } from '../hooks/useStudioFieldEditor';
import { showActions } from '../lib/actionSheet';
import { useStudio } from './StudioContext';
import { CharCount, StudioInput } from './ui';

const SAVE_LABEL: Record<string, string> = {
  dirty: 'Modifié',
  saving: 'Enregistrement…',
  saved: 'Enregistré',
  error: "Échec de l'enregistrement",
};

const DECISION_TONE: Record<StudioFieldDecision, BadgeTone> = {
  PENDING: 'neutral',
  ACCEPTED: 'green',
  EDITED: 'amber',
  REJECTED: 'red',
};

/** Aperçu structuré (titres, puces, caractéristiques) de la description HTML. */
function DescriptionPreview({ html }: { html: string }) {
  const styles = useStyles();
  const sections = parseDescriptionSections(html);
  if (!sections.length) {
    const text = visibleText(html);
    return text ? (
      <Text style={styles.previewText}>{text}</Text>
    ) : (
      <Text style={styles.muted}>Aperçu indisponible.</Text>
    );
  }
  return (
    <View style={styles.preview}>
      {sections.map((section, index) => (
        <View key={`${section.title ?? 's'}-${index}`}>
          {section.title ? <Text style={styles.previewTitle}>{section.title}</Text> : null}
          {section.bullets.map((bullet, i) => (
            <View key={`b-${index}-${i}`} style={styles.previewRow}>
              <Text style={styles.muted}>•</Text>
              <Text style={[styles.previewText, styles.flex]}>{bullet}</Text>
            </View>
          ))}
          {section.specs.map((spec, i) => (
            <View key={`s-${index}-${i}`} style={styles.previewRow}>
              <Text style={[styles.muted, styles.flex]}>{spec.name}</Text>
              <Text style={[styles.previewText, styles.specValue]}>{spec.value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Comparaison fiche actuelle / texte en cours ; en mode « Ajusté », surligne les mots nouveaux. */
function FieldDiff({ current, proposed, mode }: { current: string; proposed: string; mode?: string }) {
  const styles = useStyles();
  const t = useTheme();
  if (!proposed && !current) return <Text style={styles.muted}>Vide</Text>;
  const known = new Set((current || '').split(/(\s+)/).map((token) => token.toLowerCase()));
  const tokens = (proposed || '').split(/(\s+)/);
  return (
    <View style={styles.diff}>
      <View style={styles.diffBox}>
        <Text style={styles.diffLabel}>Fiche actuelle</Text>
        <Text style={styles.previewText}>{current || '—'}</Text>
      </View>
      <View style={[styles.diffBox, { borderColor: withAlpha(t.accent, 0.5) }]}>
        <Text style={[styles.diffLabel, { color: t.accentText }]}>En cours</Text>
        <Text style={styles.previewText}>
          {tokens.map((token, index) => {
            const changed = mode === 'ADJUST' && token.trim() && !known.has(token.toLowerCase());
            return (
              <Text
                key={index}
                style={changed ? { backgroundColor: withAlpha(t.warning, 0.4) } : undefined}
              >
                {token}
              </Text>
            );
          })}
        </Text>
      </View>
    </View>
  );
}

/** Bandeau « Pourquoi / Au déploiement / Conseil » : rend le statut du champ compréhensible. */
function Explanation({ field }: { field: StudioFieldView }) {
  const styles = useStyles();
  const t = useTheme();
  const info = explainField(field.decision, field.mode, field.reason);
  const tone: Record<FieldOutcome, string> = {
    WRITE: t.success,
    KEEP: t.neutral,
    DECIDE: t.warning,
  };
  return (
    <View style={[styles.explain, { backgroundColor: withAlpha(tone[info.outcome], 0.1) }]}>
      <Text style={styles.explainText}>
        <Text style={styles.bold}>Pourquoi : </Text>
        {info.why}
      </Text>
      <Text style={styles.explainText}>
        <Text style={styles.bold}>Au déploiement : </Text>
        {info.deploy}
      </Text>
      {info.advice ? (
        <Text style={[styles.explainText, { color: t.textMuted }]}>
          <Text style={styles.bold}>Conseil : </Text>
          {info.advice}
        </Text>
      ) : null}
    </View>
  );
}

/** Carte d'édition d'un champ de contenu : saisie, validation, refus, recalcul IA, comparaison. */
export function FieldCard({ field }: { field: StudioFieldView }) {
  const styles = useStyles();
  const t = useTheme();
  const studio = useStudio();
  const [compare, setCompare] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit');

  const regenerating = studio.isFieldBusy(`regen:${field.key}`);
  const deciding = studio.isFieldBusy(`field:${field.key}`);
  const dirty = field.saveState === 'dirty' || field.saveState === 'error';
  const validated = (field.decision === 'ACCEPTED' || field.decision === 'EDITED') && !dirty;
  const changedFromProposal = field.value !== field.proposal;
  const status = SAVE_LABEL[field.saveState] ?? null;
  const html = field.kind === 'html';

  const openActions = () =>
    showActions(field.label, [
      ...(field.decision !== 'REJECTED' && !deciding
        ? [{ label: 'Refuser', run: () => void studio.rejectField(field.key), destructive: true }]
        : []),
      ...(changedFromProposal && !deciding
        ? [{ label: 'Revenir à la proposition', run: () => void studio.restoreProposal(field.key) }]
        : []),
      { label: 'Recalculer…', run: () => setRegenOpen(true) },
    ]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{field.label}</Text>
        <Badge label={MODE_LABEL[field.mode] ?? field.mode} />
        <Badge
          label={decisionLabel(field.decision, field.reason)}
          tone={DECISION_TONE[field.decision]}
        />
        {status ? (
          <View style={styles.saveState}>
            {field.saveState === 'saving' ? <ActivityIndicator size="small" color={t.textMuted} /> : null}
            <Text
              style={[
                styles.saveText,
                field.saveState === 'error' && { color: t.danger },
                field.saveState === 'dirty' && { color: t.warning },
              ]}
            >
              {status}
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.help}>{DECISION_HELP[field.decision]}</Text>

      <Explanation field={field} />

      <View style={styles.body}>
        {html ? (
          <View style={styles.tabs}>
            {(['edit', 'preview'] as const).map((id) => (
              <Pressable
                key={id}
                onPress={() => setDescTab(id)}
                style={[
                  styles.tab,
                  descTab === id && { backgroundColor: withAlpha(t.accent, 0.2), borderColor: t.accent },
                ]}
              >
                <Text style={[styles.tabText, descTab === id && { color: t.text }]}>
                  {id === 'edit' ? 'Éditer' : 'Aperçu'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {html && descTab === 'preview' ? (
          <DescriptionPreview html={field.value} />
        ) : (
          <StudioInput
            value={field.value}
            editable={!regenerating}
            multiline={field.kind !== 'text'}
            minHeight={field.kind === 'html' ? 180 : (field.rows ?? 4) * 22}
            mono={field.key === 'linkRewrite' || html}
            autoCapitalize={field.key === 'linkRewrite' ? 'none' : 'sentences'}
            autoCorrect={field.key === 'linkRewrite' || html ? false : undefined}
            onChangeText={(value) => studio.setFieldValue(field.key, value)}
            onBlur={() => studio.flushField(field.key)}
          />
        )}

        {field.max != null ? (
          <CharCount value={field.value} min={field.min} max={field.max} hint={field.hint} />
        ) : null}
        {field.saveState === 'error' && field.saveError ? (
          <Text style={[styles.errorText, { color: t.danger }]}>{field.saveError}</Text>
        ) : null}

        <View style={styles.actions}>
          <View style={styles.flex}>
            <Button
              label={deciding ? 'Validation…' : validated ? 'Validé' : 'Valider'}
              variant={validated ? 'outline' : 'primary'}
              loading={deciding}
              disabled={validated || regenerating || studio.jobBusy}
              onPress={() => void studio.validateField(field.key)}
            />
          </View>
          <Button
            label="Actions"
            variant="outline"
            trailingIcon={<ChevronDown size={16} color={t.text} />}
            onPress={openActions}
          />
        </View>

        <Pressable onPress={() => setCompare((open) => !open)} hitSlop={6}>
          <Text style={styles.link}>
            {compare ? 'Masquer la comparaison' : 'Comparer avec la fiche actuelle'}
          </Text>
        </Pressable>

        {regenOpen ? (
          <View style={styles.regen}>
            <StudioInput
              placeholder="Consigne optionnelle : plus court, vouvoiement…"
              value={field.instruction}
              onChangeText={(value) => studio.setFieldHint(field.key, value)}
            />
            <Button
              label={regenerating ? 'Recalcul…' : 'Lancer le recalcul'}
              loading={regenerating}
              disabled={!studio.draft}
              onPress={() => void studio.regenerateField(field.key)}
            />
          </View>
        ) : null}

        {compare ? (
          <FieldDiff
            current={html ? plainText(field.current) : field.current}
            proposed={html ? plainText(field.value) : field.value}
            mode={field.mode}
          />
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  bold: { fontWeight: '700', color: t.text },
  muted: { fontSize: fontSize.xs, color: t.textSubtle },
  card: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  title: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  help: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    fontSize: 11,
    color: t.textSubtle,
  },
  saveState: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  saveText: { fontSize: 11, fontWeight: '600', color: t.textSubtle },
  explain: {
    gap: 2,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  explainText: { fontSize: fontSize.xs, lineHeight: 17, color: t.text },
  body: { gap: spacing.sm, padding: spacing.md },
  tabs: { flexDirection: 'row', gap: spacing.xs },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.border,
  },
  tabText: { fontSize: 11, fontWeight: '700', color: t.textMuted },
  errorText: { fontSize: fontSize.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  link: { fontSize: fontSize.xs, fontWeight: '600', color: t.accentText },
  regen: { gap: spacing.sm },
  preview: { gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: t.surface },
  previewTitle: {
    marginTop: spacing.xs,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: t.textMuted,
  },
  previewRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  previewText: { fontSize: fontSize.xs, lineHeight: 18, color: t.text },
  specValue: { fontWeight: '600', textAlign: 'right', maxWidth: '55%' },
  diff: { gap: spacing.sm },
  diffBox: {
    gap: 4,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  diffLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
}));
