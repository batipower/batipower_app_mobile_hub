import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminApiKeysApi } from '@/api/adminPlatform';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { errorMessage } from '@/features/preparation/components/ListState';
import { makeStyles, spacing } from '@/theme';
import {
  API_KEY_WAREHOUSES,
  formatApiKeyWarehouse,
  previewApiKey,
  type AggregatedStatsByApiKey,
  type ApiKeyConfig,
  type ApiKeyWarehouse,
} from '@/types/adminPlatform';

import { SelectField, ToggleRow } from '../../shared/components/FormParts';
import { useApiKeyConfigs, useApiKeyStats } from '../hooks';
import { UNCONFIGURED_NAME, isApiKeyWarehouse } from './helpers';
import { useInvalidateApiKeys } from './useApiKeyActions';

type Mode = 'create' | 'edit' | 'certify';

/**
 * Feuille unique de création, modification et certification d'une clé API :
 * `mode=create` | `edit` (+ `apiKey`) | `certify` (+ `apiKey`, clé vue dans les statistiques).
 */
export function ApiKeyFormSheet() {
  const { mode = 'create', apiKey } = useLocalSearchParams<{ mode?: Mode; apiKey?: string }>();
  const configs = useApiKeyConfigs();
  const stats = useApiKeyStats();

  if (mode === 'edit') {
    const config = configs.data?.find((c) => c.apiKey === apiKey);
    if (!config) return <SheetScreen title="Modifier la clé"><Text>Chargement…</Text></SheetScreen>;
    return <Form mode="edit" config={config} />;
  }
  if (mode === 'certify') {
    const stat = stats.data?.find((s) => s.apiKey === apiKey);
    if (!stat) return <SheetScreen title="Certifier la clé"><Text>Chargement…</Text></SheetScreen>;
    return <Form mode="certify" stat={stat} />;
  }
  return <Form mode="create" />;
}

type FormProps =
  | { mode: 'create' }
  | { mode: 'edit'; config: ApiKeyConfig }
  | { mode: 'certify'; stat: AggregatedStatsByApiKey };

function Form(props: FormProps) {
  const styles = useStyles();
  const invalidate = useInvalidateApiKeys();
  const config = props.mode === 'edit' ? props.config : undefined;
  const stat = props.mode === 'certify' ? props.stat : undefined;

  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState(
    config?.name ?? (stat?.name && stat.name !== UNCONFIGURED_NAME ? stat.name : ''),
  );
  const initialWarehouse = config?.warehouse ?? stat?.warehouse;
  const [warehouse, setWarehouse] = useState<ApiKeyWarehouse>(
    isApiKeyWarehouse(initialWarehouse) ? initialWarehouse : 'QG_BATIPOWER',
  );
  const [description, setDescription] = useState(config?.description ?? '');
  const [isActive, setIsActive] = useState(config?.isActive ?? true);

  const mutation = useMutation({
    mutationFn: () => {
      const base = { name: name.trim(), warehouse, description: description.trim() };
      if (config) {
        return adminApiKeysApi.updateConfig(config.apiKey, { ...base, isActive });
      }
      return adminApiKeysApi.createConfig({
        apiKey: stat ? stat.apiKey : apiKey.trim(),
        name: base.name,
        warehouse,
        description: base.description || undefined,
      });
    },
    onSuccess: async () => {
      toast.success(config ? 'Clé API mise à jour' : stat ? 'Clé API certifiée' : 'Clé API créée');
      await invalidate();
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur lors de l’enregistrement')),
  });

  const valid = !!name.trim() && (props.mode !== 'create' || !!apiKey.trim());
  const title = config ? 'Modifier la clé' : stat ? 'Certifier la clé' : 'Nouvelle clé';

  return (
    <SheetScreen
      title={title}
      closeLabel="Annuler"
      closeDisabled={mutation.isPending}
      footer={
        <Button label="Enregistrer" loading={mutation.isPending} disabled={!valid} onPress={() => mutation.mutate()} style={styles.submit} />
      }
    >
      {config ? (
        <ReadOnlyKey label="Clé API" value={previewApiKey(config.apiKey, 28)} hint="La valeur de la clé reste inchangée." />
      ) : stat ? (
        <>
          <ReadOnlyKey label="Clé API" value={stat.apiKey} />
          <Text style={styles.hint}>
            Cette clé a déjà été utilisée ({stat.totalCalls.toLocaleString('fr-FR')} appels sur {stat.uniqueRoutes} routes,
            entrepôt détecté : {formatApiKeyWarehouse(stat.warehouse)}). Attribuez-lui un nom et un entrepôt pour la gérer.
          </Text>
        </>
      ) : (
        <TextField
          label="Clé API"
          value={apiKey}
          onChangeText={setApiKey}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Valeur de la clé"
        />
      )}
      <TextField label="Nom" value={name} onChangeText={setName} placeholder="Scraper Nancy" />
      <SelectField
        label="Entrepôt"
        valueLabel={formatApiKeyWarehouse(warehouse)}
        searchable={false}
        options={API_KEY_WAREHOUSES.map((w) => ({ value: w, label: formatApiKeyWarehouse(w) }))}
        selected={[warehouse]}
        onToggle={(w) => w && setWarehouse(w as ApiKeyWarehouse)}
      />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline />
      {config ? <ToggleRow label="Clé active" value={isActive} onValueChange={setIsActive} /> : null}
    </SheetScreen>
  );
}

function ReadOnlyKey({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.readOnly}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.key} selectable>
        {value}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  submit: { marginBottom: spacing.sm },
  readOnly: { gap: spacing.xs },
  label: { fontSize: 12, fontWeight: '700', color: t.textSubtle, textTransform: 'uppercase' },
  key: {
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    color: t.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  hint: { fontSize: 12, lineHeight: 17, color: t.textMuted },
}));
