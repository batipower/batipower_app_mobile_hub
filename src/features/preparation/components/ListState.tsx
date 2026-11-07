import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { TriangleAlert, WifiOff } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

/** Message d'erreur affichable : celui de l'API, sinon un texte générique. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message || fallback;
  return fallback;
}

/** Squelette de chargement : cartes grisées, en attendant les premières données. */
export function ListSkeleton({ rows = 5, height = 128 }: { rows?: number; height?: number }) {
  const styles = useStyles();
  return (
    <View
      style={styles.skeletonList}
      accessibilityLabel="Chargement"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.skeleton, { height, opacity: 1 - index * 0.15 }]} />
      ))}
    </View>
  );
}

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  text?: string;
};

/** Liste vide (aucune commande, rien à récupérer…). */
export function EmptyState({ icon, title, text }: EmptyStateProps) {
  const styles = useStyles();
  return (
    <View style={styles.center}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

type ErrorBannerProps = {
  error: unknown;
  fallback: string;
  onRetry: () => void;
};

/** Bandeau d'erreur avec relance, affiché au-dessus des données déjà en cache. */
export function ErrorBanner({ error, fallback, onRetry }: ErrorBannerProps) {
  const styles = useStyles();
  const t = useTheme();
  const offline = error instanceof ApiError && error.isNetworkError;
  const Icon = offline ? WifiOff : TriangleAlert;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Icon size={18} color={t.danger} />
      <Text style={styles.bannerText}>{errorMessage(error, fallback)}</Text>
      <Button label="Réessayer" variant="ghost" onPress={onRetry} style={styles.retry} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  skeletonList: { gap: spacing.md },
  skeleton: { borderRadius: radius.md, backgroundColor: t.card },
  center: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
  },
  iconWrap: {
    width: 56,
    height: 56,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surface,
  },
  title: { fontSize: fontSize.base, fontWeight: '700', color: t.text, textAlign: 'center' },
  text: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted, textAlign: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(t.danger, 0.3),
    backgroundColor: t.dangerBg,
  },
  bannerText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.danger },
  retry: { minHeight: 36, paddingHorizontal: spacing.sm },
}));
