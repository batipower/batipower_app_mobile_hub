import type { AppUserRole } from '@/types/user';

/** Libellés des rôles, repris de `ROLE_LABELS` (`front_externe_batipower/lib/auth/permissions.ts`). */
export const ROLE_LABELS: Record<AppUserRole, string> = {
  ACHETEUR: 'Acheteur',
  CHEF_SERVICE: 'Chef de service',
  RESPONSABLE_ACHAT: 'Responsable Achat',
  RESPONSABLE_ACHAT_REFERENT: 'Responsable Achat Référent',
  LOGISTIQUE: 'Logistique',
  RESPONSABLE_PLATEFORME: 'Responsable Plateforme',
  RESPONSABLE: 'Responsable',
  SUPERADMIN: 'Super Admin',
  PREPARATEUR: 'Préparateur',
  RESPONSABLE_EXPEDITION_PALETTE: 'Responsable expédition palette',
  DIRECTION: 'Direction',
  MANAGER: 'Manager',
  RESPONSABLE_MARQUE: 'Responsable de marque',
  VERIFICATEUR_BL: 'Vérificateur BL',
};

/** Libellé lisible d'un rôle ; retombe sur la valeur brute si le back en ajoute un nouveau. */
export function roleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? role;
}
