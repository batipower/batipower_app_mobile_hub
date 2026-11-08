import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, TriangleAlert } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { supportChatApi } from '@/api/supportChat';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Badge, Button, TextField, type BadgeTone } from '@/components/ui';
import { EmptyState, ErrorBanner, errorMessage } from '@/features/preparation/components/ListState';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { openOrder } from '@/features/search/navigation';
import { formatDateTime, formatEuro } from '@/lib/format';
import {
  fontSize,
  hitTarget,
  makeStyles,
  monoFontFamily,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from '@/theme';
import type {
  ExecuteActionPayload,
  ProposedAction,
  RefundMode,
  SupportActionParams,
  SupportActionRecord,
  SupportActionType,
} from '@/types/supportChat';

import { clientActionsKey, clientQuickRepliesKey } from '../queryKeys';
import {
  addDraftAttachments,
  dismissDraftAction,
  getClientDraft,
  hasRoomForAttachment,
  patchClientDraft,
} from './draftStore';
import { hapticError, hapticSuccess } from './feedback';
import {
  RESEND_MANUAL_NOTICE,
  actionKey,
  actionTypeLabel,
  describeActionParams,
} from './savActions';

/** Même borne que le back et le web pour le nombre de colis d'une étiquette de retour. */
const MAX_PARCELS = 10;

const SEGMENTS: readonly { key: SupportActionType; label: string }[] = [
  { key: 'REFUND', label: 'Avoir' },
  { key: 'RETURN_LABEL', label: 'Retour' },
  { key: 'NON_RECEIPT_ATTESTATION', label: 'Attestation' },
  { key: 'RESEND', label: 'Renvoi' },
];

const COPY: Record<
  Exclude<SupportActionType, 'RESEND'>,
  { title: string; description: string; confirm: string }
> = {
  REFUND: {
    title: 'Rembourser le client par avoir',
    description: 'Un avoir est créé sur la commande dans PrestaShop. Cette action est définitive.',
    confirm: 'Créer l’avoir',
  },
  RETURN_LABEL: {
    title: 'Mettre l’étiquette de retour à disposition',
    description:
      'L’étiquette GLS prépayée est générée et apparaît dans le compte du client (Mes commandes). Aucun e-mail n’est envoyé : précisez-le dans votre message.',
    confirm: 'Générer l’étiquette',
  },
  NON_RECEIPT_ATTESTATION: {
    title: 'Joindre l’attestation de non-réception',
    description:
      'L’attestation sur l’honneur est générée en PDF et ajoutée en pièce jointe de votre prochain message (conservée 30 jours).',
    confirm: 'Générer l’attestation',
  },
};

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'En cours', tone: 'amber' },
  DONE: { label: 'Effectué', tone: 'green' },
  FAILED: { label: 'Échec', tone: 'red' },
};

type ProductLine = { reference: string; quantity: number };

/** « 12,5 » ou « 12.5 » → 12.5 ; `NaN` si la saisie est invalide. */
function parseAmount(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

/**
 * Feuille d'actions SAV (route `clients/[id]/action`) : avoir, étiquette de retour, attestation
 * de non-réception, avec l'historique des actions. Une confirmation précède l'exécution. La pièce
 * jointe renvoyée est déposée dans le brouillon du composer (`draftStore`). Les erreurs s'affichent
 * dans la feuille : un toast passerait derrière la présentation modale.
 */
export function ClientActionSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <ActionSheet id={id} />;
}

function ActionSheet({ id }: { id: string }) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();

  // L'action proposée par l'IA est lue une seule fois : rouvrir la feuille depuis l'en-tête ne
  // doit pas rejouer un ancien pré-remplissage.
  const [initial] = useState<ProposedAction | null>(() => getClientDraft(id).actionPrefill);
  useEffect(() => {
    if (getClientDraft(id).actionPrefill) patchClientDraft(id, { actionPrefill: null });
  }, [id]);

  const [type, setType] = useState<SupportActionType>(initial?.type ?? 'REFUND');
  const [chosenOrder, setChosenOrder] = useState<string | null>(
    () => initial?.orderReference ?? getClientDraft(id).orderReference,
  );
  const [mode, setMode] = useState<RefundMode>(initial?.params.mode ?? 'total');
  const [amount, setAmount] = useState(
    initial?.params.amount != null ? String(initial.params.amount).replace('.', ',') : '',
  );
  const [products, setProducts] = useState<ProductLine[]>(
    () => initial?.params.products?.map((p) => ({ ...p })) ?? [],
  );
  const [parcels, setParcels] = useState(initial?.params.nbColis ?? 1);
  const [forceNew, setForceNew] = useState(false);
  const [needsForceNew, setNeedsForceNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Commandes du client : mêmes données que les réponses rapides.
  const options = useQuery({
    queryKey: clientQuickRepliesKey(id),
    queryFn: ({ signal }) => supportChatApi.getQuickReplies(id, signal),
  });
  const history = useQuery({
    queryKey: clientActionsKey(id),
    queryFn: ({ signal }) => supportChatApi.listActions(id, signal),
  });

  const aiResult = getClientDraft(id).aiResult;
  const orders = options.data?.orders ?? aiResult?.orders ?? [];
  const orderReference =
    chosenOrder ?? options.data?.defaultOrderReference ?? orders[0]?.reference ?? null;
  const selectedOrder = orders.find((o) => o.reference === orderReference);
  const totalPaid =
    selectedOrder?.totalPaid ??
    (aiResult?.order?.reference === orderReference ? aiResult.order.totalPaid : null);

  // Le mode « produits » n'existe que si l'IA a proposé des lignes pour cette commande.
  const productsAvailable =
    initial?.type === 'REFUND' &&
    (initial.params.products?.length ?? 0) > 0 &&
    orderReference === initial.orderReference;
  const effectiveMode: RefundMode = mode === 'products' && !productsAvailable ? 'total' : mode;

  const amountValue = parseAmount(amount);
  const amountInvalid =
    effectiveMode === 'custom' &&
    (!Number.isFinite(amountValue) ||
      amountValue <= 0 ||
      (totalPaid != null && amountValue > totalPaid));
  const productsInvalid = effectiveMode === 'products' && products.every((p) => p.quantity < 1);

  const executable = type !== 'RESEND';
  const invalid =
    !orderReference ||
    (type === 'REFUND' && (amountInvalid || productsInvalid)) ||
    (needsForceNew && !forceNew);

  function buildParams(): SupportActionParams {
    if (type === 'REFUND') {
      if (effectiveMode === 'custom') return { mode: 'custom', amount: amountValue };
      if (effectiveMode === 'products') {
        return { mode: 'products', products: products.filter((p) => p.quantity > 0) };
      }
      return { mode: 'total' };
    }
    if (type === 'RETURN_LABEL') return { nbColis: parcels };
    return {};
  }

  const execute = useMutation({
    mutationFn: (payload: ExecuteActionPayload) => supportChatApi.executeAction(id, payload),
    onSuccess: (result, payload) => {
      hapticSuccess();
      dismissDraftAction(id, actionKey(payload));
      void queryClient.invalidateQueries({ queryKey: clientActionsKey(id) });
      if (result.attachment) addDraftAttachments(id, [result.attachment]);
      toast.success(result.message);
      router.back();
    },
    onError: (e, payload) => {
      hapticError();
      const message = errorMessage(e, 'Action impossible.');
      setError(message);
      if (payload.type === 'RETURN_LABEL' && /forceNew/i.test(message)) setNeedsForceNew(true);
      // Une tentative en échec laisse une trace dans l'historique.
      void queryClient.invalidateQueries({ queryKey: clientActionsKey(id) });
    },
  });

  function confirmMessage(reference: string): string {
    if (type === 'REFUND') {
      const scope =
        effectiveMode === 'custom'
          ? `de ${formatEuro(amountValue)} TTC`
          : effectiveMode === 'products'
            ? 'sur les produits sélectionnés'
            : 'total (hors port)';
      return `Créer un avoir ${scope} sur la commande ${reference} ? Cette action est définitive.`;
    }
    if (type === 'RETURN_LABEL') {
      return `Générer l’étiquette de retour (${parcels} colis) pour la commande ${reference} ?${
        forceNew ? ' Un nouveau lot sera créé malgré le lot existant.' : ''
      }`;
    }
    return `Générer l’attestation de non-réception de la commande ${reference} et l’ajouter au brouillon ?`;
  }

  function confirm() {
    if (type === 'RESEND' || !orderReference || invalid || execute.isPending) return;
    if (type === 'NON_RECEIPT_ATTESTATION' && !hasRoomForAttachment(id)) {
      hapticError();
      setError(
        'Le brouillon contient déjà 3 pièces jointes : retirez-en une avant de générer l’attestation.',
      );
      return;
    }
    setError(null);
    const copy = COPY[type];
    const payload: ExecuteActionPayload = {
      type,
      orderReference,
      params: buildParams(),
      ...(forceNew ? { forceNew: true } : {}),
    };
    Alert.alert(copy.title, confirmMessage(orderReference), [
      { text: 'Annuler', style: 'cancel' },
      {
        text: copy.confirm,
        style: type === 'REFUND' ? 'destructive' : 'default',
        onPress: () => execute.mutate(payload),
      },
    ]);
  }

  function changeType(next: SupportActionType) {
    if (execute.isPending) return;
    setType(next);
    setError(null);
  }

  const copy = executable ? COPY[type] : null;
  const pending = execute.isPending;

  return (
    <SheetScreen
      title="Actions SAV"
      closeLabel="Fermer"
      closeDisabled={pending}
      footer={
        executable ? (
          <Button
            label={copy?.confirm ?? 'Confirmer'}
            onPress={confirm}
            loading={pending}
            disabled={invalid}
          />
        ) : undefined
      }
    >
      <SegmentedControl segments={SEGMENTS} value={type} onChange={changeType} />

      {copy ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.title}</Text>
          <Text style={styles.description}>{copy.description}</Text>
        </View>
      ) : (
        <View style={styles.notice} accessibilityRole="alert">
          <TriangleAlert size={18} color={t.warning} />
          <Text style={styles.noticeText}>{RESEND_MANUAL_NOTICE}</Text>
        </View>
      )}

      {/* Commande concernée */}
      <Section title="Commande">
        {options.isPending && orders.length === 0 ? (
          <ActivityIndicator color={t.accentText} />
        ) : orders.length === 0 && !orderReference ? (
          options.isError ? (
            <ErrorBanner
              error={options.error}
              fallback="Impossible de charger les commandes du client."
              onRetry={() => void options.refetch()}
            />
          ) : (
            <Text style={styles.muted}>Aucune commande pour ce client.</Text>
          )
        ) : (
          <View style={styles.orderList}>
            {(orders.length > 0
              ? orders
              : [{ reference: orderReference!, dateAdd: null, totalPaid: null }]
            ).map((order) => {
              const selected = order.reference === orderReference;
              const meta = [
                formatDateTimeShort(order.dateAdd),
                order.totalPaid != null ? formatEuro(order.totalPaid) : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <Pressable
                  key={order.reference}
                  accessibilityRole="radio"
                  accessibilityLabel={`Commande ${order.reference}${meta ? `, ${meta}` : ''}`}
                  accessibilityState={{ selected, disabled: pending }}
                  disabled={pending}
                  onPress={() => {
                    setChosenOrder(order.reference);
                    setError(null);
                  }}
                  style={[styles.radioRow, selected && styles.radioRowSelected]}
                >
                  <RadioDot selected={selected} />
                  <View style={styles.radioBody}>
                    <Text style={[styles.orderRef, selected && { color: t.accentText }]}>
                      {order.reference}
                    </Text>
                    {meta ? <Text style={styles.radioMeta}>{meta}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {initial && initial.orderReference === orderReference ? (
          <View style={styles.proposal}>
            <Text style={styles.proposalTitle}>Proposé par l’IA</Text>
            {describeActionParams(initial) ? (
              <Text style={styles.proposalText}>{describeActionParams(initial)}</Text>
            ) : null}
            {initial.rationale ? <Text style={styles.muted}>{initial.rationale}</Text> : null}
            {initial.warning ? <Text style={styles.warning}>{initial.warning}</Text> : null}
          </View>
        ) : null}
      </Section>

      {/* Paramètres de l'action */}
      {type === 'REFUND' ? (
        <Section title="Montant de l’avoir">
          <RadioOption
            label="Remboursement total de la commande (hors port)"
            selected={effectiveMode === 'total'}
            disabled={pending}
            onPress={() => setMode('total')}
          />
          {productsAvailable ? (
            <RadioOption
              label="Produits sélectionnés"
              selected={effectiveMode === 'products'}
              disabled={pending}
              onPress={() => setMode('products')}
            />
          ) : null}
          <RadioOption
            label="Montant personnalisé (TTC)"
            selected={effectiveMode === 'custom'}
            disabled={pending}
            onPress={() => setMode('custom')}
          />
          {effectiveMode === 'products' ? (
            <View style={styles.products}>
              {products.map((line, index) => (
                <View key={line.reference} style={styles.productRow}>
                  <Text style={styles.productRef} numberOfLines={1}>
                    {line.reference}
                  </Text>
                  <Stepper
                    label={`Quantité de ${line.reference}`}
                    value={line.quantity}
                    min={0}
                    max={999}
                    disabled={pending}
                    onChange={(quantity) =>
                      setProducts((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, quantity } : item)),
                      )
                    }
                  />
                </View>
              ))}
              {productsInvalid ? (
                <Text style={styles.fieldError}>Choisissez au moins un produit.</Text>
              ) : null}
            </View>
          ) : null}
          {effectiveMode === 'custom' ? (
            <TextField
              label="Montant TTC (€)"
              value={amount}
              onChangeText={(text) => setAmount(text.replace(/[^\d.,]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="0,00"
              editable={!pending}
              error={
                amountInvalid && amount.trim() !== ''
                  ? `Montant invalide${totalPaid != null ? ` (maximum ${formatEuro(totalPaid)})` : ''}.`
                  : undefined
              }
            />
          ) : null}
          {totalPaid != null ? (
            <Text style={styles.muted}>Total payé : {formatEuro(totalPaid)}</Text>
          ) : null}
        </Section>
      ) : null}

      {type === 'RETURN_LABEL' ? (
        <Section title="Étiquette de retour">
          <View style={styles.parcelRow}>
            <Text style={styles.parcelLabel}>Nombre de colis</Text>
            <Stepper
              label="Nombre de colis"
              value={parcels}
              min={1}
              max={MAX_PARCELS}
              disabled={pending}
              onChange={setParcels}
            />
          </View>
          {needsForceNew ? (
            <View style={styles.forceNew}>
              <Text style={styles.forceNewText}>
                Un lot d’étiquettes existe déjà pour cette commande. Créer un nouveau lot malgré
                tout ?
              </Text>
              <Switch
                value={forceNew}
                onValueChange={setForceNew}
                disabled={pending}
                trackColor={{ true: t.accent }}
                accessibilityLabel="Créer un nouveau lot d’étiquettes malgré le lot existant"
              />
            </View>
          ) : null}
        </Section>
      ) : null}

      {type === 'RESEND' && orderReference ? (
        <Button
          label="Ouvrir la commande"
          variant="outline"
          onPress={() => openOrder(orderReference)}
        />
      ) : null}

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Historique */}
      <Section title="Historique des actions">
        {history.isPending ? (
          <ActivityIndicator color={t.accentText} />
        ) : history.isError ? (
          <ErrorBanner
            error={history.error}
            fallback="Impossible de charger l’historique."
            onRetry={() => void history.refetch()}
          />
        ) : (history.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<TriangleAlert size={22} color={t.textMuted} />}
            title="Aucune action"
            text="Les actions SAV effectuées sur cette conversation apparaîtront ici."
          />
        ) : (
          <View style={styles.historyList}>
            {[...(history.data ?? [])]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((record) => (
                <HistoryRow key={record.id} record={record} />
              ))}
          </View>
        )}
      </Section>
    </SheetScreen>
  );
}

function formatDateTimeShort(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.dot, selected && styles.dotSelected]}>
      {selected ? <View style={styles.dotInner} /> : null}
    </View>
  );
}

function RadioOption({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.radioRow, selected && styles.radioRowSelected]}
    >
      <RadioDot selected={selected} />
      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

/** Sélecteur d'entier à boutons − / + (zones tactiles de 44 pt). */
function Stepper({ label, value, min, max, disabled = false, onChange }: StepperProps) {
  const styles = useStyles();
  const t = useTheme();
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < max;
  return (
    <View
      style={styles.stepper}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && canIncrease) onChange(value + 1);
        if (event.nativeEvent.actionName === 'decrement' && canDecrease) onChange(value - 1);
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Diminuer : ${label}`}
        disabled={!canDecrease}
        onPress={() => onChange(value - 1)}
        style={[styles.stepperButton, !canDecrease && styles.stepperDisabled]}
      >
        <Minus size={18} color={t.text} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Augmenter : ${label}`}
        disabled={!canIncrease}
        onPress={() => onChange(value + 1)}
        style={[styles.stepperButton, !canIncrease && styles.stepperDisabled]}
      >
        <Plus size={18} color={t.text} />
      </Pressable>
    </View>
  );
}

function HistoryRow({ record }: { record: SupportActionRecord }) {
  const styles = useStyles();
  const status = STATUS_BADGE[record.status] ?? { label: record.status, tone: 'neutral' as const };
  const meta = [formatDateTime(record.createdAt), record.performedBy].filter(Boolean).join(' · ');
  return (
    <View style={styles.historyRow}>
      <View style={styles.historyHead}>
        <Text style={styles.historyLabel} numberOfLines={2}>
          {record.label || actionTypeLabel(record.type)}
        </Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <Text style={styles.historyOrder}>Commande {record.orderReference}</Text>
      {meta ? <Text style={styles.historyMeta}>{meta}</Text> : null}
      {record.errorMessage ? <Text style={styles.historyError}>{record.errorMessage}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  sectionBody: { gap: spacing.md },
  description: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  muted: { fontSize: fontSize.xs + 1, lineHeight: 18, color: t.textMuted },
  warning: { fontSize: fontSize.xs + 1, lineHeight: 18, color: t.warning },
  notice: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.warning, 0.35),
    backgroundColor: withAlpha(t.warning, 0.1),
  },
  noticeText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20, color: t.text },
  orderList: { gap: spacing.sm },
  radioRow: {
    minHeight: hitTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  radioRowSelected: {
    borderColor: withAlpha(t.accent, 0.6),
    backgroundColor: withAlpha(t.accent, 0.1),
  },
  radioBody: { flex: 1, gap: 2 },
  radioLabel: { flex: 1, fontSize: fontSize.sm, lineHeight: 19, color: t.text },
  radioMeta: { fontSize: fontSize.xs + 1, color: t.textMuted },
  orderRef: { fontSize: fontSize.sm, fontWeight: '700', color: t.text, fontFamily: monoFontFamily },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: t.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: { borderColor: t.accent },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.accent },
  proposal: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.info, 0.3),
    backgroundColor: withAlpha(t.info, 0.08),
  },
  proposalTitle: { fontSize: fontSize.xs, fontWeight: '700', color: t.info },
  proposalText: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  products: { gap: spacing.sm, paddingLeft: spacing.sm },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  productRef: { flex: 1, fontSize: fontSize.sm, color: t.text, fontFamily: monoFontFamily },
  fieldError: { fontSize: fontSize.xs + 1, color: t.danger },
  parcelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  parcelLabel: { fontSize: fontSize.sm, color: t.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepperButton: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.borderStrong,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: { opacity: 0.4 },
  stepperValue: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  forceNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.warning, 0.35),
    backgroundColor: withAlpha(t.warning, 0.1),
  },
  forceNewText: { flex: 1, fontSize: fontSize.sm, lineHeight: 19, color: t.text },
  error: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.danger, 0.3),
    backgroundColor: t.dangerBg,
  },
  errorText: { fontSize: fontSize.sm, lineHeight: 19, color: t.danger },
  historyList: { gap: spacing.sm },
  historyRow: {
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  historyLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  historyOrder: { fontSize: fontSize.xs, color: t.textMuted, fontFamily: monoFontFamily },
  historyMeta: { fontSize: fontSize.xs, color: t.textSubtle },
  historyError: { fontSize: fontSize.xs + 1, lineHeight: 17, color: t.danger },
}));
