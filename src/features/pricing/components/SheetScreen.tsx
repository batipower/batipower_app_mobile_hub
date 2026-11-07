import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

type SheetScreenProps = {
  title: string;
  /** Action à gauche du titre (ex. « Réinitialiser »). */
  leading?: { label: string; onPress: () => void; disabled?: boolean };
  /** Libellé du bouton de fermeture à droite. */
  closeLabel?: string;
  /** Pied fixe sous le contenu (bouton principal). */
  footer?: ReactNode;
  /** Désactive le défilement quand le contenu gère le sien (liste). */
  scroll?: boolean;
  children: ReactNode;
};

/**
 * Cadre commun des feuilles natives de la page Pricing : titre, fermeture, contenu défilant
 * et pied fixe. Les feuilles sont présentées sans en-tête de pile (`headerShown: false`).
 */
export function SheetScreen({
  title,
  leading,
  closeLabel = 'OK',
  footer,
  scroll = true,
  children,
}: SheetScreenProps) {
  const styles = useStyles();
  const t = useTheme();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.side}>
          {leading ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: leading.disabled }}
              disabled={leading.disabled}
              hitSlop={10}
              onPress={leading.onPress}
            >
              <Text style={[styles.action, leading.disabled && { color: t.textFaint }]}>
                {leading.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.side, styles.sideEnd]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            hitSlop={10}
            onPress={() => router.back()}
          >
            <Text style={[styles.action, styles.close]}>{closeLabel}</Text>
          </Pressable>
        </View>
      </View>

      {scroll ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

/** Bloc titré d'une feuille (« Stock », « BuyBox »…). */
export function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bgElevated },
  header: {
    minHeight: hitTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  side: { width: 104 },
  sideEnd: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  action: { fontSize: fontSize.sm, fontWeight: '600', color: t.textMuted },
  close: { color: t.accentText, fontWeight: '700' },
  body: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing['2xl'], paddingBottom: spacing['4xl'] },
  footer: {
    padding: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: t.border,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  sectionBody: { gap: spacing.lg },
}));
