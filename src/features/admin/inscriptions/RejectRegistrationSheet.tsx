import { useState } from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminAccountsApi } from '@/api/adminAccounts';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { makeStyles, spacing } from '@/theme';

import { usePendingRegistrations } from '../hooks/useAdminPendingCounts';
import { ADMIN_REGISTRATIONS_KEY } from '../queryKeys';

/** Feuille « Refuser » : le motif est obligatoire, il est envoyé par e-mail au demandeur. */
export function RejectRegistrationSheet() {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const registration = usePendingRegistrations().data?.find((r) => r.id === id);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminAccountsApi.rejectRegistration(id, reason.trim()),
    onSuccess: async () => {
      toast.success('Inscription refusée');
      await queryClient.invalidateQueries({ queryKey: ADMIN_REGISTRATIONS_KEY });
      router.back();
    },
    onError: (error) => toast.error(errorMessage(error, 'Impossible de refuser la demande')),
  });

  return (
    <SheetScreen
      title="Refuser"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label="Refuser la demande"
          destructive
          variant="outline"
          disabled={!reason.trim()}
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
          style={styles.submit}
        />
      }
    >
      <Text style={styles.text}>
        {registration ? `Refuser la demande de ${registration.name}. ` : ''}
        Indiquez la raison du refus : elle sera envoyée par e-mail.
      </Text>
      <TextField
        label="Raison du refus"
        value={reason}
        onChangeText={setReason}
        multiline
        textAlignVertical="top"
        placeholder="Raison du refus"
        autoFocus
      />
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  text: { fontSize: 14, lineHeight: 20, color: t.textMuted },
  submit: { marginBottom: spacing.sm },
}));
