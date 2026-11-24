import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { hubProductAnalyzerApi, type PosteControl } from '@/api/hubProductAnalyzer';
import { getReserveClaimToken } from '@/features/product-analyzer/lib/claim-token';

/** Doit rester nettement sous le seuil serveur (180 s) : iOS ralentit les timers en arrière-plan. */
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Battement de cœur des lignes de la réserve détenues par ce poste.
 *
 * - toutes les 30 s (et dès que l'app revient au premier plan), prolonge les lignes renvoyées par
 *   `getUuids` ; le serveur les libère si aucun signe de vie pendant ~3 min (téléphone éteint,
 *   réseau coupé) pour qu'un autre poste les prenne ;
 * - `onLost` reçoit les lignes qu'un autre poste a reprises entre-temps.
 *
 * La libération en arrière-plan et la reprise au retour sont gérées par le moteur d'analyse
 * (`onBackground` / `onForeground`).
 */
export function useReserveHeartbeat({
  getUuids,
  onLost,
  onControl,
  getRemotePaused,
}: {
  getUuids: () => string[];
  onLost?: (uuids: string[]) => void;
  /** Ordre du super admin lu dans la réponse ; `requestedAt` = début de la requête (réponse périmée écartée). */
  onControl?: (control: PosteControl, requestedAt: number) => void;
  /** Ce poste est en pause admin : le serveur restaure l'ordre s'il l'a perdu (redémarrage de l'API). */
  getRemotePaused?: () => boolean;
}) {
  const getUuidsRef = useRef(getUuids);
  const onLostRef = useRef(onLost);
  const onControlRef = useRef(onControl);
  const getRemotePausedRef = useRef(getRemotePaused);
  useEffect(() => {
    getUuidsRef.current = getUuids;
    onLostRef.current = onLost;
    onControlRef.current = onControl;
    getRemotePausedRef.current = getRemotePaused;
  });

  useEffect(() => {
    let inflight = false;

    const beat = async () => {
      if (inflight) return;
      const uuids = getUuidsRef.current();
      if (uuids.length === 0) return;
      inflight = true;
      try {
        const token = await getReserveClaimToken();
        const requestedAt = Date.now();
        const res = await hubProductAnalyzerApi.heartbeatReserve(token, uuids, {
          remotePaused: getRemotePausedRef.current?.() ?? false,
        });
        if (res.lost?.length) onLostRef.current?.(res.lost);
        onControlRef.current?.(res.control ?? 'RUNNING', requestedAt);
      } catch {
        // Réseau coupé : le prochain battement réessaie ; sans retour, le serveur libère les lignes.
      } finally {
        inflight = false;
      }
    };

    const timer = setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') void beat();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
}
