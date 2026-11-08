import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Check, Copy } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { adminApiKeysApi } from '@/api/adminPlatform';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { formatDateTime } from '@/lib/format';
import { copyToClipboard } from '@/lib/clipboard';
import { makeStyles, spacing, useTheme } from '@/theme';
import {
  API_KEY_WAREHOUSES,
  formatApiKeyWarehouse,
  type ApiKeyRequest,
  type ApiKeyWarehouse,
  type ApprovedApiKeyRequest,
} from '@/types/adminPlatform';

import { Notice, SelectField } from '../../shared/components/FormParts';
import { useApiKeyRequests } from '../hooks';
import { isApiKeyWarehouse } from './helpers';
import { useInvalidateApiKeys } from './useApiKeyActions';

/**
 * Validation d'une demande de clé. La clé émise n'est renvoyée qu'une seule fois par le back : elle
 * reste dans l'état de cette feuille (jamais dans l'URL ni dans le cache) et s'affiche après succès.
 */
export function ApproveApiKeyRequestSheet() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const requests = useApiKeyRequests();
  const request = requests.data?.data.find((r) => r.uuid === uuid);
  const [issued, setIssued] = useState<ApprovedApiKeyRequest | null>(null);

  if (issued) return <IssuedKey issued={issued} />;
  if (!request) {
    return (
      <SheetScreen title="Valider la demande">
        <Text>{requests.isLoading ? 'Chargement…' : 'Demande introuvable ou déjà traitée.'}</Text>
      </SheetScreen>
    );
  }
  return <ApproveForm request={request} onIssued={setIssued} />;
}

function ApproveForm({ request, onIssued }: { request: ApiKeyRequest; onIssued: (key: ApprovedApiKeyRequest) => void }) {
  const styles = useStyles();
  const invalidate = useInvalidateApiKeys();
  const [name, setName] = useState(request.requesterName);
  const [warehouse, setWarehouse] = useState<ApiKeyWarehouse>(
    isApiKeyWarehouse(request.warehouse) ? request.warehouse : 'QG_BATIPOWER',
  );
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState(request.reason ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      adminApiKeysApi.approveRequest(request.uuid, {
        name: name.trim(),
        warehouse,
        description: description.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
      }),
    onSuccess: async (approved) => {
      toast.success('Demande validée, la clé a été générée');
      onIssued(approved);
      await invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors de la validation')),
  });

  return (
    <SheetScreen
      title="Valider la demande"
      closeLabel="Annuler"
      closeDisabled={mutation.isPending}
      footer={
        <Button
          label="Valider et générer la clé"
          loading={mutation.isPending}
          disabled={!name.trim()}
          onPress={() => mutation.mutate()}
          style={styles.submit}
        />
      }
    >
      <Notice tone="warning">
        {request.requesterName}
        {'\n'}
        {request.requesterEmail || 'E-mail non renseigné'} · {formatApiKeyWarehouse(request.warehouse)} · reçue le{' '}
        {formatDateTime(request.createdAt)}
        {request.reason ? `\nMotif : ${request.reason}` : ''}
      </Notice>
      <TextField label="Nom de la clé" value={name} onChangeText={setName} placeholder="Poste Jean Dupont" />
      <SelectField
        label="Entrepôt"
        valueLabel={formatApiKeyWarehouse(warehouse)}
        hint={request.warehouse ? `Entrepôt demandé : ${formatApiKeyWarehouse(request.warehouse)}` : undefined}
        searchable={false}
        options={API_KEY_WAREHOUSES.map((w) => ({ value: w, label: formatApiKeyWarehouse(w) }))}
        selected={[warehouse]}
        onToggle={(w) => w && setWarehouse(w as ApiKeyWarehouse)}
      />
      <TextField
        label="Clé API (optionnel)"
        value={apiKey}
        onChangeText={setApiKey}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Laisser vide pour générer automatiquement"
      />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline />
    </SheetScreen>
  );
}

function IssuedKey({ issued }: { issued: ApprovedApiKeyRequest }) {
  const styles = useStyles();
  const t = useTheme();
  const [copied, setCopied] = useState(false);
  return (
    <SheetScreen
      title="Clé générée"
      closeLabel="Fermer"
      footer={
        <View style={styles.footer}>
          <Button
            label={copied ? 'Copiée' : 'Copier la clé'}
            leadingIcon={copied ? <Check size={16} color={t.onAccent} /> : <Copy size={16} color={t.onAccent} />}
            onPress={() => {
              void copyToClipboard(issued.apiKey, 'Clé API').then(() => setCopied(true));
            }}
          />
          <Button variant="outline" label="Fermer" onPress={() => router.back()} style={styles.submit} />
        </View>
      }
    >
      <Text style={styles.title}>Clé générée pour {issued.requesterName}</Text>
      <Text style={styles.hint}>
        L’extension la récupérera automatiquement. Elle n’est affichée qu’une seule fois : copiez-la si vous devez la
        transmettre.
      </Text>
      <Text style={styles.key} selectable>
        {issued.apiKey}
      </Text>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  submit: { marginBottom: spacing.sm },
  footer: { gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: t.text },
  hint: { fontSize: 13, lineHeight: 19, color: t.textMuted },
  key: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.success,
    backgroundColor: t.surface,
    color: t.text,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
}));
