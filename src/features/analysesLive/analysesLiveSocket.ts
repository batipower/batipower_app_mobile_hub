import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';

import { hubAnalysesLiveApi, type LiveSnapshot } from '@/api/hubAnalysesLive';

/**
 * Connexion temps réel unique (`/analyses-live`) partagée par tous les consommateurs de « Analyses en cours »
 * (pastille du cockpit, écran de suivi). Un compteur de références ouvre la socket au premier abonné et la
 * ferme au dernier ; l'app passée en arrière-plan (`background`) la coupe (économie de batterie), le retour au premier plan
 * la rouvre avec un ticket neuf.
 *
 * - `connected` : la socket pousse les snapshots, la lecture périodique n'est plus nécessaire ;
 * - `unavailable` : ticket refusé / back ancien / socket coupée → repli sur la lecture périodique de `GET live`,
 *   la connexion est retentée en tâche de fond.
 */
export type AnalysesLiveStatus = 'idle' | 'connecting' | 'connected' | 'unavailable';

export interface AnalysesLiveSubscriber {
  onSnapshot: (snapshot: LiveSnapshot) => void;
  onStatus: (status: AnalysesLiveStatus) => void;
}

/** Nouvel essai quand le ticket n'a pas pu être obtenu (back pas encore déployé, réseau). */
const TICKET_RETRY_MS = 30_000;
/** Délai avant de se reconnecter après une coupure décidée par le serveur (ticket refusé). */
const SERVER_DISCONNECT_RETRY_MS = 5_000;

const subscribers = new Set<AnalysesLiveSubscriber>();
let socket: Socket | null = null;
let status: AnalysesLiveStatus = 'idle';
let starting = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lastSnapshot: LiveSnapshot | null = null;
let appStateSub: { remove: () => void } | null = null;
let inBackground = false;

function setStatus(next: AnalysesLiveStatus) {
  if (status === next) return;
  status = next;
  subscribers.forEach((s) => s.onStatus(next));
}

function clearRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
}

function scheduleRetry(delay: number) {
  clearRetry();
  if (subscribers.size === 0 || inBackground) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void start();
  }, delay);
}

async function start(): Promise<void> {
  if (socket || starting || subscribers.size === 0 || inBackground) return;
  starting = true;
  setStatus('connecting');
  try {
    let initial: Awaited<ReturnType<typeof hubAnalysesLiveApi.getWsTicket>> | null =
      await hubAnalysesLiveApi.getWsTicket();
    if (subscribers.size === 0 || inBackground) {
      // Plus personne n'écoute (ou l'app est passée en arrière-plan) pendant l'obtention du ticket.
      if (subscribers.size === 0) status = 'idle';
      return;
    }
    if (!initial?.wsUrl || !initial.token) throw new Error('Ticket WS incomplet');

    const next = io(initial.wsUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15_000,
      timeout: 10_000,
      // Un ticket vit 2 min : chaque (re)connexion en redemande un.
      auth: (cb) => {
        if (initial) {
          const token = initial.token;
          initial = null;
          cb({ token });
          return;
        }
        hubAnalysesLiveApi
          .getWsTicket()
          .then((t) => cb({ token: t.token ?? '' }))
          .catch(() => cb({ token: '' }));
      },
    });

    next.on('connect', () => setStatus('connected'));
    next.on('disconnect', (reason) => {
      // Tant que la socket n'est pas revenue, la lecture périodique prend le relais.
      setStatus('unavailable');
      if (reason === 'io server disconnect') {
        // Coupure décidée par le serveur (ticket refusé) : socket.io ne reconnecte pas seul.
        setTimeout(() => {
          if (socket === next && subscribers.size > 0 && !inBackground) next.connect();
        }, SERVER_DISCONNECT_RETRY_MS);
      }
    });
    next.on('connect_error', () => setStatus('unavailable'));
    next.on('live:snapshot', (snapshot: LiveSnapshot) => {
      if (!snapshot || !Array.isArray(snapshot.analyses) || !Array.isArray(snapshot.postes)) return;
      lastSnapshot = snapshot;
      subscribers.forEach((s) => s.onSnapshot(snapshot));
    });

    socket = next;
  } catch {
    // Ticket indisponible (back sans le canal, réseau) : repli sur la lecture périodique, nouvel essai plus tard.
    setStatus('unavailable');
    scheduleRetry(TICKET_RETRY_MS);
  } finally {
    starting = false;
  }
}

/** Ferme la socket sans oublier les abonnés (arrière-plan) ou en repartant de zéro (`reset`). */
function closeSocket(reset: boolean) {
  clearRetry();
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  if (reset) lastSnapshot = null;
  status = reset ? 'idle' : 'unavailable';
}

function watchAppState() {
  if (appStateSub) return;
  inBackground = AppState.currentState === 'background';
  appStateSub = AppState.addEventListener('change', (next) => {
    if (subscribers.size === 0) return;
    // `inactive` (iOS : centre de contrôle, appel entrant, multitâche) est transitoire : on ne coupe pas.
    if (next === 'active') {
      if (!inBackground) return;
      inBackground = false;
      void start();
    } else if (next === 'background' && !inBackground) {
      inBackground = true;
      closeSocket(false);
      // La lecture périodique est déjà suspendue par React Query en arrière-plan.
      subscribers.forEach((s) => s.onStatus(status));
    }
  });
}

/** S'abonne au flux ; le dernier snapshot connu est rejoué tout de suite. Retourne la fonction de désabonnement. */
export function subscribeAnalysesLive(subscriber: AnalysesLiveSubscriber): () => void {
  subscribers.add(subscriber);
  subscriber.onStatus(status);
  if (lastSnapshot) subscriber.onSnapshot(lastSnapshot);
  if (subscribers.size === 1) {
    watchAppState();
    void start();
  }
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      closeSocket(true);
      appStateSub?.remove();
      appStateSub = null;
      inBackground = false;
    }
  };
}
