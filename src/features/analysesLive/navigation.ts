import { router } from 'expo-router';

/** Page Analyses en cours (menu du HUB, pastille analyses du cockpit). */
export function openAnalysesEnCours() {
  router.push('/hub/analyses-en-cours');
}
