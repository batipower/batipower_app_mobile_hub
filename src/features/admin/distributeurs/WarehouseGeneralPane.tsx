import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminPartnersApi } from '@/api/adminPartners';
import { Badge, Button, DetailSection, InfoRow, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { AdminDistributor, AdminDistributorWarehouse } from '@/types/adminPartners';

import { warehouseLabel } from '../shared/accessRules';
import { Notice, ToggleRow } from '../shared/components/FormParts';
import { useDeleteEntity } from './distributorMutations';
import { useRefreshPartners } from './hooks';
import { fixedWarehouseNote, formatTrace, isLegacyWarehouse } from './utils';

/** Onglet « Général » d'un entrepôt : réception des commandes, statut Prestashop, activation, suppression. */
export function WarehouseGeneralPane({
  distributor,
  warehouse: w,
}: {
  distributor: AdminDistributor;
  warehouse: AdminDistributorWarehouse;
}) {
  const styles = useStyles();
  const refresh = useRefreshPartners();
  const remove = useDeleteEntity({ onDeleted: () => router.back() });
  const legacy = isLegacyWarehouse(w);
  const fixed = fixedWarehouseNote(w);
  const [stateId, setStateId] = useState(w.psOrderStateId != null ? String(w.psOrderStateId) : '');

  const stateValue = stateId.trim() === '' ? null : Number(stateId);
  const stateError =
    stateValue !== null && (!Number.isInteger(stateValue) || stateValue <= 0) ? 'Identifiant numérique positif attendu.' : undefined;

  const orders = useMutation({
    mutationFn: (data: { acceptsOrders?: boolean; psOrderStateId?: number | null }) =>
      adminPartnersApi.updateWarehouseOrderSettings(distributor.id, w.id, data),
    onSuccess: async (_r, data) => {
      toast.success(
        data.acceptsOrders === undefined
          ? 'Statut Prestashop enregistré'
          : data.acceptsOrders
            ? `${w.name} reçoit de nouveau des commandes`
            : `${w.name} ne reçoit plus de nouvelles commandes`,
      );
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors du changement des réglages de commande')),
  });

  const active = useMutation({
    mutationFn: (next: boolean) => adminPartnersApi.setWarehouseActive(distributor.id, w.id, next),
    onSuccess: async (res) => {
      toast.success(res.isActive ? `${w.name} réactivé` : `${w.name} désactivé`);
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors du changement d'activation")),
  });

  const requestAccepts = (next: boolean) => {
    if (next) {
      orders.mutate({ acceptsOrders: true });
      return;
    }
    const pending = w.pendingOrders ?? 0;
    Alert.alert(
      'Couper les commandes de cet entrepôt ?',
      [
        `Plus aucune NOUVELLE commande ne sera affectée à « ${w.name} ». Les commandes déjà affectées restent traitables.`,
        pending > 0 ? `${pending} commande${pending > 1 ? 's' : ''} en cours de traitement.` : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Couper', style: 'destructive', onPress: () => orders.mutate({ acceptsOrders: false }) },
      ],
    );
  };

  const requestActive = (next: boolean) => {
    if (next) {
      active.mutate(true);
      return;
    }
    Alert.alert('Désactiver cet entrepôt ?', `« ${w.name} » ne sera plus utilisé (stock, commandes, comptes eBatPro).`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Désactiver', style: 'destructive', onPress: () => active.mutate(false) },
    ]);
  };

  const trace = formatTrace(w.ordersAffectationUpdatedAt, w.ordersAffectationUpdatedBy);

  return (
    <View style={styles.pane}>
      <DetailSection title="Entrepôt">
        <InfoRow label="Nom" value={w.name} />
        <InfoRow label="Entrepôt historique" value={w.warehouse ? warehouseLabel(w.warehouse) : 'Entrepôt libre'} />
        {w.code ? <InfoRow label="Code" value={w.code} /> : null}
        <InfoRow label="Commandes en cours" value={String(w.pendingOrders ?? 0)} />
        {w.isActive === false ? <Badge label="Désactivé" tone="amber" /> : null}
      </DetailSection>

      <DetailSection title="Commandes">
        {fixed ? (
          <Notice>{fixed}</Notice>
        ) : (
          <ToggleRow
            label="Reçoit de nouvelles commandes"
            description={
              distributor.ordersAffectationEnabled === false
                ? "L'affectation est coupée au niveau du distributeur : cet interrupteur n'a pas d'effet tant qu'elle l'est."
                : (trace ?? undefined)
            }
            value={w.acceptsOrders !== false}
            disabled={orders.isPending}
            onValueChange={requestAccepts}
          />
        )}
        {legacy ? (
          <Text style={styles.hint}>Le statut Prestashop de cet entrepôt historique est fixé dans le code.</Text>
        ) : (
          <View style={styles.stateBlock}>
            <TextField
              label="Statut Prestashop « Paiement accepté »"
              value={stateId}
              onChangeText={(v) => setStateId(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="Identifiant du statut"
              error={stateError}
            />
            <Button
              label="Enregistrer le statut"
              variant="outline"
              loading={orders.isPending && orders.variables?.psOrderStateId !== undefined}
              disabled={!!stateError || stateValue === (w.psOrderStateId ?? null) || orders.isPending}
              onPress={() => orders.mutate({ psOrderStateId: stateValue })}
            />
            {w.psOrderStateId == null ? (
              <Text style={styles.hint}>Sans statut, aucune commande ne peut être affectée à cet entrepôt.</Text>
            ) : null}
          </View>
        )}
      </DetailSection>

      {w.warehouse !== 'QG_BATIPOWER' ? (
        <DetailSection title="Activation">
          <ToggleRow
            label="Entrepôt actif"
            value={w.isActive !== false}
            disabled={active.isPending}
            onValueChange={requestActive}
          />
        </DetailSection>
      ) : null}

      <Button
        label="Supprimer l'entrepôt"
        variant="ghost"
        destructive
        loading={remove.isPending}
        onPress={() => remove.confirm({ kind: 'warehouse', distributor, item: w })}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  pane: { gap: spacing.xl },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  stateBlock: { gap: spacing.sm },
}));
