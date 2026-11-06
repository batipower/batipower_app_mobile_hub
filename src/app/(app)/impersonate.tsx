import { ImpersonationSheet } from '@/features/impersonation/ImpersonationSheet';

/** Feuille de choix du compte à usurper (SUPERADMIN), ouverte depuis le Profil. */
export default function ImpersonateRoute() {
  return <ImpersonationSheet />;
}
