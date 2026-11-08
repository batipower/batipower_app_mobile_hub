import type { ReactNode } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, makeStyles, radius, spacing, withAlpha } from '@/theme';

type PaDialogProps = {
  visible: boolean;
  title: string;
  /** Teinte de l'icône d'en-tête. */
  tone?: string;
  icon?: ReactNode;
  subtitle?: string;
  /** Fermeture par geste (feuille iOS, retour Android) ; absente = pas de fermeture possible. */
  onClose?: () => void;
  footer: ReactNode;
  children: ReactNode;
};

/**
 * Boîte de dialogue interactive des analyses (poids, produit bloqué, déjà analysé…) : feuille
 * `pageSheet` sur iOS, plein écran sur Android. Les actions sont en pied, à portée du pouce.
 */
export function PaDialog({ visible, title, tone, icon, subtitle, onClose, footer, children }: PaDialogProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          {icon ? (
            <View style={[styles.icon, tone ? { backgroundColor: withAlpha(tone, 0.14) } : null]}>{icon}</View>
          ) : null}
          <View style={styles.titles}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{footer}</View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bgElevated },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surface,
  },
  titles: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: t.text },
  subtitle: { fontSize: fontSize.xs, color: t.textMuted },
  body: { flex: 1 },
  content: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  footer: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
}));
