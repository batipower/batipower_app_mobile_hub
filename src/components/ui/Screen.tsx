import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Contenu défilable, avec ajustement automatique au clavier. */
  scroll?: boolean;
  /** Bords protégés par la safe area (haut et bas par défaut). */
  edges?: readonly Edge[];
  backgroundColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  backgroundColor = colors.black,
  contentStyle,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1, paddingHorizontal: spacing.xl },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
});
