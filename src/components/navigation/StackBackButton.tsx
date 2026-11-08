import { Pressable, Text } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { fontSize, hitTarget, makeStyles, useTheme } from '@/theme';

type StackBackButtonProps = {
  /** Destination quand l'historique est vide (lien profond, notification, rechargement). */
  fallbackHref: Href;
};

/**
 * Bouton retour de repli pour les écrans qui peuvent être le premier de leur pile (ouverts depuis
 * une notification, un lien profond ou un autre onglet) : React Navigation n'affiche alors aucun
 * retour natif et, la barre d'onglets étant masquée sur les écrans poussés, l'utilisateur serait
 * bloqué. Même rendu que le retour natif des autres écrans du HUB (chevron + « Retour », teinte
 * d'accent du thème), à brancher via `headerLeft`.
 */
export function StackBackButton({ fallbackHref }: StackBackButtonProps) {
  const styles = useStyles();
  const t = useTheme();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackHref);
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

/**
 * `headerLeft` qui ne fournit le retour de repli que lorsque la pile n'en a pas de natif : quand
 * un écran existe dessous, on garde le retour natif (et son geste de balayage iOS).
 */
export function fallbackBackHeaderLeft(fallbackHref: Href) {
  const headerLeft = ({ canGoBack }: { canGoBack?: boolean }) =>
    canGoBack ? undefined : <StackBackButton fallbackHref={fallbackHref} />;
  return headerLeft;
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
