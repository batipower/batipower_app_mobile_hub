import { useAuth } from '@/auth/AuthProvider';
import { StackBackButton } from '@/components/navigation/StackBackButton';
import { getLandingHref } from '@/modules/registry';

/**
 * Bouton retour de la liste Pricing. C'est le premier écran de la pile `pricing` (le `Stack`
 * parent masque son en-tête), donc React Navigation n'affiche aucun bouton retour natif : on le
 * fournit via `headerLeft`. Repli sûr si l'historique est vide (lien profond, rechargement) :
 * retour à l'écran d'accueil du compte.
 */
export function PricingBackButton() {
  const { user } = useAuth();
  if (!user) return null;
  return <StackBackButton fallbackHref={getLandingHref(user)} />;
}
