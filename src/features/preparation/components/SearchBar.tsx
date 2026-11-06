import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { colors, fontSize, hitTarget, onDark, radius, spacing } from '@/theme';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/** Champ de recherche compact, avec bouton d'effacement. */
export function SearchBar({ value, onChangeText, placeholder = 'Rechercher' }: SearchBarProps) {
  return (
    <View style={styles.field}>
      <Search size={16} color={onDark.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={onDark.textSubtle}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        selectionColor={colors.green}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
        >
          <X size={16} color={onDark.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: onDark.borderStrong,
    backgroundColor: onDark.surface,
  },
  input: { flex: 1, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: colors.white },
});
