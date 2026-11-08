import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui';
import { makeStyles, spacing } from '@/theme';

export interface ChipBarItem<T extends string> {
  key: T;
  label: string;
  count?: number;
}

type ChipBarProps<T extends string> = {
  items: readonly ChipBarItem<T>[];
  value: T;
  onChange: (key: T) => void;
};

/** Rangée de puces défilante à sélection unique (statuts d'une liste), sous la recherche. */
export function ChipBar<T extends string>({ items, value, onChange }: ChipBarProps<T>) {
  const styles = useStyles();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
      accessibilityRole="tablist"
    >
      {items.map((item) => (
        <Chip
          key={item.key}
          label={item.label}
          count={item.count}
          active={item.key === value}
          onPress={() => onChange(item.key)}
        />
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles(() => ({
  scroll: { flexGrow: 0 },
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl },
}));
