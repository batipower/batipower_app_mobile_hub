import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminPartnersApi } from '@/api/adminPartners';
import { FilterPill } from '@/components/sheet/FilterPill';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { AdminDistributor, NegoMarginJob } from '@/types/adminPartners';

import { adminNegoMarginJobKey } from '../queryKeys';
import { Notice } from '../shared/components/FormParts';
import { useDistributor, useRefreshPartners } from './hooks';
import {
  DEFAULT_DEP_ONLY_PCT,
  DEFAULT_TARGET_MARGIN_PCT,
  MARGIN_COPY,
  MARGIN_PRESETS,
  currentMargin,
  jobPercent,
  parseMarginInput,
  useNegoMarginJob,
  type MarginKind,
} from './margin';
import { formatPct } from './utils';

/** Feuille de réglage de la marge des opportunités (`kind=nego`), de la remise DEP (`kind=dep`) ou de la remise DEP only (`kind=depOnly`). */
export function MarginSheet() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const { distributor } = useDistributor(id);
  const marginKind: MarginKind = kind === 'dep' ? 'dep' : kind === 'depOnly' ? 'depOnly' : 'nego';
  if (!distributor) {
    return (
      <SheetScreen title={MARGIN_COPY[marginKind].pill}>
        <Text>Chargement…</Text>
      </SheetScreen>
    );
  }
  return <MarginForm distributor={distributor} kind={marginKind} />;
}

function MarginForm({ distributor, kind }: { distributor: AdminDistributor; kind: MarginKind }) {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const refresh = useRefreshPartners();
  const copy = MARGIN_COPY[kind];
  const current = currentMargin(kind, distributor);
  const [input, setInput] = useState(String(current).replace('.', ','));
  const job = useNegoMarginJob(distributor).data;
  const running = kind === 'nego' && job?.status === 'RUNNING';

  const parsed = parseMarginInput(input);
  const changed = parsed !== null && parsed !== current;

  const mutation = useMutation({
    mutationFn: async (value: number): Promise<NegoMarginJob | null> => {
      if (kind === 'nego') return (await adminPartnersApi.setNegoMargin(distributor.id, value)).job;
      if (kind === 'depOnly') await adminPartnersApi.setDepOnlyDiscount(distributor.id, value);
      else await adminPartnersApi.setDepDiscount(distributor.id, value);
      return null;
    },
    onSuccess: async (job) => {
      if (job) {
        queryClient.setQueryData(adminNegoMarginJobKey(distributor.id), job);
        toast.success('Marge enregistrée : recalcul des prix en cours');
      } else {
        toast.success(
          kind === 'nego' ? 'Marge enregistrée' : kind === 'dep' ? 'Remise DEP enregistrée' : 'Remise DEP only enregistrée',
        );
      }
      await refresh();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'enregistrement")),
  });

  return (
    <SheetScreen
      title={copy.pill}
      closeLabel="Fermer"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label={copy.apply}
          loading={mutation.isPending}
          disabled={!changed || running}
          onPress={() => parsed !== null && mutation.mutate(parsed)}
          style={styles.submit}
        />
      }
    >
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.text}>{copy.description(distributor.name)}</Text>
      {running && job ? (
        <Notice tone="warning">
          Recalcul en cours : {job.examined.toLocaleString('fr-FR')} / {job.total.toLocaleString('fr-FR')}
          {jobPercent(job) !== null ? ` (${jobPercent(job)} %)` : ''}. Un nouveau changement de marge sera possible à la fin.
        </Notice>
      ) : null}
      <View style={styles.presets}>
        {MARGIN_PRESETS.map((p) => (
          <FilterPill
            key={p}
            label={`${p} %${p === (kind === 'depOnly' ? DEFAULT_DEP_ONLY_PCT : DEFAULT_TARGET_MARGIN_PCT) ? ' (défaut)' : ''}`}
            state={parsed === p ? 'on' : 'off'}
            onPress={() => setInput(String(p))}
          />
        ))}
      </View>
      <TextField
        label={copy.label}
        value={input}
        onChangeText={setInput}
        keyboardType="decimal-pad"
        error={parsed === null ? 'Entre 0 et 30 %.' : undefined}
      />
      <Text style={styles.text}>
        Valeur actuelle : {formatPct(current)}. {copy.hint}
      </Text>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  title: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  text: { fontSize: fontSize.xs, lineHeight: 18, color: t.textMuted },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  submit: { marginBottom: spacing.sm },
}));
