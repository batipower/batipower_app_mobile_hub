import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserX } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { adminAccountsApi } from '@/api/adminAccounts';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { EmptyState, errorMessage } from '@/features/preparation/components/ListState';
import { makeStyles, spacing, useTheme } from '@/theme';
import type { PendingRegistration } from '@/types/admin';

import { useSubsidiaryOptions } from '../hooks/useAdminOptions';
import { usePendingRegistrations } from '../hooks/useAdminPendingCounts';
import { ADMIN_REGISTRATIONS_KEY, ADMIN_USERS_KEY } from '../queryKeys';
import {
  REGISTRATION_ROLES,
  accessPayload,
  brandAccessFromUser,
  effectiveModules,
  pickDefaultModule,
  validateAccessForm,
  type AccessFormValue,
} from '../shared/accessRules';
import { AccessFields } from '../shared/components/AccessFields';

/** Feuille « Approuver » : définit le rôle et les accès du compte créé à partir de la demande. */
export function ApproveRegistrationSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = usePendingRegistrations();
  const registration = query.data?.find((r) => r.id === id);

  if (!registration) {
    return <MissingRegistration loading={query.isLoading} />;
  }
  return <ApproveForm registration={registration} />;
}

function MissingRegistration({ loading }: { loading: boolean }) {
  const t = useTheme();
  return (
    <SheetScreen title="Approuver">
      <EmptyState
        icon={<UserX size={24} color={t.textMuted} />}
        title={loading ? 'Chargement…' : 'Demande introuvable'}
        text={loading ? undefined : "Cette demande a déjà été traitée ou n'existe plus."}
      />
    </SheetScreen>
  );
}

function ApproveForm({ registration }: { registration: PendingRegistration }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const subsidiaries = useSubsidiaryOptions();

  const requested = effectiveModules(registration.modules);
  const [value, setValue] = useState<AccessFormValue>(() => ({
    role: 'ACHETEUR',
    code: '',
    categoryTypes: [],
    warehouse: '',
    subsidiaryId: '',
    modules: requested,
    defaultModule: pickDefaultModule(requested, registration.defaultModule),
    brandAccess: brandAccessFromUser(),
  }));

  const mutation = useMutation({
    mutationFn: () => adminAccountsApi.approveRegistration(registration.id, accessPayload(value, 'create')),
    onSuccess: async () => {
      toast.success('Inscription approuvée');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_REGISTRATIONS_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
      ]);
      router.back();
    },
    onError: (error) => toast.error(errorMessage(error, "Impossible d'approuver l'inscription")),
  });

  const submit = () => {
    const sub = subsidiaries.data?.find((o) => o.id === value.subsidiaryId);
    const problem = validateAccessForm(value, sub);
    if (problem) {
      toast.error(problem);
      return;
    }
    mutation.mutate();
  };

  return (
    <SheetScreen
      title="Approuver"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label="Approuver"
          loading={mutation.isPending}
          onPress={submit}
          style={styles.submit}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.name}>{registration.name}</Text>
        <Text style={styles.email}>{registration.email}</Text>
        <Text style={styles.email}>Définissez le rôle et les permissions du nouvel utilisateur.</Text>
      </View>
      <AccessFields value={value} onChange={setValue} roles={REGISTRATION_ROLES} />
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  intro: { gap: 2 },
  name: { fontSize: 18, fontWeight: '700', color: t.text },
  email: { fontSize: 13, color: t.textMuted },
  submit: { marginBottom: spacing.sm },
}));
