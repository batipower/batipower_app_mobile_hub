import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { adminMaintenanceApi } from '@/api/adminPlatform';
import { Card } from '@/components/ui';
import { ErrorBanner, ListSkeleton, errorMessage } from '@/features/preparation/components/ListState';
import { formatDateTime } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

import { ADMIN_MAINTENANCE_KEY } from '../queryKeys';
import { Notice } from '../shared/components/FormParts';
import { useMaintenanceConfig } from './hooks';

/** Mode maintenance : bloque l'application pour tous les rôles sauf le super admin. */
export function MaintenanceScreen() {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useMaintenanceConfig();
  const enabled = data?.enabled ?? false;

  const mutation = useMutation({
    mutationFn: (next: boolean) => adminMaintenanceApi.setEnabled(next),
    onSuccess: (result) => {
      queryClient.setQueryData(ADMIN_MAINTENANCE_KEY, result);
      toast.success(
        result.enabled
          ? "Mode maintenance activé : l'application est bloquée pour tous les autres rôles."
          : "Mode maintenance désactivé : l'application est de nouveau accessible.",
      );
    },
    onError: (e) => toast.error(errorMessage(e, 'Changement impossible')),
  });

  const onToggle = (next: boolean) => {
    if (!next) {
      mutation.mutate(false);
      return;
    }
    Alert.alert(
      'Activer le mode maintenance ?',
      "Tous les utilisateurs (hors super admin) seront immédiatement bloqués et redirigés vers une page de maintenance, y compris ceux déjà connectés. Cette action doit rester exceptionnelle.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Activer la maintenance', style: 'destructive', onPress: () => mutation.mutate(true) },
      ],
    );
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        Bloque l’accès à l’application pour tous les rôles sauf le super admin, en cas d’incident critique.
      </Text>
      {isLoading ? (
        <ListSkeleton rows={1} height={120} />
      ) : error ? (
        <ErrorBanner error={error} fallback="Impossible de charger le statut" onRetry={() => void refetch()} />
      ) : (
        <>
          {enabled ? (
            <View style={styles.alert}>
              <AlertTriangle size={20} color={t.danger} />
              <Text style={styles.alertText}>
                Le mode maintenance est actuellement actif. Tous les utilisateurs (hors super admin) sont
                redirigés vers la page de maintenance.
              </Text>
            </View>
          ) : null}
          <Card contentStyle={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Activer le mode maintenance</Text>
              <Text style={styles.rowDesc}>
                {data?.updatedAt ? `Dernière modification le ${formatDateTime(data.updatedAt)}` : 'Jamais activé.'}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={onToggle}
              disabled={mutation.isPending}
              trackColor={{ true: t.danger, false: t.surfaceStrong }}
              accessibilityLabel="Activer le mode maintenance"
            />
          </Card>
          <Notice>Le super admin reste exempté du blocage et peut continuer à utiliser l’application.</Notice>
        </>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, paddingBottom: 160, gap: spacing.lg },
  intro: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  alert: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.danger,
  },
  alertText: { flex: 1, fontSize: fontSize.sm, lineHeight: 19, color: t.danger },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  rowDesc: { fontSize: fontSize.xs, color: t.textMuted },
}));
