import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { ACCESSORY_REASON_LABEL, accessoriesOf } from '../../domain/model';
import { useSyncedSelection } from '../../hooks/useSyncedSelection';
import { RefreshBar } from '../RefreshBar';
import { useStudio } from '../StudioContext';

/** Onglet Associés : accessoires proposés à écrire sur PrestaShop. */
export function RelatedTab() {
  const styles = useStyles();
  const t = useTheme();
  const { draft, blocks } = useStudio();
  const items = accessoriesOf(draft);
  const { selected, toggle } = useSyncedSelection(
    items.filter((item) => item.selected).map((item) => item.reference),
  );
  const locked = blocks.saveRelated.isPending || blocks.refreshRelated.isPending;

  return (
    <View style={styles.root}>
      <RefreshBar
        pending={blocks.refreshRelated.isPending}
        disabled={locked}
        onRefresh={() => blocks.refreshRelated.mutate()}
      >
        Cochez les accessoires à écrire sur PrestaShop. Les associations existantes non listées sont
        conservées.
      </RefreshBar>

      {items.length === 0 ? <Text style={styles.empty}>Aucun produit associé proposé.</Text> : null}

      {items.map((item) => {
        const checked = selected.has(item.reference);
        return (
          <Pressable
            key={item.reference}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled: locked }}
            disabled={locked}
            onPress={() => toggle(item.reference)}
            style={[
              styles.item,
              checked && {
                borderColor: withAlpha(t.accent, 0.5),
                backgroundColor: withAlpha(t.accent, 0.08),
              },
            ]}
          >
            <View
              style={[styles.box, checked && { backgroundColor: t.accent, borderColor: t.accent }]}
            >
              {checked ? <Check size={13} color={t.onAccent} strokeWidth={3} /> : null}
            </View>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="contain" />
            ) : (
              <View style={styles.thumb} />
            )}
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name || item.reference}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {item.reference} · {ACCESSORY_REASON_LABEL[item.reason] ?? item.reason}
              </Text>
            </View>
          </Pressable>
        );
      })}

      {items.length > 0 ? (
        <Button
          label="Enregistrer la sélection"
          loading={blocks.saveRelated.isPending}
          disabled={locked}
          onPress={() => blocks.saveRelated.mutate([...selected])}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  flex: { flex: 1 },
  empty: { paddingVertical: spacing.xl, textAlign: 'center', fontSize: fontSize.xs, color: t.textSubtle },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  box: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm + 1,
    borderWidth: 1.5,
    borderColor: t.borderStrong,
  },
  thumb: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: '#fff' },
  name: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  sub: { fontSize: fontSize.xs, color: t.textMuted },
}));
