import { router } from 'expo-router';

/** Ouvre la feuille de menu du module ADMIN (mi-écran, par-dessus les onglets). */
export function openAdminMenu() {
  router.push('/admin/menu');
}
