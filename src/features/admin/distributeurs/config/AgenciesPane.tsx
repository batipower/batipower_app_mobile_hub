import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react-native';

import { Button, TextField } from '@/components/ui';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { AdminWarehouseConfig } from '@/types/adminPartners';

import { Notice } from '../../shared/components/FormParts';
import { ConfigActions } from './ConfigActions';
import { useSaveWarehouseConfig } from './useWarehouseConfig';

type Agency = { code: string; name: string };

const toAgencies = (list: { code: string; name: string }[]): Agency[] => list.map((a) => ({ code: a.code, name: a.name }));
const sameList = (a: Agency[], b: Agency[]) =>
  a.length === b.length && a.every((x, i) => x.code === b[i]?.code && x.name === b[i]?.name);

/** Agences proches (ordre = priorité). */
export function AgenciesPane({
  distributorId,
  warehouseId,
  config,
}: {
  distributorId: string;
  warehouseId: string;
  config: AdminWarehouseConfig;
}) {
  const styles = useStyles();
  const t = useTheme();
  const saved = toAgencies([...config.agencies.nearby].sort((a, b) => a.priority - b.priority));
  const [list, setList] = useState<Agency[]>(saved);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const { save, isSaving, confirmReset } = useSaveWarehouseConfig(distributorId, warehouseId);

  const duplicate = (c: string) => list.some((a) => a.code.toLowerCase() === c.trim().toLowerCase());
  const canAdd = code.trim() !== '' && name.trim() !== '' && !duplicate(code);
  const move = (index: number, delta: number) =>
    setList((prev) => {
      const next = [...prev];
      const target = index + delta;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return next;
    });

  return (
    <View style={styles.pane}>
      <Notice>
        Agences eBatPro proches de l’entrepôt, par ordre de priorité. {list.length === 0 ? 'Aucune agence : le flux ne cherchera pas de relais.' : ''}
      </Notice>
      {list.map((agency, index) => (
        <View key={agency.code} style={styles.row}>
          <View style={styles.text}>
            <Text style={styles.name}>
              {index + 1}. {agency.name}
            </Text>
            <Text style={styles.code}>{agency.code}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Monter" disabled={index === 0} hitSlop={8} onPress={() => move(index, -1)}>
            <ArrowUp size={18} color={index === 0 ? t.textFaint : t.accentText} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Descendre" disabled={index === list.length - 1} hitSlop={8} onPress={() => move(index, 1)}>
            <ArrowDown size={18} color={index === list.length - 1 ? t.textFaint : t.accentText} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${agency.name}`} hitSlop={8} onPress={() => setList((p) => p.filter((a) => a.code !== agency.code))}>
            <Trash2 size={18} color={t.danger} />
          </Pressable>
        </View>
      ))}
      <View style={styles.add}>
        <TextField label="Code agence" value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} error={code && duplicate(code) ? 'Code déjà présent.' : undefined} />
        <TextField label="Nom de l'agence" value={name} onChangeText={setName} />
        <Button
          label="Ajouter l'agence"
          variant="outline"
          disabled={!canAdd}
          onPress={() => {
            setList((p) => [...p, { code: code.trim(), name: name.trim() }]);
            setCode('');
            setName('');
          }}
        />
      </View>
      <ConfigActions
        dirty={!sameList(list, saved)}
        valid
        saving={isSaving}
        customized={config.agencies.customized}
        onSave={() => save({ agencies: list })}
        onReset={() => confirmReset('Agences', { agencies: null })}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  pane: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  text: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  code: { fontSize: fontSize.xs, color: t.textMuted },
  add: { gap: spacing.md, marginTop: spacing.sm },
}));
