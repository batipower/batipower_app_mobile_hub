import type { AppUserRole } from '@/types/user';

/**
 * Rôles « opérations HUB », repris de `isHubOpsRole`
 * (`front_externe_batipower/lib/auth/permissions.ts`).
 */
function isHubOpsRole(role: AppUserRole): boolean {
  return role === 'SUPERADMIN' || role === 'MANAGER';
}

/** Page Préparation du HUB : mêmes rôles que `canAccessHubPreparation` côté web. */
export function canAccessHubPreparation(role: AppUserRole): boolean {
  return isHubOpsRole(role);
}
