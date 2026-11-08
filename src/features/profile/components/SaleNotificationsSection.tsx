import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { ApiError } from '@/api/client';
import { pushTokensApi, type RegisteredPushDevice } from '@/api/pushTokens';
import { Button, DetailSection, InfoRow } from '@/components/ui';
import { resyncPush, usePushStatus, type PushSyncState } from '@/notifications/pushStatus';
import { fontSize, makeStyles, spacing } from '@/theme';

const STATE_LABEL: Record<PushSyncState, string> = {
  idle: 'En attente',
  unavailable: 'Indisponible',
  syncing: 'Enregistrement…',
  ok: 'Enregistré',
  denied: 'Permission refusée',
  noProject: 'Projet EAS introuvable',
  error: 'Échec',
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.message} (HTTP ${error.status})`;
  if (error instanceof Error) return error.message;
  return 'Erreur inconnue';
}

/**
 * Diagnostic des notifications de vente (SUPERADMIN) : état local de l'enregistrement, appareils
 * connus du back, ré-enregistrement et envoi d'une notification de test. Rend visible, sur un
 * build de production, le maillon qui casse quand « rien n'arrive ».
 */
export function SaleNotificationsSection() {
  const styles = useStyles();
  const status = usePushStatus();
  const [resyncing, setResyncing] = useState(false);
  const [testing, setTesting] = useState(false);

  // La clé suit l'état local : un enregistrement réussi doit apparaître côté back.
  const registered = useQuery({
    queryKey: ['push-tokens', 'me', status.state, status.at],
    queryFn: () => pushTokensApi.me(),
    enabled: status.state !== 'syncing',
    retry: false,
    gcTime: 0,
  });
  const devices: RegisteredPushDevice[] | null = registered.data?.devices ?? null;
  const backError = registered.error ? errorMessage(registered.error) : null;

  const resync = async () => {
    setResyncing(true);
    try {
      const started = await resyncPush();
      if (!started) toast.error("Notifications indisponibles sur cet appareil.");
    } finally {
      setResyncing(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const result = await pushTokensApi.testSale();
      if (result.sent) {
        toast.success(`Notification envoyée (commande ${result.reference ?? '—'}).`);
      } else {
        toast.error(result.reason ?? "Aucune notification n'a été envoyée.");
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setTesting(false);
    }
  };

  const deviceCount = devices ? String(devices.length) : '—';

  return (
    <DetailSection title="Notifications de ventes">
      <InfoRow label="Cet appareil" value={STATE_LABEL[status.state]} />
      {status.message ? <Text style={styles.detail}>{status.message}</Text> : null}
      <InfoRow
        label="Appareils enregistrés (serveur)"
        value={backError ? 'Erreur' : deviceCount}
      />
      {backError ? <Text style={styles.detail}>{backError}</Text> : null}
      {devices && devices.length === 0 && status.state === 'ok' ? (
        <Text style={styles.detail}>
          Le serveur ne connaît aucun appareil pour ce compte : touchez « Réenregistrer ».
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="Réenregistrer"
          variant="outline"
          loading={resyncing}
          onPress={() => void resync()}
        />
        <Button
          label="Envoyer une notification de test"
          loading={testing}
          onPress={() => void sendTest()}
        />
      </View>
    </DetailSection>
  );
}

const useStyles = makeStyles((t) => ({
  detail: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
}));
