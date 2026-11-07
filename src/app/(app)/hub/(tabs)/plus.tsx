import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { getLandingHref } from '@/modules/registry';

/**
 * Emplacement de l'onglet « Menu » : il n'est jamais affiché (l'appui ouvre la feuille de menu).
 * Seul un lien profond peut y atterrir ; on renvoie alors vers l'accueil du compte.
 */
export default function MenuTabPlaceholder() {
  const { user } = useAuth();
  if (!user) return null;
  return <Redirect href={getLandingHref(user)} />;
}
