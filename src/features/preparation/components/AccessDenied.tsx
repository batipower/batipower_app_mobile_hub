import { View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { onDark } from '@/theme';

import { EmptyState } from './ListState';

/** Écran affiché aux comptes qui n'ont pas accès à la préparation (hors SUPERADMIN / MANAGER). */
export function AccessDenied() {
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <EmptyState
        icon={<Lock size={24} color={onDark.textMuted} />}
        title="Accès réservé"
        text="La préparation des commandes est réservée aux comptes Manager et Super Admin."
      />
    </View>
  );
}
