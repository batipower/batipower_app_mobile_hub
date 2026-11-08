import { Pressable, Text, View } from 'react-native';
import { EllipsisVertical, Handshake, Rocket, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

import { useBulkTask } from '../bulkTaskStore';
import { clearSelection, selectMany, useSelection } from '../selectionStore';
import { openPaNego, openPaPicker } from '../navigation';
import type { StagingItem } from '@/types/hubProductAnalyzer';

import { BulkProgress } from './BulkProgress';

/**
 * Barre d'actions du mode sélection, ancrée en bas : compteur, « tout sélectionner » (éléments
 * chargés), puis Négocier / Lancer en accès direct et les autres actions groupées dans « Actions ».
 */
export function SelectionBar({ loadedItems }: { loadedItems: StagingItem[] }) {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const selection = useSelection();
  const task = useBulkTask();
  const count = selection.size;
  if (count === 0 && !task) return null;

  const allLoadedSelected = loadedItems.length > 0 && loadedItems.every((it) => selection.has(it.uuid));
  const busy = task !== null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: insets.bottom + spacing.sm }]}>
      <BulkProgress />
      {count > 0 ? (
        <View style={styles.bar}>
          <View style={styles.top}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quitter la sélection"
              hitSlop={10}
              onPress={clearSelection}
              style={styles.close}
            >
              <X size={18} color={t.textMuted} />
            </Pressable>
            <Text style={styles.count}>
              {count} sélectionné{count > 1 ? 's' : ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => (allLoadedSelected ? clearSelection() : selectMany(loadedItems))}
            >
              <Text style={styles.link}>
                {allLoadedSelected ? 'Tout désélectionner' : `Tout sélectionner (${loadedItems.length})`}
              </Text>
            </Pressable>
          </View>
          <View style={styles.actions}>
            <Button
              label="Négocier"
              disabled={busy}
              leadingIcon={<Handshake size={16} color={t.onAccent} />}
              onPress={() => openPaNego('selection')}
              style={styles.flex}
            />
            <Button
              label="Lancer"
              variant="outline"
              disabled={busy}
              leadingIcon={<Rocket size={16} color={t.text} />}
              onPress={() => openPaPicker('bulk-launch')}
              style={styles.flex}
            />
            <Button
              label="Actions"
              variant="secondary"
              disabled={busy}
              leadingIcon={<EllipsisVertical size={16} color={t.text} />}
              onPress={() => openPaPicker('bulk-actions')}
              style={styles.flex}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  bar: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: t.bgElevated,
    borderWidth: 1,
    borderColor: t.border,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  count: { flex: 1, fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  link: { fontSize: fontSize.xs, fontWeight: '700', color: t.accentText },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
}));
