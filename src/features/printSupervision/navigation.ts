import { router } from 'expo-router';

/** Page Supervision impression (menu du HUB, pastille imprimantes du cockpit). */
export function openPrintSupervision() {
  router.push('/hub/supervision-impression');
}

/** Feuille de saisie de l'adresse d'un poste d'impression. */
export function openPrintServerLocation(serverId: string) {
  router.push({ pathname: '/hub/supervision-impression/adresse', params: { serverId } });
}
