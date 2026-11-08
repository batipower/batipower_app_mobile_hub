import { View } from 'react-native';

import { Button } from '@/components/ui';
import { spacing } from '@/theme';

/** Boutons d'enregistrement / retour aux valeurs par défaut sous une section de configuration. */
export function ConfigActions({
  dirty,
  valid,
  saving,
  customized,
  onSave,
  onReset,
}: {
  dirty: boolean;
  valid: boolean;
  saving: boolean;
  customized: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Button label="Enregistrer" loading={saving} disabled={!dirty || !valid} onPress={onSave} />
      {customized ? (
        <Button label="Rétablir les valeurs par défaut" variant="ghost" destructive disabled={saving} onPress={onReset} />
      ) : null}
    </View>
  );
}
