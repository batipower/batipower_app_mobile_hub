import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { IGNORE_COMMENT_MAX_LENGTH, IGNORE_COMMENT_MIN_LENGTH } from '@/api/hubCancellationControl';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

import { useCancellationControlMutations } from '../hooks/useCancellationControlMutations';

/**
 * Ignorer une alerte d'annulation : l'alerte n'est plus remontée ni re-vérifiée. Le commentaire
 * est obligatoire (BL conservé volontairement, supprimé à la main, etc.).
 */
export function IgnoreSheet() {
  const { id, label } = useLocalSearchParams<{ id: string; label?: string }>();
  if (!id) return null;
  return <Ignore id={id} label={label ?? ''} />;
}

function Ignore({ id, label }: { id: string; label: string }) {
  const styles = useStyles();
  const t = useTheme();
  const { ignore } = useCancellationControlMutations();
  const [comment, setComment] = useState('');

  const trimmed = comment.trim();
  const canSubmit = trimmed.length >= IGNORE_COMMENT_MIN_LENGTH && !ignore.isPending;

  const submit = () =>
    ignore.mutate({ id, comment: trimmed }, { onSuccess: () => router.back() });

  return (
    <SheetScreen
      title="Ignorer l'alerte"
      closeLabel="Annuler"
      closeDisabled={ignore.isPending}
      footer={
        <Button
          label="Ignorer l'alerte"
          loading={ignore.isPending}
          disabled={!canSubmit}
          onPress={submit}
        />
      }
    >
      <Text style={styles.hint}>
        Commande {label} : l&apos;alerte ne sera plus remontée ni re-vérifiée. Indiquez pourquoi (BL
        conservé volontairement, supprimé à la main, etc.).
      </Text>
      <TextInput
        value={comment}
        onChangeText={setComment}
        maxLength={IGNORE_COMMENT_MAX_LENGTH}
        multiline
        editable={!ignore.isPending}
        placeholder="Commentaire obligatoire…"
        placeholderTextColor={t.textFaint}
        selectionColor={t.accentText}
        keyboardAppearance={t.scheme}
        accessibilityLabel="Commentaire"
        style={styles.input}
        textAlignVertical="top"
        autoFocus
      />
      <Text style={styles.meta}>
        {comment.length}/{IGNORE_COMMENT_MAX_LENGTH}
      </Text>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
  input: {
    minHeight: 120,
    padding: spacing.md + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    color: t.text,
    fontSize: 15,
  },
  meta: { fontSize: fontSize.xs, color: t.textSubtle },
}));
