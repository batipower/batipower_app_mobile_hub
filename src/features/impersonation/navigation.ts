import { router } from 'expo-router';

/** Ouvre la feuille de choix du compte à usurper (SUPERADMIN). */
export function openImpersonation() {
  router.push('/impersonate');
}
