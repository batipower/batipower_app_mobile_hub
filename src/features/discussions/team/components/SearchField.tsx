import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';

type SearchFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor' | 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

/** Champ de recherche des sélecteurs (loupe à gauche, bouton d'effacement à droite). */
export function SearchField({ value, onChangeText, placeholder, ...inputProps }: SearchFieldProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Search size={16} color={t.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.textFaint}
        selectionColor={t.accentText}
        keyboardAppearance={t.scheme}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel={placeholder}
        style={styles.input}
        {...inputProps}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
        >
          <X size={16} color={t.textSubtle} />
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
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  input: { flex: 1, minHeight: hitTarget, fontSize: fontSize.sm, color: t.text },
}));
