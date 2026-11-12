import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus, Trash2 } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { adminSupportHoursApi } from '@/api/adminPlatform';
import { Button, Card } from '@/components/ui';
import { ErrorBanner, ListSkeleton, errorMessage } from '@/features/preparation/components/ListState';
import { formatDateTime } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { SupportTimeRange, SupportWeeklySchedule } from '@/types/adminPlatform';

import { ADMIN_SUPPORT_HOURS_KEY } from '../queryKeys';
import { Notice } from '../shared/components/FormParts';
import { useSupportHoursConfig } from './hooks';
import { TimePickerSheet } from './TimePickerSheet';
import {
  DEFAULT_RANGE,
  MAX_RANGES_PER_DAY,
  MESSAGE_MAX_LENGTH,
  SUPPORT_DAYS,
  cloneSchedule,
  holidayDescription,
  sameHolidays,
  validateSchedule,
} from './supportHours';

type Editing = { day: string; index: number; field: 'start' | 'end' } | null;

/** Horaires du support client : fermeture exceptionnelle et planning hebdomadaire par plages. */
export function SupportHoursScreen() {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useSupportHoursConfig();

  const [weekly, setWeekly] = useState<SupportWeeklySchedule | null>(null);
  const [forceClosed, setForceClosed] = useState(false);
  const [message, setMessage] = useState('');
  const [openHolidays, setOpenHolidays] = useState<string[]>([]);
  const [editing, setEditing] = useState<Editing>(null);

  // Brouillon initialisé depuis la configuration serveur (et après chaque enregistrement) : ajusté
  // pendant le rendu, plutôt que dans un effet, quand la configuration reçue change.
  const [seed, setSeed] = useState<typeof data>(undefined);
  if (data && data !== seed) {
    setSeed(data);
    setWeekly(cloneSchedule(data.weekly));
    setForceClosed(data.forceClosed);
    setMessage(data.forceClosedMessage ?? '');
    setOpenHolidays([...(data.openHolidays ?? [])].sort());
  }

  const dirty = useMemo(() => {
    if (!data || !weekly) return false;
    return (
      JSON.stringify(cloneSchedule(data.weekly)) !== JSON.stringify(weekly) ||
      data.forceClosed !== forceClosed ||
      (data.forceClosedMessage ?? '') !== message.trim() ||
      !sameHolidays(data.openHolidays ?? [], openHolidays)
    );
  }, [data, weekly, forceClosed, message, openHolidays]);

  const mutation = useMutation({
    mutationFn: () =>
      adminSupportHoursApi.update({
        weekly: weekly ?? undefined,
        forceClosed,
        forceClosedMessage: message.trim() || null,
        openHolidays,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(ADMIN_SUPPORT_HOURS_KEY, result);
      toast.success('Horaires du support enregistrés');
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'enregistrement")),
  });

  const updateDay = (key: string, ranges: SupportTimeRange[]) =>
    setWeekly((prev) => (prev ? { ...prev, [key]: ranges } : prev));

  const toggleHoliday = (date: string, open: boolean) =>
    setOpenHolidays((prev) => (open ? [...new Set([...prev, date])].sort() : prev.filter((d) => d !== date)));

  const save = () => {
    if (!weekly) return;
    const problem = validateSchedule(weekly);
    if (problem) {
      toast.error(problem);
      return;
    }
    mutation.mutate();
  };

  const copyMondayToWeekdays = () => {
    if (!weekly) return;
    const monday = weekly['1'] ?? [];
    const next = { ...weekly };
    for (const key of ['2', '3', '4', '5']) next[key] = monday.map((r) => ({ ...r }));
    setWeekly(next);
    toast.success('Horaires du lundi copiés sur mardi à vendredi (à enregistrer)');
  };

  const editedValue = editing && weekly ? (weekly[editing.day]?.[editing.index]?.[editing.field] ?? '09:00') : '09:00';
  const editedDay = editing ? SUPPORT_DAYS.find((d) => d.key === editing.day)?.label : '';

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Planning d’ouverture du support client, utilisé pour afficher « ouvert » ou « hors horaires » sur le site.
        </Text>
        {isLoading || !weekly ? (
          error ? (
            <ErrorBanner error={error} fallback="Impossible de charger les horaires" onRetry={() => void refetch()} />
          ) : (
            <ListSkeleton rows={3} height={110} />
          )
        ) : (
          <>
            <Card contentStyle={styles.cardContent}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.cardTitle}>Forcer la fermeture</Text>
                  <Text style={styles.hint}>
                    Ferme le support quel que soit le planning (congés, jour férié, incident). Les clients peuvent
                    toujours écrire ; la mention hors horaires s’affiche.
                  </Text>
                </View>
                <Switch
                  value={forceClosed}
                  onValueChange={setForceClosed}
                  disabled={mutation.isPending}
                  trackColor={{ true: t.warning, false: t.surfaceStrong }}
                  accessibilityLabel="Forcer la fermeture"
                />
              </View>
              {forceClosed ? (
                <View style={styles.messageBlock}>
                  <Text style={styles.label}>Message personnalisé (facultatif)</Text>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    maxLength={MESSAGE_MAX_LENGTH}
                    multiline
                    placeholder="Ex. : Nous sommes en congés du 24 au 31 décembre, réponse dès notre retour."
                    placeholderTextColor={t.textFaint}
                    style={styles.input}
                    accessibilityLabel="Message de fermeture"
                  />
                  <Text style={styles.counter}>
                    {message.length}/{MESSAGE_MAX_LENGTH}
                  </Text>
                </View>
              ) : null}
            </Card>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Planning hebdomadaire</Text>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={copyMondayToWeekdays} style={styles.copy}>
                <Copy size={14} color={t.accentText} />
                <Text style={styles.copyText}>Lundi → mardi à vendredi</Text>
              </Pressable>
            </View>

            {SUPPORT_DAYS.map(({ key, label }) => {
              const ranges = weekly[key] ?? [];
              return (
                <Card key={key} contentStyle={styles.cardContent}>
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.cardTitle}>{label}</Text>
                      {ranges.length === 0 ? <Text style={styles.hint}>Fermé</Text> : null}
                    </View>
                    <Switch
                      value={ranges.length > 0}
                      onValueChange={(open) => updateDay(key, open ? [{ ...DEFAULT_RANGE }] : [])}
                      trackColor={{ true: t.accent, false: t.surfaceStrong }}
                      accessibilityLabel={`${label} ouvert`}
                    />
                  </View>
                  {ranges.map((range, index) => (
                    <View key={index} style={styles.rangeRow}>
                      <TimeButton
                        label={`${label} début de plage ${index + 1}`}
                        value={range.start}
                        onPress={() => setEditing({ day: key, index, field: 'start' })}
                      />
                      <Text style={styles.sep}>à</Text>
                      <TimeButton
                        label={`${label} fin de plage ${index + 1}`}
                        value={range.end}
                        onPress={() => setEditing({ day: key, index, field: 'end' })}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Supprimer la plage ${index + 1} du ${label.toLowerCase()}`}
                        hitSlop={8}
                        onPress={() => updateDay(key, ranges.filter((_, i) => i !== index))}
                        style={styles.trash}
                      >
                        <Trash2 size={18} color={t.danger} />
                      </Pressable>
                    </View>
                  ))}
                  {ranges.length > 0 && ranges.length < MAX_RANGES_PER_DAY ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => updateDay(key, [...ranges, { start: '14:00', end: '18:00' }])}
                      style={styles.add}
                    >
                      <Plus size={16} color={t.accentText} />
                      <Text style={styles.addText}>Ajouter une plage</Text>
                    </Pressable>
                  ) : null}
                </Card>
              );
            })}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Jours fériés</Text>
            </View>
            <Text style={styles.hint}>
              Le support est fermé les jours fériés, même si le planning ouvre ce jour de la semaine. Activez un férié
              pour l’ouvrir exceptionnellement, avec les horaires du jour de la semaine correspondant.
            </Text>
            {(data?.upcomingHolidays ?? []).length === 0 ? (
              <Text style={styles.hint}>Aucun jour férié à venir.</Text>
            ) : (
              (data?.upcomingHolidays ?? []).map((holiday) => {
                const open = openHolidays.includes(holiday.date);
                return (
                  <Card key={holiday.date} contentStyle={styles.cardContent}>
                    <View style={styles.row}>
                      <View style={styles.rowText}>
                        <Text style={styles.cardTitle}>{holiday.name}</Text>
                        <Text style={styles.hint}>{holidayDescription(holiday, open, weekly)}</Text>
                      </View>
                      <Switch
                        value={open}
                        onValueChange={(next) => toggleHoliday(holiday.date, next)}
                        disabled={mutation.isPending}
                        trackColor={{ true: t.accent, false: t.surfaceStrong }}
                        accessibilityLabel={`${holiday.name} ouvert exceptionnellement`}
                      />
                    </View>
                  </Card>
                );
              })
            )}

            <Notice>
              Fuseau : {data?.timezone ?? 'Europe/Paris'}. Quatre plages maximum par jour, sans chevauchement.
            </Notice>
            <Text style={styles.hint}>
              {data?.updatedAt
                ? `Dernière modification le ${formatDateTime(data.updatedAt)}${data.updatedBy ? ` par ${data.updatedBy}` : ''}.`
                : 'Planning par défaut (jamais modifié).'}
            </Text>
            <Button label="Enregistrer" loading={mutation.isPending} disabled={!dirty} onPress={save} />
          </>
        )}
      </ScrollView>
      <TimePickerSheet
        visible={!!editing}
        title={editing ? `${editedDay} · ${editing.field === 'start' ? 'Début' : 'Fin'}` : ''}
        value={editedValue}
        onClose={() => setEditing(null)}
        onConfirm={(value) => {
          if (!editing || !weekly) return;
          const ranges = (weekly[editing.day] ?? []).map((r, i) =>
            i === editing.index ? { ...r, [editing.field]: value } : r,
          );
          updateDay(editing.day, ranges);
        }}
      />
    </>
  );
}

function TimeButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      onPress={onPress}
      style={styles.time}
    >
      <Text style={styles.timeText}>{value}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, paddingBottom: 160, gap: spacing.md },
  intro: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  cardContent: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  messageBlock: { gap: spacing.xs },
  label: { fontSize: fontSize.xs, fontWeight: '700', color: t.textSubtle },
  input: {
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    color: t.text,
    fontSize: fontSize.sm,
    textAlignVertical: 'top',
  },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: t.textSubtle },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', color: t.textSubtle },
  copy: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  copyText: { fontSize: fontSize.xs, color: t.accentText },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  time: {
    minWidth: 84,
    minHeight: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  timeText: { fontSize: fontSize.base, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] },
  sep: { fontSize: fontSize.sm, color: t.textMuted },
  trash: { marginLeft: 'auto', width: hitTarget, height: hitTarget, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: hitTarget - 8 },
  addText: { fontSize: fontSize.sm, color: t.accentText, fontWeight: '600' },
}));
