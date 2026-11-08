import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Search } from 'lucide-react-native';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { useInterAgencyActions } from './hooks/useInterAgencyActions';
import { useInterAgencyAgencies } from './hooks/useInterAgencyAgencies';

const COMMENT_MAX_LENGTH = 500;
const INTERNAL_REF_MAX_LENGTH = 80;

/**
 * Feuille « Marquer réalisée » : agences prévenues par e-mail (au moins une), avec le numéro de
 * commande inter-agence de chacune (obligatoire), et un commentaire facultatif. La date et l'heure
 * sont enregistrées par le back.
 */
export function InterAgencyDoneSheet() {
  const { reference, warehouse } = useLocalSearchParams<{ reference: string; warehouse: string }>();
  if (!reference || !warehouse) return null;
  return <DoneForm reference={reference} warehouse={warehouse} />;
}

function DoneForm({ reference, warehouse }: { reference: string; warehouse: string }) {
  const styles = useStyles();
  const t = useTheme();
  const agencies = useInterAgencyAgencies();
  const { toggle } = useInterAgencyActions(reference, warehouse);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = agencies.data ?? [];
    if (!needle) return list;
    return list.filter((agency) =>
      [agency.name, agency.code, agency.contactName ?? '', agency.email]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [agencies.data, query]);

  const entries = Object.entries(selected);
  const missingRef = entries.some(([, internalRef]) => !internalRef.trim());
  const canConfirm = entries.length > 0 && !missingRef && !toggle.isPending;

  const toggleAgency = (code: string) =>
    setSelected((previous) => {
      if (code in previous) {
        const next = { ...previous };
        delete next[code];
        return next;
      }
      return { ...previous, [code]: '' };
    });

  const confirm = () =>
    toggle.mutate(
      {
        field: 'interAgencyDone',
        value: true,
        agencies: entries.map(([code, internalRef]) => ({ code, internalRef: internalRef.trim() })),
        comment: comment.trim() || undefined,
      },
      { onSuccess: () => router.back() },
    );

  return (
    <SheetScreen
      title="Inter-agence réalisée"
      closeLabel="Annuler"
      closeDisabled={toggle.isPending}
      footer={
        <Button
          label={`Confirmer (${entries.length})`}
          disabled={!canConfirm}
          loading={toggle.isPending}
          onPress={confirm}
        />
      }
    >
      <Text style={styles.hint}>
        Chaque agence cochée reçoit un e-mail. Indiquez pour chacune son numéro de commande
        inter-agence.
      </Text>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Agence, contact, e-mail" />

      {agencies.isPending ? <ListSkeleton rows={4} height={56} /> : null}
      {agencies.error ? (
        <ErrorBanner
          error={agencies.error}
          fallback="Impossible de charger les agences"
          onRetry={() => void agencies.refetch()}
        />
      ) : null}
      {agencies.data && visible.length === 0 ? (
        <EmptyState icon={<Search size={24} color={t.textMuted} />} title="Aucune agence" />
      ) : null}

      {visible.map((agency) => {
        const checked = agency.code in selected;
        return (
          <View key={agency.code} style={[styles.agency, checked && styles.agencyChecked]}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => toggleAgency(agency.code)}
              style={styles.agencyRow}
            >
              <View style={[styles.box, checked && { backgroundColor: t.accent, borderColor: t.accent }]}>
                {checked ? <Check size={14} color={t.onAccent} strokeWidth={3} /> : null}
              </View>
              <View style={styles.agencyText}>
                <Text style={styles.agencyName}>
                  {agency.name}
                  <Text style={styles.agencyCode}> · {agency.code}</Text>
                </Text>
                <Text style={styles.agencyContact} numberOfLines={1}>
                  {agency.contactName ? `${agency.contactName} — ` : ''}
                  {agency.email}
                </Text>
              </View>
            </Pressable>
            {checked ? (
              <TextField
                label="N° de commande inter-agence"
                value={selected[agency.code] ?? ''}
                onChangeText={(value) => setSelected((previous) => ({ ...previous, [agency.code]: value }))}
                maxLength={INTERNAL_REF_MAX_LENGTH}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!toggle.isPending}
              />
            ) : null}
          </View>
        );
      })}

      <TextField
        label="Commentaire (facultatif)"
        value={comment}
        onChangeText={setComment}
        maxLength={COMMENT_MAX_LENGTH}
        multiline
        placeholder="Précision utile pour l'agence…"
        editable={!toggle.isPending}
      />
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  agency: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  agencyChecked: { borderColor: withAlpha(t.accent, 0.5) },
  agencyRow: { minHeight: hitTarget - 8, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  box: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: t.borderStrong,
  },
  agencyText: { flex: 1, gap: 1 },
  agencyName: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  agencyCode: { fontWeight: '500', color: t.textMuted },
  agencyContact: { fontSize: fontSize.xs, color: t.textMuted },
}));
