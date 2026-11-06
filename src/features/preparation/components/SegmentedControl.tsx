import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, fontSize, hitTarget, onDark, radius, spacing, withAlpha } from '@/theme';

export interface Segment<T extends string> {
  key: T;
  label: string;
  /** Compteur affiché dans une pastille à droite du libellé. */
  count?: number;
}

type SegmentedControlProps<T extends string> = {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (key: T) => void;
};

/** Sélecteur à segments, pleine largeur (équivalent des onglets de la page web). */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(segment.key);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {segment.label}
            </Text>
            {segment.count !== undefined ? (
              <View style={[styles.count, active && styles.countActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>
                  {segment.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: onDark.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: onDark.border,
  },
  segment: {
    flex: 1,
    minHeight: hitTarget - 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md - 3,
  },
  segmentActive: { backgroundColor: onDark.surfaceStrong },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: onDark.textSubtle },
  labelActive: { color: colors.white },
  count: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    backgroundColor: onDark.surfaceStrong,
  },
  countActive: { backgroundColor: withAlpha(colors.green, 0.2) },
  countText: { fontSize: 11, fontWeight: '700', color: onDark.textMuted },
  countTextActive: { color: colors.green },
});
