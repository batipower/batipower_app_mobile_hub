import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, hitTarget, makeStyles, spacing } from '@/theme';

type ActionSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Désactive la fermeture (action en cours). */
  closeDisabled?: boolean;
  /** Pied fixe sous le contenu (boutons d'action). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Feuille de saisie d'une action de la fiche commande. Présentée en `Modal` natif (feuille
 * `pageSheet`) plutôt qu'en route : la fiche est ouverte depuis cinq piles différentes, une
 * feuille locale évite de dupliquer des routes et de faire transiter la commande par l'URL.
 */
export function ActionSheet({
  visible,
  title,
  onClose,
  closeDisabled = false,
  footer,
  children,
}: ActionSheetProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeDisabled ? undefined : onClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.side} />
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <View style={[styles.side, styles.sideEnd]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: closeDisabled }}
              disabled={closeDisabled}
              hitSlop={10}
              onPress={onClose}
            >
              <Text style={[styles.close, closeDisabled && { opacity: 0.4 }]}>Fermer</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={[
            styles.content,
            !footer && { paddingBottom: insets.bottom + spacing['2xl'] },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>

        {footer ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bgElevated },
  header: {
    minHeight: hitTarget + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  side: { minWidth: 70 },
  sideEnd: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  close: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  body: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: t.border,
  },
}));
