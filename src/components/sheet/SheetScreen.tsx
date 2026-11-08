import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';

import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

import { useSheetKeyboard } from './useSheetKeyboard';

type SheetAction = { label: string; onPress: () => void; disabled?: boolean };

type SheetHeaderProps = {
  title: string;
  /** Action à gauche du titre (ex. « Réinitialiser »). */
  leading?: SheetAction;
  /** Libellé du bouton de fermeture à droite. */
  closeLabel?: string;
  /** Remplace la fermeture par défaut (`router.back()`). */
  onClose?: () => void;
  /** Désactive la fermeture (action en cours). */
  closeDisabled?: boolean;
};

/**
 * En-tête commun des feuilles : action à gauche, titre centré, fermeture à droite. Les colonnes
 * latérales grandissent avec leur libellé (texte agrandi) sans jamais écraser le titre, qui
 * rétrécit ou se tronque à la place.
 */
export function SheetHeader({
  title,
  leading,
  closeLabel = 'OK',
  onClose,
  closeDisabled = false,
}: SheetHeaderProps) {
  const styles = useStyles();
  const t = useTheme();

  return (
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
            <Text
              style={[styles.action, leading.disabled && { color: t.textFaint }]}
              numberOfLines={1}
            >
              {leading.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text
        style={styles.title}
        accessibilityRole="header"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {title}
      </Text>
      <View style={[styles.side, styles.sideEnd]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          accessibilityState={{ disabled: closeDisabled }}
          disabled={closeDisabled}
          hitSlop={10}
          onPress={onClose ?? (() => router.back())}
        >
          <Text
            style={[styles.action, styles.close, closeDisabled && { opacity: 0.4 }]}
            numberOfLines={1}
          >
            {closeLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

type SheetScreenProps = SheetHeaderProps & {
  /** Pied fixe sous le contenu (bouton principal). */
  footer?: ReactNode;
  /** Désactive le défilement quand le contenu gère le sien (liste). */
  scroll?: boolean;
  children: ReactNode;
};

/**
 * Cadre commun des feuilles natives : titre, fermeture, contenu défilant et pied fixe. Les
 * feuilles sont présentées sans en-tête de pile (`headerShown: false`).
 *
 * Le cadre gère la zone sûre du bas (le pied ne touche jamais la barre d'accueil) et le clavier :
 * le corps rétrécit, le pied reste visible au-dessus du clavier.
 */
export function SheetScreen({ footer, scroll = true, children, ...header }: SheetScreenProps) {
  const styles = useStyles();
  const { rootStyle, footerStyle, restingPadding } = useSheetKeyboard();

  return (
    <Animated.View style={[styles.root, rootStyle]}>
      <SheetHeader {...header} />

      {scroll ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={[
            styles.content,
            // Sans pied, le dernier élément ne doit pas se coller à la barre d'accueil.
            !footer && { paddingBottom: restingPadding + spacing['2xl'] },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}

      {footer ? <Animated.View style={[styles.footer, footerStyle]}>{footer}</Animated.View> : null}
    </Animated.View>
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
    minHeight: hitTarget + spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    // Laisse la place du grabber au-dessus de la ligne de titre.
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  side: { minWidth: 80, flexShrink: 0 },
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
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
