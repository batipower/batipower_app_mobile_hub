import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

/** Champ de recherche compact, avec bouton d'effacement. */
export function SearchBar({ value, onChangeText, placeholder = 'Rechercher' }: SearchBarProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Search size={16} color={t.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.textSubtle}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        selectionColor={t.accentText}
        accessibilityLabel={placeholder}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
        >
          <X size={16} color={t.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  field: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.borderStrong,
    backgroundColor: t.card,
  },
  input: { flex: 1, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: t.text },
}));
