import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, spacing } from '@/theme';

import { StudioCard } from './ui';

type SecondaryAction = {
  label: string;
  pendingLabel: string;
  pending?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/** Consigne + « Recalculer » des onglets calculés côté serveur (GEO, associés, catégories). */
export function RefreshBar({
  children,
  pending,
  disabled,
  onRefresh,
  secondaryAction,
}: {
  children: ReactNode;
  pending: boolean;
  disabled?: boolean;
  onRefresh: () => void;
  secondaryAction?: SecondaryAction;
}) {
  const styles = useStyles();
  return (
    <StudioCard>
      <Text style={styles.text}>{children}</Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            label={pending ? 'Recalcul…' : 'Recalculer'}
            variant={secondaryAction ? 'outline' : 'primary'}
            loading={pending}
            disabled={disabled || secondaryAction?.pending}
            onPress={onRefresh}
          />
        </View>
        {secondaryAction ? (
          <View style={styles.flex}>
            <Button
              label={secondaryAction.pending ? secondaryAction.pendingLabel : secondaryAction.label}
              loading={secondaryAction.pending}
              disabled={pending || secondaryAction.disabled}
              onPress={secondaryAction.onPress}
            />
          </View>
        ) : null}
      </View>
    </StudioCard>
  );
}

const useStyles = makeStyles((t) => ({
  text: { fontSize: fontSize.xs, lineHeight: 18, color: t.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
}));
