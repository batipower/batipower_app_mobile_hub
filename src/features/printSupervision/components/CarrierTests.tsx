import { Alert, Text, View } from 'react-native';
import { CheckCircle2, Plug, Printer, XCircle } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type {
  CarrierTestMode,
  CarrierTestOption,
  CarrierTestRunResult,
  TestableCarrier,
} from '@/types/hubSupervision';

import { SERVICE_LABELS } from '../display';
import type { CarrierRun } from '../hooks/usePrintServerActions';

type Props = {
  warehouse: string;
  options: CarrierTestOption[];
  /** Impression possible : poste supervisé, activé et connecté. Sinon seul le test API est proposé. */
  canPrint: boolean;
  /** Raison affichée quand « Tester l'impression » est indisponible. */
  printDisabledReason: string;
  runs: Record<string, CarrierRun>;
  /** Transporteur et mode du test en cours, le cas échéant. */
  pending: { carrier: TestableCarrier; mode: CarrierTestMode } | null;
  /** Un test est en cours (tous transporteurs confondus) : les boutons sont bloqués. */
  busy: boolean;
  onTest: (carrier: TestableCarrier, mode: CarrierTestMode) => void;
};

/**
 * Tests transporteurs d'un entrepôt (GLS, DPD) : « Tester l'API » crée puis annule une étiquette,
 * « Tester l'impression » en imprime une vraie sur l'imprimante de l'entrepôt (confirmation
 * demandée, le colis est annulé aussitôt mais l'étiquette sort).
 */
export function CarrierTests({
  warehouse,
  options,
  canPrint,
  printDisabledReason,
  runs,
  pending,
  busy,
  onTest,
}: Props) {
  const styles = useStyles();
  const t = useTheme();
  if (options.length === 0) return null;

  const confirmPrint = (carrier: TestableCarrier) =>
    Alert.alert(
      `Imprimer une étiquette ${carrier} ?`,
      `Une vraie étiquette sera imprimée sur l'imprimante de ${warehouse}. Le colis est annulé aussitôt chez le transporteur : ne pas la coller.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Imprimer', onPress: () => onTest(carrier, 'PRINT') },
      ],
    );

  return (
    <View style={styles.block}>
      <Text style={styles.title}>Tests transporteurs</Text>
      {options.map((option) => {
        const run = runs[`${warehouse}:${option.carrier}`];
        const loadingApi = pending?.carrier === option.carrier && pending.mode === 'API';
        const loadingPrint = pending?.carrier === option.carrier && pending.mode === 'PRINT';
        return (
          <View key={option.carrier} style={styles.carrier}>
            <View style={styles.carrierHeader}>
              <Text style={styles.carrierName}>{option.carrier}</Text>
              <ReadyPill ready={option.ready} />
            </View>
            {!option.ready && option.reason ? <Text style={styles.reason}>{option.reason}</Text> : null}
            <View style={styles.buttons}>
              <Button
                label="Tester l'API"
                variant="outline"
                leadingIcon={<Plug size={14} color={t.accentText} />}
                loading={loadingApi}
                disabled={!option.ready || busy}
                onPress={() => onTest(option.carrier, 'API')}
                style={styles.button}
              />
              <Button
                label="Tester l'impression"
                variant="outline"
                leadingIcon={<Printer size={14} color={t.accentText} />}
                loading={loadingPrint}
                disabled={!option.ready || !canPrint || busy}
                onPress={() => confirmPrint(option.carrier)}
                style={styles.button}
              />
            </View>
            {option.ready && !canPrint ? <Text style={styles.hint}>{printDisabledReason}</Text> : null}
            {run ? <RunResult run={run} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function ReadyPill({ ready }: { ready: boolean }) {
  const styles = useStyles();
  const t = useTheme();
  const color = ready ? t.success : t.danger;
  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(color, 0.14) }]}>
      <Text style={[styles.pillText, { color }]}>{ready ? 'Prêt' : 'Non configuré'}</Text>
    </View>
  );
}

function RunResult({ run }: { run: CarrierRun }) {
  const styles = useStyles();
  const t = useTheme();
  const time = run.at.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return (
    <View style={styles.run}>
      <Text style={styles.hint}>
        Dernier test {run.mode === 'API' ? 'API' : 'impression'} à {time}
      </Text>
      {run.error ? (
        <View style={[styles.result, { backgroundColor: withAlpha(t.danger, 0.12) }]}>
          <XCircle size={13} color={t.danger} />
          <Text style={[styles.resultText, { color: t.danger }]}>{run.error}</Text>
        </View>
      ) : (
        run.result?.results.map((item, index) => (
          <ResultItem key={`${item.serviceKind}-${index}`} item={item} />
        ))
      )}
    </View>
  );
}

function ResultItem({ item }: { item: CarrierTestRunResult['results'][number] }) {
  const styles = useStyles();
  const t = useTheme();
  const failed = !!item.error;
  const notCancelled = !!item.trackingNumber && !item.cancelled;
  const bad = failed || notCancelled;
  const color = bad ? t.danger : t.success;
  const Icon = bad ? XCircle : CheckCircle2;
  return (
    <View style={[styles.result, { backgroundColor: withAlpha(color, 0.12) }]}>
      <Icon size={13} color={color} style={styles.resultIcon} />
      <View style={styles.resultBody}>
        <Text style={[styles.resultTitle, { color }]}>
          {SERVICE_LABELS[item.serviceKind] ?? item.serviceKind}
          {item.account ? `  ${item.account}` : ''}
          {`  ${(item.durationMs / 1000).toFixed(1)} s`}
        </Text>
        {item.error ? <Text style={[styles.resultText, { color }]}>{item.error}</Text> : null}
        {item.trackingNumber ? (
          <Text style={[styles.resultText, { color }]}>
            Suivi {item.trackingNumber} · étiquette {Math.max(1, Math.round(item.labelBytes / 1024))} Ko ·{' '}
            {item.cancelled
              ? 'colis annulé chez le transporteur'
              : `NON ANNULÉ : à annuler chez le transporteur${item.cancelError ? ` (${item.cancelError})` : ''}`}
          </Text>
        ) : null}
        {item.printedFileId ? (
          <Text style={[styles.resultText, { color }]}>
            Envoyée à l&apos;imprimante de l&apos;entrepôt (à ne pas coller).
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  carrier: { gap: spacing.sm },
  carrierHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  carrierName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  pillText: { fontSize: 10, fontWeight: '700' },
  reason: { fontSize: fontSize.xs, color: t.danger },
  buttons: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1, minHeight: 40, paddingHorizontal: spacing.sm },
  hint: { fontSize: fontSize.xs, color: t.textSubtle },
  run: { gap: spacing.xs },
  result: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  resultIcon: { marginTop: 2 },
  resultBody: { flex: 1, gap: 2 },
  resultTitle: { fontSize: fontSize.xs, fontWeight: '700' },
  resultText: { fontSize: fontSize.xs, lineHeight: 16 },
}));
