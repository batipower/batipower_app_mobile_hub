import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

const pad = (n: number) => String(n).padStart(2, '0');

type TimePickerSheetProps = {
  visible: boolean;
  title: string;
  /** "HH:mm". */
  value: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

/**
 * Sélecteur d'heure par pas de 5 minutes, présenté en `Modal` natif : évite une dépendance native
 * supplémentaire pour des horaires de support qui tombent toujours sur des multiples de 5.
 */
export function TimePickerSheet({ visible, title, value, onConfirm, onClose }: TimePickerSheetProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  // Réinitialise la sélection à chaque ouverture (ajusté pendant le rendu, sans effet).
  const [seed, setSeed] = useState<string | null>(null);
  const seedKey = visible ? value : null;
  if (seedKey !== seed) {
    setSeed(seedKey);
    if (seedKey !== null) {
      const [h, m] = seedKey.split(':').map(Number);
      setHour(Number.isFinite(h) ? (h as number) : 9);
      // Une valeur hors pas de 5 (saisie historique) est arrondie au pas le plus proche.
      setMinute(Number.isFinite(m) ? Math.min(55, Math.round((m as number) / 5) * 5) : 0);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose}>
            <Text style={styles.action}>Annuler</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              onConfirm(`${pad(hour)}:${pad(minute)}`);
              onClose();
            }}
          >
            <Text style={[styles.action, styles.confirm]}>OK</Text>
          </Pressable>
        </View>
        <Text style={styles.preview} accessibilityLabel={`Heure choisie ${pad(hour)} heures ${pad(minute)}`}>
          {pad(hour)}:{pad(minute)}
        </Text>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing['2xl'] }]}>
          <Text style={styles.label}>Heure</Text>
          <View style={styles.grid}>
            {HOURS.map((h) => (
              <Cell key={h} label={pad(h)} selected={h === hour} onPress={() => setHour(h)} />
            ))}
          </View>
          <Text style={styles.label}>Minutes</Text>
          <View style={styles.grid}>
            {MINUTES.map((m) => (
              <Cell key={m} label={pad(m)} selected={m === minute} onPress={() => setMinute(m)} />
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Cell({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.cell, selected && { backgroundColor: t.accent, borderColor: t.accent }]}
    >
      <Text style={[styles.cellText, selected && { color: t.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bgElevated },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.base, fontWeight: '700', color: t.text },
  action: { fontSize: fontSize.base, color: t.accentText },
  confirm: { fontWeight: '700' },
  preview: {
    textAlign: 'center',
    fontSize: 44,
    fontWeight: '800',
    color: t.text,
    paddingVertical: spacing.md,
    fontVariant: ['tabular-nums'],
  },
  body: { paddingHorizontal: spacing.xl, gap: spacing.md },
  label: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', color: t.textSubtle },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    width: 52,
    minHeight: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  cellText: { fontSize: fontSize.base, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] },
}));
