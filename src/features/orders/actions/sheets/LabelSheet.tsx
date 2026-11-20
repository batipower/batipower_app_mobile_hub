import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { hubOrdersApi } from '@/api/hubOrders';
import { useAuth } from '@/auth/AuthProvider';
import { canPrintPdfLabel } from '@/auth/permissions';
import { Button } from '@/components/ui';
import { fontSize, makeStyles, spacing } from '@/theme';
import type { HubLabelCarrier } from '@/types/orderActions';

import { ActionSheet } from '../components/ActionSheet';
import { ChoiceChips, Field, Input, Note, Stepper, SwitchRow } from '../components/SheetFields';
import {
  MAX_AD_VALOREM_EUR,
  MAX_MANUAL_WEIGHT_KG,
  computeOrderWeightKg,
  initialAdValoremInput,
  initialParcelCount,
  initialWeightInput,
  isAdValoremInputValid,
  isWeightInputValid,
  resolveAdValoremValue,
  resolveWeightOverride,
} from '../orderActionRules';
import type { OrderActions, OrderDetailData } from '../useOrderActions';

const MAX_PARCELS = 30;

type Props = { data: OrderDetailData; actions: OrderActions };

/**
 * Étiquette d'expédition : nombre de colis, poids global, transporteur (commandes marketplace) et
 * assurance Ad Valorem DPD. SUPERADMIN et MANAGER disposent en plus de l'étiquette PDF de secours.
 */
export function LabelSheet({ data, actions }: Props) {
  const styles = useStyles();
  const { user } = useAuth();
  const { order } = data;
  const computedKg = computeOrderWeightKg(order);

  const [nbColis, setNbColis] = useState(() => Math.min(MAX_PARCELS, initialParcelCount(order)));
  const [weight, setWeight] = useState(() => initialWeightInput(computedKg));
  const [carrierChoice, setCarrierChoice] = useState<HubLabelCarrier | null>(null);
  const [insure, setInsure] = useState(false);
  const [insuredValue, setInsuredValue] = useState(() => initialAdValoremInput(order));

  const carriersQuery = useQuery({
    queryKey: ['hub-order-label-carriers', order.reference],
    queryFn: ({ signal }) => hubOrdersApi.getLabelCarrierOptions(order.reference, signal),
    staleTime: 0,
    retry: 1,
  });
  const carriers = carriersQuery.data;
  const canChoose = carriers?.canChoose === true;
  const carrier = carrierChoice ?? carriers?.default ?? null;
  const effectiveCarrier = canChoose ? carrier : (carriers?.current ?? null);
  const supportsInsurance = effectiveCarrier === 'DPD';

  const busy = actions.labelMutation.isPending || actions.waitingLabelPdf;
  const weightValid = isWeightInputValid(weight);
  const insuranceValid = !insure || !supportsInsurance || isAdValoremInputValid(insuredValue);
  const formValid = weightValid && insuranceValid && nbColis >= 1;
  const weightEdited = weight.trim() !== initialWeightInput(computedKg);
  const showPdf = !!user?.role && canPrintPdfLabel(user.role);

  const submit = (pdf: boolean) => {
    actions.labelMutation.mutate({
      nbColis,
      weightKg: resolveWeightOverride(weight, computedKg),
      carrier: canChoose && carrier ? carrier : undefined,
      insuranceValueEur:
        insure && supportsInsurance ? resolveAdValoremValue(insuredValue) : undefined,
      printMode: pdf ? 'PDF' : undefined,
    });
  };

  return (
    <ActionSheet
      visible
      title="Générer une étiquette"
      onClose={actions.closeSheet}
      closeDisabled={actions.labelMutation.isPending}
      footer={
        <>
          {actions.waitingLabelPdf ? (
            <View style={styles.waiting}>
              <ActivityIndicator />
              <Text style={styles.waitingText}>Génération du PDF en cours, cela peut prendre quelques secondes…</Text>
            </View>
          ) : null}
          <Button
            label="Générer l'étiquette"
            loading={actions.labelMutation.isPending && actions.labelMutation.variables?.printMode !== 'PDF'}
            disabled={!formValid || busy}
            onPress={() => submit(false)}
          />
          {showPdf ? (
            <Button
              label="Générer en PDF"
              variant="outline"
              loading={
                (actions.labelMutation.isPending && actions.labelMutation.variables?.printMode === 'PDF') ||
                actions.waitingLabelPdf
              }
              disabled={!formValid || busy}
              onPress={() => submit(true)}
            />
          ) : null}
        </>
      }
    >
      <Note>
        Commande {order.reference}. L’étiquette thermique part vers l’imprimante de l’entrepôt.
      </Note>

      {carriers?.hasExistingLabel ? (
        <Note tone="warning">
          Une étiquette existe déjà pour cette commande : en générer une nouvelle crée un second colis chez le
          transporteur.
        </Note>
      ) : null}

      <Field label="Nombre de colis">
        <Stepper value={nbColis} min={1} max={MAX_PARCELS} onChange={setNbColis} label="colis" />
      </Field>

      <Field
        label="Poids global (kg)"
        hint={
          computedKg > 0
            ? `Poids calculé : ${computedKg} kg. Laissez tel quel pour l'utiliser.`
            : `Poids inconnu : saisissez-le (maximum ${MAX_MANUAL_WEIGHT_KG} kg).`
        }
      >
        <Input
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="Poids calculé"
          invalid={!weightValid}
          accessibilityLabel="Poids global en kilogrammes"
        />
        {weightEdited && computedKg > 0 ? (
          <Button
            label="Revenir au poids calculé"
            variant="ghost"
            onPress={() => setWeight(initialWeightInput(computedKg))}
          />
        ) : null}
      </Field>

      {carriersQuery.isPending ? <ActivityIndicator /> : null}

      {canChoose && carriers ? (
        <Field label="Transporteur" hint={carriers.reason}>
          <ChoiceChips
            options={carriers.options.map((option) => ({
              value: option.carrier,
              label: option.ready ? option.label : `${option.label} (indisponible)`,
              disabled: !option.ready,
            }))}
            value={carrier}
            onChange={setCarrierChoice}
          />
          {carriers.options
            .filter((option) => !option.ready && option.reason)
            .map((option) => (
              <Note key={option.carrier} tone="warning">
                {option.label} : {option.reason}
              </Note>
            ))}
        </Field>
      ) : null}

      {supportsInsurance ? (
        <>
          <SwitchRow
            label="Assurance Ad Valorem (DPD)"
            hint="Déclare la valeur de la marchandise auprès de DPD."
            value={insure}
            onValueChange={setInsure}
          />
          {insure ? (
            <Field
              label="Valeur déclarée (€)"
              hint={`Proposée : prix d'achat HT fournisseur. Maximum ${MAX_AD_VALOREM_EUR} €.`}
            >
              <Input
                value={insuredValue}
                onChangeText={setInsuredValue}
                keyboardType="decimal-pad"
                invalid={!isAdValoremInputValid(insuredValue)}
                accessibilityLabel="Valeur déclarée en euros"
              />
            </Field>
          ) : null}
        </>
      ) : null}
    </ActionSheet>
  );
}

const useStyles = makeStyles((t) => ({
  waiting: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waitingText: { flex: 1, fontSize: fontSize.xs, color: t.textMuted },
}));
