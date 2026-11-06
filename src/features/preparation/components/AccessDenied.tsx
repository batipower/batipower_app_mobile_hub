import { View } from 'react-native';
import { Lock } from 'lucide-react-native';

import { useTheme } from '@/theme';

import { EmptyState } from './ListState';

type AccessDeniedProps = {
  title?: string;
  text?: string;
};

/**
 * Écran affiché aux comptes qui n'ont pas accès à une page du HUB. Par défaut, le message
 * de la préparation (SUPERADMIN / MANAGER) ; d'autres pages passent leur propre texte.
 */
export function AccessDenied({
  title = 'Accès réservé',
  text = 'La préparation des commandes est réservée aux comptes Manager et Super Admin.',
}: AccessDeniedProps) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <EmptyState icon={<Lock size={24} color={t.textMuted} />} title={title} text={text} />
    </View>
  );
}
