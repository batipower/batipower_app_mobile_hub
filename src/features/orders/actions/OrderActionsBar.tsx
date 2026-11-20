import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import {
  ArrowLeftRight,
  Banknote,
  FileText,
  Layers,
  Merge,
  Package,
  PackageCheck,
  Printer,
  ReceiptText,
  Repeat2,
  Send,
  Undo2,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canForceHubOrderStatus, canResendHubOrder } from '@/auth/permissions';
import { Badge, DetailSection } from '@/components/ui';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { cancellationLabel } from '../orderDisplay';
import {
  canMarkOrderDelivered,
  canMergeOrder,
  canSplitOrder,
  isResendReference,
} from './orderActionRules';
import { CancellationSheet } from './sheets/CancellationSheet';
import { CreditSlipsSheet, DeliveryNoteSheet } from './sheets/DocumentSheets';
import { LabelSheet } from './sheets/LabelSheet';
import { RefundSheet } from './sheets/RefundSheet';
import { ResendSheet } from './sheets/ResendSheet';
import { SplitSheet } from './sheets/SplitSheet';
import { TransferSheet } from './sheets/TransferSheet';
import { useOrderActions, type OrderDetailData } from './useOrderActions';

type Tone = 'default' | 'danger' | 'warning' | 'success' | 'info';

type ActionTileProps = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  tone?: Tone;
  /** Action en cours : spinner à la place de l'icône. */
  loading?: boolean;
  disabled?: boolean;
  /** Mise en avant (ex. commande déjà marquée urgente). */
  active?: boolean;
  hint?: string;
};

function ActionTile({
  label,
  icon: Icon,
  onPress,
  tone = 'default',
  loading = false,
  disabled = false,
  active = false,
  hint,
}: ActionTileProps) {
  const styles = useStyles();
  const t = useTheme();
  const color =
    tone === 'danger'
      ? t.danger
      : tone === 'warning'
        ? t.warning
        : tone === 'success'
          ? t.success
          : tone === 'info'
            ? t.info
            : t.text;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy: loading, selected: active }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        active && { backgroundColor: withAlpha(color, 0.16), borderColor: withAlpha(color, 0.5) },
        pressed && { opacity: 0.6 },
        inactive && { opacity: 0.45 },
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={color} /> : <Icon size={20} color={color} />}
      <Text style={[styles.tileLabel, { color }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

type OrderActionsBarProps = {
  data: OrderDetailData;
  /** Référence de l'URL (peut être la réf. eBat) : sert à recharger la bonne fiche. */
  routeReference: string;
};

/**
 * Barre d'actions de la fiche commande : pendant mobile de la colonne « Actions » du détail HUB web
 * (`HubOrderSidebar`). Mêmes règles d'affichage et mêmes rôles : renvoi client et étiquette PDF pour
 * SUPERADMIN et MANAGER, « Passer en Livré » et transfert forcé pour le SUPERADMIN.
 */
export function OrderActionsBar({ data, routeReference }: OrderActionsBarProps) {
  const styles = useStyles();
  const { user } = useAuth();
  const actions = useOrderActions(data, routeReference);
  const { order } = data;
  const role = user?.role;

  const cancellation = data.latestCancellationRequest;
  const cancellationStatus = cancellation?.status;
  const canRetract = cancellationStatus === 'PENDING';
  const canRequestCancellation =
    !cancellationStatus || cancellationStatus === 'REJECTED' || cancellationStatus === 'CANCELLED';
  const showCancellationBadge =
    cancellationStatus === 'PENDING' ||
    cancellationStatus === 'APPROVED' ||
    cancellationStatus === 'REJECTED';

  const isResend = isResendReference(order.reference);
  const canResend = !!role && canResendHubOrder(role);
  const canMarkDelivered = !!role && canForceHubOrderStatus(role) && canMarkOrderDelivered(order);

  return (
    <>
      <DetailSection
        title="Actions"
        trailing={
          showCancellationBadge && cancellationStatus ? (
            <Badge
              label={cancellationLabel(cancellationStatus)}
              tone={
                cancellationStatus === 'PENDING'
                  ? 'amber'
                  : cancellationStatus === 'APPROVED'
                    ? 'red'
                    : 'neutral'
              }
            />
          ) : undefined
        }
      >
        <View style={styles.grid}>
          <ActionTile
            label="Étiquette"
            icon={Package}
            hint="Génère l'étiquette d'expédition de cette commande"
            onPress={() => actions.openSheet('label')}
          />
          <ActionTile
            label="Transférer"
            icon={ArrowLeftRight}
            hint="Change l'entrepôt qui prépare cette commande"
            onPress={() => actions.openSheet('transfer')}
          />
          <ActionTile
            label="eBatPro"
            icon={Send}
            hint="Remet l'entrepôt en à traiter pour que eBatPro retraite la commande"
            loading={actions.ebatMutation.isPending}
            onPress={actions.confirmEbat}
          />
          {canResend ? (
            <ActionTile
              label="Renvoi"
              icon={Repeat2}
              tone="info"
              hint="Crée une commande de renvoi avec son propre suivi"
              onPress={() => actions.openSheet('resend')}
            />
          ) : null}
          <ActionTile
            label={actions.isUrgent ? "Retirer l'urgence" : 'Urgent'}
            icon={Zap}
            tone="warning"
            active={actions.isUrgent}
            loading={actions.urgentMutation.isPending}
            onPress={() => actions.urgentMutation.mutate()}
          />
          {canSplitOrder(order) ? (
            <ActionTile
              label="Splitter"
              icon={Layers}
              tone="danger"
              hint="Découpe la commande en plusieurs envois depuis plusieurs entrepôts"
              onPress={() => actions.openSheet('split')}
            />
          ) : null}
          {canMergeOrder(order) ? (
            <ActionTile
              label="Fusionner"
              icon={Merge}
              loading={actions.mergeMutation.isPending}
              onPress={actions.confirmMerge}
            />
          ) : null}
          {canRetract && cancellation ? (
            <ActionTile
              label="Rétracter"
              icon={Undo2}
              tone="warning"
              hint="Annule la demande d'annulation en cours"
              loading={actions.retractMutation.isPending}
              onPress={() => actions.confirmRetract(cancellation.id)}
            />
          ) : canRequestCancellation ? (
            <ActionTile
              label={cancellationStatus ? "Redemander l'annulation" : 'Annuler'}
              icon={XCircle}
              tone="danger"
              onPress={() => actions.openSheet('cancel')}
            />
          ) : null}
          {canMarkDelivered ? (
            <ActionTile
              label="Livré"
              icon={PackageCheck}
              tone="success"
              hint="Force le statut Livré"
              loading={actions.deliveredMutation.isPending}
              onPress={actions.confirmDelivered}
            />
          ) : null}
          <ActionTile
            label="Rembourser"
            icon={Banknote}
            tone="danger"
            disabled={isResend}
            hint={
              isResend
                ? 'Renvoi gratuit absent de PrestaShop : rien à rembourser, utilisez Annuler'
                : 'Crée un avoir puis rembourse le client'
            }
            onPress={() => actions.openSheet('refund')}
          />
          <ActionTile
            label="Facture"
            icon={FileText}
            hint="Télécharge la facture PDF de la commande"
            loading={actions.invoiceMutation.isPending}
            onPress={() => actions.invoiceMutation.mutate()}
          />
          <ActionTile
            label="Bon de livraison"
            icon={Printer}
            hint="Imprime le bon de livraison Batipower"
            loading={actions.deliveryNoteMutation.isPending}
            onPress={() => actions.openSheet('deliveryNote')}
          />
          {actions.creditSlips.length > 0 || actions.creditSlipsLoading ? (
            <ActionTile
              label={actions.creditSlips.length > 1 ? `Avoirs (${actions.creditSlips.length})` : 'Avoir'}
              icon={ReceiptText}
              hint="Télécharge l'avoir PDF de la commande"
              loading={actions.creditSlipsLoading || actions.creditSlipMutation.isPending}
              onPress={actions.openCreditSlips}
            />
          ) : null}
        </View>
      </DetailSection>

      {/* Montées à l'ouverture : chaque feuille repart d'un formulaire neuf. */}
      {actions.sheet === 'label' ? <LabelSheet data={data} actions={actions} /> : null}
      {actions.sheet === 'transfer' ? <TransferSheet data={data} actions={actions} /> : null}
      {actions.sheet === 'resend' ? <ResendSheet data={data} actions={actions} /> : null}
      {actions.sheet === 'split' ? <SplitSheet data={data} actions={actions} /> : null}
      {actions.sheet === 'cancel' ? <CancellationSheet data={data} actions={actions} /> : null}
      {actions.sheet === 'refund' ? <RefundSheet data={data} actions={actions} /> : null}
      {actions.sheet === 'deliveryNote' ? <DeliveryNoteSheet data={data} actions={actions} /> : null}
      {actions.sheet === 'creditSlips' ? <CreditSlipsSheet data={data} actions={actions} /> : null}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: hitTarget + spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  tileLabel: { fontSize: fontSize.xs, fontWeight: '700', textAlign: 'center' },
}));
