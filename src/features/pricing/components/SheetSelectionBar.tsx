import { Pressable, Text, View } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { HubPricingRow } from '@/types/hubPricing';

import { openPricingLaunchSheets } from '../navigation';
import {
  clearSheetSelection,
  isSheetSelectable,
  selectManySheets,
  useSheetSelection,
} from '../sheetSelectionStore';

/**
 * Barre d'actions du mode sélection de la liste Pricing, ancrée en bas : compteur, « tout
 * sélectionner » (produits non déployés déjà chargés) et lancement des fiches produit.
 */
export function SheetSelectionBar({ loadedRows }: { loadedRows: HubPricingRow[] }) {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const selection = useSheetSelection();
  const count = selection.size;
  if (count === 0) return null;

  const selectable = loadedRows.filter(isSheetSelectable);
  const allSelected = selectable.length > 0 && selectable.every((row) => selection.has(row.reference));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.bar}>
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitter la sélection"
            hitSlop={10}
            onPress={clearSheetSelection}
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
            onPress={() => (allSelected ? clearSheetSelection() : selectManySheets(selectable))}
          >
            <Text style={styles.link}>
              {allSelected ? 'Tout désélectionner' : `Tout sélectionner (${selectable.length})`}
            </Text>
          </Pressable>
        </View>
        <Button
          label={`Lancer les fiches produit (${count})`}
          leadingIcon={<Sparkles size={16} color={t.onAccent} />}
          onPress={openPricingLaunchSheets}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
}));
