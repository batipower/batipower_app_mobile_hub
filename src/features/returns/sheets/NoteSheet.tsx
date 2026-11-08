import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { RETURN_NOTE_MAX_LENGTH } from '@/api/hubReturns';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

import { useReturnDetail } from '../hooks/useReturnDetail';
import { useReturnMutations } from '../hooks/useReturnMutations';

/**
 * Remarque libre pour les managers (une par commande). Sert à signaler un point particulier du
 * retour (colis abîmé, article manquant…) ; l'auteur et la date de dernière modification sont
 * conservés et la remarque apparaît aussi dans l'historique.
 */
export function NoteSheet() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  if (!reference) return null;
  return <Note reference={reference} />;
}

function Note({ reference }: { reference: string }) {
  const styles = useStyles();
  const t = useTheme();
  const detail = useReturnDetail(reference);
  const { updateNote } = useReturnMutations(detail.actionReference);
  const saved = detail.note?.content ?? '';
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? saved;
  const dirty = value.trim() !== saved.trim();

  const save = (content: string) =>
    updateNote.mutate(content, { onSuccess: (res) => res.success && router.back() });

  return (
    <SheetScreen
      title="Remarque manager"
      closeLabel="Annuler"
      closeDisabled={updateNote.isPending}
      footer={
        <View style={styles.footer}>
          {detail.note ? (
            <Button
              label="Effacer"
              variant="outline"
              destructive
              disabled={updateNote.isPending}
              onPress={() => save('')}
              style={styles.footerButton}
            />
          ) : null}
          <Button
            label="Enregistrer"
            loading={updateNote.isPending}
            disabled={!dirty || !detail.order}
            onPress={() => save(value)}
            style={styles.footerButton}
          />
        </View>
      }
    >
      <Text style={styles.hint}>
        Visible par les managers sur la fiche du retour et dans l&apos;historique des retours.
      </Text>
      <TextInput
        value={value}
        onChangeText={setDraft}
        maxLength={RETURN_NOTE_MAX_LENGTH}
        multiline
        editable={!updateNote.isPending}
        placeholder="Ex. : carton écrasé à la réception, article incomplet, client à rappeler…"
        placeholderTextColor={t.textFaint}
        selectionColor={t.accentText}
        keyboardAppearance={t.scheme}
        accessibilityLabel="Remarque manager"
        style={styles.input}
        textAlignVertical="top"
        autoFocus
      />
      <Text style={styles.meta}>
        {detail.note
          ? `Dernière modification par ${detail.note.authorName ?? detail.note.authorEmail ?? 'auteur inconnu'} le ${formatDateTime(detail.note.updatedAt) ?? '—'}`
          : 'Aucune remarque enregistrée.'}
        {'  ·  '}
        {value.length}/{RETURN_NOTE_MAX_LENGTH}
      </Text>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
  input: {
    minHeight: 140,
    padding: spacing.md + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    color: t.text,
    fontSize: 15,
  },
  meta: { fontSize: fontSize.xs, color: t.textSubtle },
  footer: { flexDirection: 'row', gap: spacing.md },
  footerButton: { flex: 1 },
}));
