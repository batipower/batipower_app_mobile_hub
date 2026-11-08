import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { fontSize, hitTarget, makeStyles, useTheme } from '@/theme';

import { openQuotesHome } from '../navigation';

/**
 * Bouton retour des piles imbriquées de l'onglet Devis : leur premier écran n'a pas de retour
 * natif (voir `PricingBackButton`). Repli sur le pipeline si l'historique est vide (lien profond).
 */
export function QuotesBackButton() {
  const styles = useStyles();
  const t = useTheme();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else openQuotesHome();
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
  button: { minHeight: hitTarget, flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  pressed: { opacity: 0.6 },
  label: { fontSize: fontSize.base, color: t.accentText },
}));
