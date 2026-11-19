import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { hubSupervisionApi } from '@/api/hubSupervision';
import { HUB_DASHBOARD_KEY } from '@/features/cockpit/hooks/useCockpitData';
import type {
  CarrierTestMode,
  CarrierTestRunResult,
  PrintServerItem,
  TestableCarrier,
} from '@/types/hubSupervision';

import { PRINT_REFRESH_AFTER_TEST_MS } from '../display';
import { PRINT_SUPERVISION_KEY } from '../queryKeys';

/** Dernier test transporteur d'un entrepôt (résultat ou message d'erreur). */
export type CarrierRun = {
  mode: CarrierTestMode;
  at: Date;
  result?: CarrierTestRunResult;
  error?: string;
};

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

/**
 * Actions de la page Supervision impression : activer / désactiver un poste, étiquette de test
 * et test transporteur. Chaque action relit la page et la pastille imprimantes du cockpit ;
 * une impression relit l'état une seconde fois après 8 s (le poste scanne sa file toutes les 5 s).
 */
export function usePrintServerActions() {
  const queryClient = useQueryClient();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [runs, setRuns] = useState<Record<string, CarrierRun>>({});

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: PRINT_SUPERVISION_KEY });
    void queryClient.invalidateQueries({ queryKey: [...HUB_DASHBOARD_KEY, 'print-servers'] });
  }, [queryClient]);

  const refreshLater = useCallback(() => {
    timers.current.push(setTimeout(refresh, PRINT_REFRESH_AFTER_TEST_MS));
  }, [refresh]);

  const toggleEnabled = useMutation({
    mutationFn: (server: PrintServerItem) =>
      hubSupervisionApi.setPrintServerEnabled(server.serverId, !server.enabled),
    onSuccess: (result) => {
      toast.success(result.enabled ? 'Supervision réactivée' : 'Supervision désactivée');
      refresh();
    },
    onError: (error) => toast.error(messageOf(error, 'Modification impossible')),
  });

  const testLabel = useMutation({
    mutationFn: (server: PrintServerItem) => hubSupervisionApi.sendTestLabel(server.serverId),
    onSuccess: (result) => {
      toast.success(`Étiquette de test envoyée à ${result.warehouse}, impression dans quelques secondes`);
      refreshLater();
    },
    onError: (error) => toast.error(messageOf(error, "Impossible d'envoyer l'étiquette de test")),
  });

  const carrierTest = useMutation({
    mutationFn: (vars: { warehouse: string; carrier: TestableCarrier; mode: CarrierTestMode }) =>
      hubSupervisionApi.testCarrier(vars.warehouse, vars.carrier, vars.mode),
    onSuccess: (result, vars) => {
      setRuns((prev) => ({
        ...prev,
        [`${vars.warehouse}:${vars.carrier}`]: { mode: vars.mode, at: new Date(), result },
      }));
      const failed = result.results.some((r) => r.error);
      const orphan = result.results.some((r) => r.trackingNumber && !r.cancelled);
      if (orphan) {
        toast.error(`${vars.carrier} : colis de test NON annulé chez le transporteur, voir le détail`);
      } else if (failed) {
        toast.error(`${vars.carrier} : le test a échoué, voir le détail`);
      } else if (vars.mode === 'PRINT') {
        toast.success(
          `${vars.carrier} : étiquette envoyée à l'imprimante de ${vars.warehouse}. Colis déjà annulé : ne pas la coller.`,
        );
        refreshLater();
      } else {
        toast.success(`${vars.carrier} : l'API répond et génère l'étiquette (colis annulé, rien imprimé)`);
      }
    },
    onError: (error, vars) => {
      const message = messageOf(error, 'Test impossible (erreur réseau)');
      setRuns((prev) => ({
        ...prev,
        [`${vars.warehouse}:${vars.carrier}`]: { mode: vars.mode, at: new Date(), error: message },
      }));
      toast.error(`${vars.carrier} : ${message}`);
    },
  });

  return {
    toggleEnabled,
    testLabel,
    carrierTest,
    /** Dernier test de chaque transporteur, par `entrepôt:transporteur`. */
    runs,
  };
}
