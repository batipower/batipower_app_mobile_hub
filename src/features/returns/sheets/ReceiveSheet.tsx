import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type {
  ReceiveReturnKind,
  ReturnBrokenCause,
  ReturnItemCondition,
  ReturnPackagingCondition,
} from '@/api/hubReturns';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { ErrorBanner } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, monoFontFamily, useTheme } from '@/theme';

import { ConditionPicker } from '../components/ConditionPicker';
import { PackagingPicker } from '../components/PackagingPicker';
import { conditionKey } from '../constants';
import { useReturnDetail } from '../hooks/useReturnDetail';
import { useReturnMutations } from '../hooks/useReturnMutations';

type Selection = { condition: ReturnItemCondition; brokenCause: ReturnBrokenCause | null };

/** Réception d'un retour : type (colis ou point relais), état de l'article (requis), emballage (facultatif). */
export function ReceiveSheet() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  if (!reference) return null;
  return <Receive reference={reference} />;
}

function Receive({ reference }: { reference: string }) {
  const styles = useStyles();
  const t = useTheme();
  const detail = useReturnDetail(reference);
  const { receive } = useReturnMutations(detail.actionReference);
  const [kind, setKind] = useState<ReceiveReturnKind>('standard');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [packaging, setPackaging] = useState<ReturnPackagingCondition | null>(null);

  const { nextLabelToReceive, batch } = detail;
  const multiParcel = batch.length > 1;

  const submit = () => {
    if (!selection) return;
    receive.mutate(
      {
        type: kind,
        returnLabelUuid: kind === 'standard' ? (detail.activeReturnLabelUuid ?? undefined) : undefined,
        condition: selection.condition,
        brokenCause: selection.brokenCause ?? undefined,
        packagingCondition: packaging ?? undefined,
      },
      { onSuccess: (res) => res.success && router.back() },
    );
  };

  return (
    <SheetScreen
      title="Réceptionner le retour"
      closeLabel="Annuler"
      closeDisabled={receive.isPending}
      footer={
        <Button
          label="Valider la réception"
          loading={receive.isPending}
          disabled={!selection || !detail.order}
          onPress={submit}
        />
      }
    >
      <Text style={styles.reference}>{detail.actionReference}</Text>

      {detail.query.isPending ? <ActivityIndicator color={t.accentText} /> : null}
      {detail.query.error && !detail.order ? (
        <ErrorBanner
          error={detail.query.error}
          fallback="Impossible de charger le retour"
          onRetry={() => void detail.query.refetch()}
        />
      ) : null}

      <SegmentedControl
        segments={[
          { key: 'standard', label: 'Colis reçu' },
          { key: 'relay-point', label: 'Point relais' },
        ]}
        value={kind}
        onChange={setKind}
      />
      <Text style={styles.hint}>
        {kind === 'relay-point'
          ? 'Retour déposé en point relais : il est enregistré sans étiquette de retour.'
          : multiParcel && nextLabelToReceive
            ? `Colis ${nextLabelToReceive.parcelIndex}/${nextLabelToReceive.parcelCount} · ${nextLabelToReceive.noSuivi}`
            : 'Le colis est vérifié et rattaché à son étiquette de retour ou à son retour marketplace.'}
      </Text>

      <SheetSection title="État de l'article">
        <ConditionPicker
          condition={selection?.condition}
          brokenCause={selection?.brokenCause}
          pendingKey={
            receive.isPending && selection
              ? conditionKey(selection.condition, selection.brokenCause)
              : null
          }
          disabled={receive.isPending}
          onSelect={(condition, brokenCause) => setSelection({ condition, brokenCause })}
        />
      </SheetSection>

      <SheetSection title="Emballage (facultatif)">
        <PackagingPicker value={packaging} onChange={setPackaging} disabled={receive.isPending} />
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  reference: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
