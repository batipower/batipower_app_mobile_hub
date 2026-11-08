import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';

import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

type OptionRowProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** Ligne de choix unique d'une feuille de filtres, avec coche sur la valeur retenue. */
export function OptionRow({ label, selected, onPress }: OptionRowProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
    >
      <Text style={styles.label}>{label}</Text>
      {selected ? <Check size={18} color={t.accentText} /> : null}
    </Pressable>
  );
}

type NavRowProps = {
  label: string;
  /** Valeur courante affichée à droite (« Toutes » quand rien n'est choisi). */
  value: string;
  onPress: () => void;
};

/** Ligne qui ouvre une feuille de choix (la marque, par exemple). */
export function NavRow({ label, value, onPress }: NavRowProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <ChevronRight size={16} color={t.textFaint} />
    </Pressable>
  );
}

type ToggleRowProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/** Ligne d'un filtre binaire (« Réponse attendue »). */
export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: t.accent }}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  label: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  value: { flexShrink: 1, fontSize: fontSize.sm, color: t.textMuted },
}));
