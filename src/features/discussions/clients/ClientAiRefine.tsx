import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Sparkles, Undo2 } from 'lucide-react-native';

import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

/** Consignes prédéfinies, identiques à celles du composer web. */
export const REFINE_PRESETS: readonly { label: string; instructions: string }[] = [
  { label: 'Raccourcir', instructions: 'Raccourcis le message en gardant l’essentiel.' },
  { label: 'Plus chaleureux', instructions: 'Adopte un ton plus chaleureux et empathique.' },
  { label: 'Plus formel', instructions: 'Adopte un ton plus formel.' },
  {
    label: 'Ajouter des excuses',
    instructions: 'Ajoute des excuses sincères pour la gêne occasionnée.',
  },
];

/** Même limite que le back (`AiRefineDto.instructions`). */
const REFINE_INSTRUCTIONS_MAX_LENGTH = 500;

type ClientAiRefineProps = {
  /** Affinage en cours. */
  refining: boolean;
  /** Une autre requête IA (Réponse IA) ou l'envoi est en cours. */
  disabled: boolean;
  canUndo: boolean;
  onRefine: (instructions: string) => Promise<boolean>;
  onUndo: () => void;
};

/**
 * Affinage du brouillon par l'IA : presets (Raccourcir, Plus chaleureux…) et consigne libre.
 * « Annuler l'affinage » restaure le texte d'avant le dernier affinage.
 */
export function ClientAiRefine({ refining, disabled, canUndo, onRefine, onUndo }: ClientAiRefineProps) {
  const styles = useStyles();
  const t = useTheme();
  const [instructions, setInstructions] = useState('');
  const inactive = disabled || refining;

  async function submit(text: string, fromInput: boolean) {
    if (inactive || !text.trim()) return;
    const replaced = await onRefine(text);
    if (replaced && fromInput) setInstructions('');
  }

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presets}
        keyboardShouldPersistTaps="handled"
      >
        {REFINE_PRESETS.map((preset) => (
          <Pressable
            key={preset.label}
            accessibilityRole="button"
            accessibilityLabel={`Affiner : ${preset.label}`}
            accessibilityState={{ disabled: inactive }}
            disabled={inactive}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => void submit(preset.instructions, false)}
            style={[styles.preset, inactive && styles.disabled]}
          >
            <Text style={styles.presetText}>{preset.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={instructions}
          onChangeText={(text) => setInstructions(text.slice(0, REFINE_INSTRUCTIONS_MAX_LENGTH))}
          editable={!inactive}
          placeholder="Consigne : ajoute une excuse, ton plus formel…"
          placeholderTextColor={t.textFaint}
          selectionColor={t.accentText}
          keyboardAppearance={t.scheme}
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={() => void submit(instructions, true)}
          accessibilityLabel="Consigne d’affinage du brouillon"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Affiner le brouillon"
          accessibilityState={{ disabled: inactive || !instructions.trim(), busy: refining }}
          disabled={inactive || !instructions.trim()}
          onPress={() => void submit(instructions, true)}
          style={[styles.refineButton, (inactive || !instructions.trim()) && styles.disabled]}
        >
          {refining ? (
            <ActivityIndicator size="small" color={t.info} />
          ) : (
            <Sparkles size={16} color={t.info} />
          )}
          <Text style={styles.refineButtonText}>Affiner</Text>
        </Pressable>
      </View>

      {canUndo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Annuler l’affinage et restaurer le brouillon précédent"
          accessibilityState={{ disabled: refining }}
          disabled={refining}
          onPress={onUndo}
          style={[styles.undo, refining && styles.disabled]}
        >
          <Undo2 size={16} color={t.textMuted} />
          <Text style={styles.undoText}>Annuler l’affinage</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(t.info, 0.25),
    backgroundColor: withAlpha(t.info, 0.07),
  },
  presets: { gap: spacing.sm },
  preset: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: withAlpha(t.info, 0.3),
    backgroundColor: t.card,
  },
  presetText: { fontSize: fontSize.xs, fontWeight: '700', color: t.info },
  disabled: { opacity: 0.45 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: hitTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    color: t.text,
    fontSize: fontSize.sm,
  },
  refineButton: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.info, 0.35),
    backgroundColor: withAlpha(t.info, 0.12),
  },
  refineButtonText: { fontSize: fontSize.sm, fontWeight: '700', color: t.info },
  undo: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  undoText: { fontSize: fontSize.sm, fontWeight: '600', color: t.textMuted },
}));
