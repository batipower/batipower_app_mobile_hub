import { useAuth } from '@/auth/AuthProvider';
import { StackBackButton } from '@/components/navigation/StackBackButton';
import { getLandingHref } from '@/modules/registry';

/**
 * Bouton retour de la file « Fiches produit », premier écran de sa pile (le `Stack` parent masque
 * son en-tête) : repli sur l'accueil du compte si l'historique est vide.
 */
export function StudioBackButton() {
  const { user } = useAuth();
  if (!user) return null;
  return <StackBackButton fallbackHref={getLandingHref(user)} />;
}
