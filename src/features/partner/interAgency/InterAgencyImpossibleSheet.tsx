import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { fontSize, makeStyles } from '@/theme';
import {
  INTER_AGENCY_REASONS,
  INTER_AGENCY_REASON_LABELS,
  type InterAgencyImpossibleReason,
} from '@/types/partnerInterAgency';

import { OptionRow } from '../shared/SheetRows';
import { useInterAgencyActions } from './hooks/useInterAgencyActions';

const COMMENT_MAX_LENGTH = 500;

/**
 * Feuille « Impossible d'honorer » : motif obligatoire (liste fermée) et commentaire facultatif.
 * La déclaration alerte immédiatement tous les comptes du module HUB, côté back.
 */
export function InterAgencyImpossibleSheet() {
  const { reference, warehouse } = useLocalSearchParams<{ reference: string; warehouse: string }>();
  if (!reference || !warehouse) return null;
  return <ImpossibleForm reference={reference} warehouse={warehouse} />;
}

function ImpossibleForm({ reference, warehouse }: { reference: string; warehouse: string }) {
  const styles = useStyles();
  const { setImpossible } = useInterAgencyActions(reference, warehouse);
  const [reason, setReason] = useState<InterAgencyImpossibleReason | null>(null);
  const [comment, setComment] = useState('');

  const confirm = () => {
    if (!reason) return;
    setImpossible.mutate(
      { value: true, reason, comment: comment.trim() || undefined },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <SheetScreen
      title="Impossible d'honorer"
      closeLabel="Annuler"
      closeDisabled={setImpossible.isPending}
      footer={
        <Button
          label="Confirmer l'impossibilité"
          destructive
          disabled={!reason}
          loading={setImpossible.isPending}
          onPress={confirm}
        />
      }
    >
      <Text style={styles.hint}>
        Tous les comptes du module HUB seront alertés immédiatement par e-mail et dans leurs
        notifications.
      </Text>
      <SheetSection title="Motif">
        <View>
          {INTER_AGENCY_REASONS.map((value) => (
            <OptionRow
              key={value}
              label={INTER_AGENCY_REASON_LABELS[value]}
              selected={reason === value}
              onPress={() => setReason(value)}
            />
          ))}
        </View>
      </SheetSection>
      <TextField
        label="Commentaire (facultatif)"
        value={comment}
        onChangeText={setComment}
        maxLength={COMMENT_MAX_LENGTH}
        multiline
        placeholder="Précisions utiles pour le HUB…"
        editable={!setImpossible.isPending}
      />
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
}));
