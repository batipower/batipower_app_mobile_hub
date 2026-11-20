import { View } from 'react-native';

import { Chip } from '@/components/ui';
import { makeStyles, spacing } from '@/theme';

type PeriodChipsProps<T extends string> = {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Sélecteur de période (puces à choix unique) partagé par « Évolution » et « Prix et volumes ». */
export function PeriodChips<T extends string>({ options, value, onChange }: PeriodChipsProps<T>) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((option) => (
        <Chip
          key={option.key}
          label={option.label}
          active={option.key === value}
          onPress={() => onChange(option.key)}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
}));
