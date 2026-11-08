import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminApiKeysApi } from '@/api/adminPlatform';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { makeStyles, spacing } from '@/theme';

import { useApiKeyRequests } from '../hooks';
import { useInvalidateApiKeys } from './useApiKeyActions';

/** Refus d'une demande de clé API, avec un motif facultatif transmis au demandeur. */
export function RejectApiKeyRequestSheet() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const styles = useStyles();
  const invalidate = useInvalidateApiKeys();
  const requests = useApiKeyRequests();
  const request = requests.data?.data.find((r) => r.uuid === uuid);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminApiKeysApi.rejectRequest(uuid, reason.trim() || undefined),
    onSuccess: async () => {
      toast.success('Demande refusée');
      await invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors du refus')),
  });

  return (
    <SheetScreen
      title="Refuser la demande"
      closeLabel="Annuler"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label="Refuser la demande"
          destructive
          variant="outline"
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
          style={styles.submit}
        />
      }
    >
      {request ? (
        <Text style={styles.hint}>
          {request.requesterName}
          {request.requesterEmail ? ` · ${request.requesterEmail}` : ''}
        </Text>
      ) : null}
      <TextField
        label="Motif (facultatif)"
        value={reason}
        onChangeText={setReason}
        multiline
        placeholder="Expliquez pourquoi la demande est refusée"
      />
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: 13, color: t.textMuted },
  submit: { marginBottom: spacing.sm },
}));
