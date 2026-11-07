import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { UserCog, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { useTabBarInset } from '@/components/navigation/tabBarInset';
import { makeStyles, radius, spacing } from '@/theme';

/**
 * Marge au-dessus du bas de l'écran sur les écrans sans barre d'onglets (fil de discussion, fiches…) :
 * la pastille ne recouvre ainsi ni le composeur ni les actions du bas.
 */
const ABOVE_BOTTOM = 76;

/**
 * Pastille flottante affichée pendant une impersonation : rappelle quel compte est usurpé et
 * permet d'en sortir d'un appui, depuis n'importe quel écran. Elle reste visible même quand le
 * compte usurpé arrive sur un écran sans onglet Profil (module « bientôt disponible »).
 */
export function ImpersonationBanner() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  // Hauteur de la barre d'onglets flottante quand elle est affichée, sinon 0.
  const tabBarInset = useTabBarInset();
  const { user, isImpersonating, stopImpersonation } = useAuth();
  const [stopping, setStopping] = useState(false);
  if (!user || !isImpersonating) return null;

  const stop = () => {
    if (stopping) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setStopping(true);
    stopImpersonation()
      .catch((error: unknown) => {
        toast.error(
          error instanceof ApiError ? error.message : 'Impossible de revenir à votre compte.',
        );
      })
      .finally(() => setStopping(false));
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: tabBarInset > 0 ? tabBarInset : insets.bottom + ABOVE_BOTTOM },
      ]}
    >
      <Pressable
        onPress={stop}
        disabled={stopping}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Connecté en tant que ${user.name}. Revenir à mon compte`}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        <UserCog size={14} color="#FFFFFF" />
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        <View style={styles.separator} />
        {stopping ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.stop}>Arrêter</Text>
            <X size={13} color="#FFFFFF" />
          </>
        )}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'flex-start' },
  pill: {
    maxWidth: '100%',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: '#EA580C',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  pressed: { opacity: 0.85 },
  name: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  separator: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.5)' },
  stop: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
}));
