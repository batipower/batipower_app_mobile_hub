import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { errorMessage } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, radius, spacing } from '@/theme';

type DataStateProps = {
  /** Aucune donnée à afficher et un chargement en cours (premier chargement). */
  loading: boolean;
  /** `true` dès qu'il y a des données à afficher (même périmées) : l'erreur ne les masque pas. */
  hasData: boolean;
  error: unknown;
  fallback: string;
  onRetry: () => void;
  /** Hauteur du squelette de chargement. */
  skeletonHeight?: number;
  children: ReactNode;
};

/**
 * Corps d'un encadré alimenté par une requête : squelette au premier chargement, message avec
 * « Réessayer » en cas d'échec sans donnée, sinon le contenu.
 */
export function DataState({
  loading,
  hasData,
  error,
  fallback,
  onRetry,
  skeletonHeight = 140,
  children,
}: DataStateProps) {
  const styles = useStyles();

  if (hasData) return <>{children}</>;

  if (loading) {
    return (
      <View
        style={[styles.skeleton, { height: skeletonHeight }]}
        accessibilityLabel="Chargement"
        accessibilityRole="progressbar"
      />
    );
  }

  return (
    <View style={styles.errorBox} accessibilityRole="alert">
      <Text style={styles.errorText}>{errorMessage(error, fallback)}</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.retry}>Réessayer</Text>
      </Pressable>
    </View>
  );
}

/** Mention discrète pour une liste vide ou une donnée absente. */
export function EmptyNote({ children }: { children: string }) {
  const styles = useStyles();
  return <Text style={styles.empty}>{children}</Text>;
}

const useStyles = makeStyles((t) => ({
  skeleton: { borderRadius: radius.md, backgroundColor: t.surface },
  errorBox: { gap: spacing.sm, alignItems: 'flex-start' },
  errorText: { fontSize: fontSize.sm, color: t.danger },
  retry: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  empty: { fontSize: fontSize.sm, color: t.textSubtle },
}));
