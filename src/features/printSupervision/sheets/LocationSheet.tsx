import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubSupervisionApi } from '@/api/hubSupervision';
import { HUB_DASHBOARD_KEY } from '@/features/cockpit/hooks/useCockpitData';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { PrintServerLocationInput } from '@/types/hubSupervision';

import { usePrintOverview } from '../hooks/usePrintSupervision';
import { PRINT_SUPERVISION_KEY } from '../queryKeys';

type Draft = { label: string; address: string; postalCode: string; city: string };

/**
 * Adresse postale d'un poste d'impression (libellé facultatif, rue, code postal, ville). Le back
 * la géocode pour placer le poste sur la carte ; « Retirer l'adresse » l'efface.
 */
export function LocationSheet() {
  const { serverId } = useLocalSearchParams<{ serverId: string }>();
  if (!serverId) return null;
  return <Location serverId={serverId} />;
}

function Location({ serverId }: { serverId: string }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const overview = usePrintOverview(true);
  const server = overview.data?.servers.find((item) => item.serverId === serverId);
  const saved = server?.location ?? null;

  // Saisie : tant que rien n'est modifié, les champs reprennent l'adresse enregistrée.
  const [draft, setDraft] = useState<Draft | null>(null);
  const value: Draft = draft ?? {
    label: saved?.locationLabel ?? '',
    address: saved?.addressLine ?? '',
    postalCode: saved?.postalCode ?? '',
    city: saved?.city ?? '',
  };
  const update = (patch: Partial<Draft>) => setDraft({ ...value, ...patch });

  const save = useMutation({
    mutationFn: (input: PrintServerLocationInput | { clear: true }) =>
      hubSupervisionApi.setPrintServerLocation(serverId, input),
    onSuccess: (_result, input) => {
      toast.success('clear' in input ? 'Adresse retirée' : 'Adresse enregistrée');
      void queryClient.invalidateQueries({ queryKey: PRINT_SUPERVISION_KEY });
      void queryClient.invalidateQueries({ queryKey: [...HUB_DASHBOARD_KEY, 'print-servers'] });
      router.back();
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError && error.message ? error.message : "Impossible d'enregistrer l'adresse",
      ),
  });

  const valid =
    value.address.trim().length > 0 && value.postalCode.trim().length > 0 && value.city.trim().length > 0;
  const dirty =
    value.label.trim() !== (saved?.locationLabel ?? '') ||
    value.address.trim() !== (saved?.addressLine ?? '') ||
    value.postalCode.trim() !== (saved?.postalCode ?? '') ||
    value.city.trim() !== (saved?.city ?? '');

  const submit = () =>
    save.mutate({
      locationLabel: value.label.trim() || null,
      addressLine: value.address.trim(),
      postalCode: value.postalCode.trim(),
      city: value.city.trim(),
    });

  const confirmClear = () =>
    Alert.alert("Retirer l'adresse ?", 'Le poste disparaîtra de la carte.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => save.mutate({ clear: true }) },
    ]);

  return (
    <SheetScreen
      title={server ? `Adresse · ${server.warehouse}` : 'Adresse du poste'}
      closeLabel="Annuler"
      closeDisabled={save.isPending}
      footer={
        <View style={styles.footer}>
          {saved ? (
            <Button
              label="Retirer l'adresse"
              variant="outline"
              destructive
              disabled={save.isPending}
              onPress={confirmClear}
              style={styles.footerButton}
            />
          ) : null}
          <Button
            label="Enregistrer"
            loading={save.isPending}
            disabled={!valid || !dirty || !server}
            onPress={submit}
            style={styles.footerButton}
          />
        </View>
      }
    >
      <Text style={styles.hint}>
        L&apos;adresse du poste d&apos;impression, géocodée pour le placer sur la carte de la supervision.
      </Text>
      <TextField
        label="Libellé (facultatif)"
        value={value.label}
        onChangeText={(label) => update({ label })}
        placeholder="Ex. : Entrepôt de Flévy"
        autoCapitalize="sentences"
        editable={!save.isPending}
      />
      <TextField
        label="Adresse"
        value={value.address}
        onChangeText={(address) => update({ address })}
        placeholder="N° et rue"
        autoComplete="street-address"
        editable={!save.isPending}
      />
      <TextField
        label="Code postal"
        value={value.postalCode}
        onChangeText={(postalCode) => update({ postalCode })}
        keyboardType="number-pad"
        autoComplete="postal-code"
        maxLength={10}
        editable={!save.isPending}
      />
      <TextField
        label="Ville"
        value={value.city}
        onChangeText={(city) => update({ city })}
        autoCapitalize="words"
        editable={!save.isPending}
      />
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
  footer: { flexDirection: 'row', gap: spacing.md },
  footerButton: { flex: 1 },
}));
