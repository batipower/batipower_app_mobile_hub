import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { getLandingHref } from '@/modules/registry';
import { fontSize, hitTarget, makeStyles, useTheme } from '@/theme';

/**
 * Bouton retour de la liste Pricing. C'est le premier écran de la pile `pricing` (le `Stack`
 * parent masque son en-tête), donc React Navigation n'affiche aucun bouton retour natif : on le
 * fournit via `headerLeft`. Même rendu que le retour natif des autres écrans du HUB (chevron +
 * « Retour », teinte d'accent du thème). Repli sûr si l'historique est vide (lien profond,
 * rechargement) : retour à l'écran d'accueil du compte.
 */
export function PricingBackButton() {
  const styles = useStyles();
  const t = useTheme();
  const { user } = useAuth();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (user) router.replace(getLandingHref(user));
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={8}
      onPress={goBack}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <ChevronLeft size={24} color={t.accentText} />
      <Text style={styles.label}>Retour</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -6,
  },
  pressed: { opacity: 0.6 },
  label: { fontSize: fontSize.base, color: t.accentText },
}));
