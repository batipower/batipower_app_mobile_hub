import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminQuoteBankAccountsApi } from '@/api/adminPlatform';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { makeStyles, spacing } from '@/theme';
import type { QuoteBankAccount } from '@/types/adminPlatform';

import { ADMIN_BANK_ACCOUNTS_KEY, ADMIN_BANK_EVENTS_KEY } from '../../queryKeys';
import { formatIban, isValidBic, isValidIban } from '../../shared/iban';
import { useBankAccounts } from '../hooks';
import { RibPreview } from './RibPreview';

const DEFAULT_HOLDER = 'POWER SOLUTIONS — 23 Rue de Sarre, 57070 METZ';

type FormState = { label: string; holder: string; iban: string; bic: string; domiciliation: string };

function initialState(account?: QuoteBankAccount): FormState {
  return {
    label: account?.label ?? '',
    holder: account?.holder ?? DEFAULT_HOLDER,
    iban: account?.iban ?? '',
    bic: account?.bic ?? '',
    domiciliation: account?.domiciliation ?? '',
  };
}

/** Feuille de création / modification d'un RIB (`id` en paramètre = modification). */
export function BankAccountFormSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const accounts = useBankAccounts();
  const account = id ? accounts.data?.find((a) => a.id === id) : undefined;
  // Le formulaire n'est monté qu'une fois le RIB connu : son état initial en dépend.
  if (id && !account) {
    return <SheetScreen title="Modifier le RIB"><Text>Chargement…</Text></SheetScreen>;
  }
  return <BankAccountForm account={account} />;
}

function BankAccountForm({ account }: { account?: QuoteBankAccount }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => initialState(account));
  const set = (key: keyof FormState) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const ibanError = form.iban && !isValidIban(form.iban) ? 'IBAN invalide (format ou clé de contrôle).' : undefined;
  const bicError = form.bic && !isValidBic(form.bic) ? 'BIC invalide (8 ou 11 caractères).' : undefined;
  const complete =
    !!form.label.trim() &&
    !!form.holder.trim() &&
    !!form.domiciliation.trim() &&
    isValidIban(form.iban) &&
    isValidBic(form.bic);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        label: form.label.trim(),
        holder: form.holder.trim(),
        iban: formatIban(form.iban),
        bic: form.bic.replace(/\s/g, '').toUpperCase(),
        domiciliation: form.domiciliation.trim(),
      };
      return account
        ? adminQuoteBankAccountsApi.update(account.id, payload)
        : adminQuoteBankAccountsApi.create(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_BANK_ACCOUNTS_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_BANK_EVENTS_KEY }),
      ]);
      toast.success(account ? 'RIB mis à jour' : "RIB créé (inactif : activez-le pour l'utiliser sur les devis)");
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'enregistrement")),
  });

  return (
    <SheetScreen
      title={account ? 'Modifier le RIB' : 'Nouveau RIB'}
      closeLabel="Annuler"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label="Enregistrer"
          loading={mutation.isPending}
          disabled={!complete}
          onPress={() => mutation.mutate()}
          style={styles.submit}
        />
      }
    >
      <Text style={styles.hint}>
        Code banque, guichet, n° de compte et clé RIB sont déduits automatiquement de l’IBAN français.
      </Text>
      <TextField label="Libellé interne" value={form.label} onChangeText={set('label')} placeholder="Compte principal" />
      <TextField label="Titulaire et adresse" value={form.holder} onChangeText={set('holder')} />
      <TextField
        label="IBAN"
        value={form.iban}
        onChangeText={(v) => set('iban')(v.toUpperCase())}
        onBlur={() => form.iban && set('iban')(formatIban(form.iban))}
        placeholder="FR76 …"
        autoCapitalize="characters"
        autoCorrect={false}
        error={ibanError}
      />
      <TextField
        label="BIC"
        value={form.bic}
        onChangeText={(v) => set('bic')(v.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        error={bicError}
      />
      <TextField
        label="Domiciliation (banque et adresse)"
        value={form.domiciliation}
        onChangeText={set('domiciliation')}
        placeholder="Nom de la banque, adresse"
      />
      <View style={styles.preview}>
        <Text style={styles.hint}>Aperçu sur le devis</Text>
        <RibPreview holder={form.holder} iban={form.iban} bic={form.bic} domiciliation={form.domiciliation} />
      </View>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: 12, lineHeight: 17, color: t.textMuted },
  preview: { gap: spacing.xs },
  submit: { marginBottom: spacing.sm },
}));
