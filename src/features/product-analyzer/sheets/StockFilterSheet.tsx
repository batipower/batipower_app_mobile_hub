import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { TextField } from '@/components/ui';
import { LinkRow } from '@/features/pricing/components/FilterControls';
import { formatInteger } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import type { StagingFilters, StockReadiness } from '@/types/hubProductAnalyzer';

import { patchPaFilters, usePaFilters } from '../filtersStore';
import { useDistributors } from '../hooks/useDistributors';
import { SR_CFG, SR_FILTER_ORDER } from '../lib/constants';
import { stockFilterCount } from '../lib/stock-filter';
import { openPaPicker } from '../navigation';
import { useStagingList } from '../hooks/useStagingList';

type Choice = { key: string; title: string; desc?: string; color?: string; patch: Partial<StagingFilters> };

const CHOICES: Choice[] = [
  { key: 'all', title: 'Tous', patch: { inStock: false, stockReadiness: '' } },
  {
    key: 'any',
    title: 'Stock quelque part (toutes agences)',
    desc: 'Au moins une unité en stock, entrepôt ou agence confondus.',
    patch: { inStock: true, stockReadiness: '' },
  },
  ...SR_FILTER_ORDER.map((sr: StockReadiness): Choice => ({
    key: sr,
    title: SR_CFG[sr].label,
    desc: SR_CFG[sr].desc,
    color: SR_CFG[sr].color,
    patch: { inStock: false, stockReadiness: sr },
  })),
];

/**
 * Filtre de stock, comme sur le web : fournisseurs dont on regarde le stock, un seul niveau de
 * disponibilité à la fois (exclusif de « stock quelque part ») et une quantité minimale.
 */
export function StockFilterSheet() {
  const styles = useStyles();
  const t = useTheme();
  const f = usePaFilters();
  const list = useStagingList(f);
  const { byId } = useDistributors();
  const [minText, setMinText] = useState(f.minStockWh);
  const count = stockFilterCount(f);
  const scoped = f.stockDistributorIds.length > 0;
  const current = f.stockReadiness !== '' ? f.stockReadiness : f.inStock ? 'any' : 'all';
  const names = f.stockDistributorIds.map((id) => byId(id)?.name ?? id);
  const total = list.total;

  const reset = () => {
    patchPaFilters({ inStock: false, stockReadiness: '', minStockWh: '', stockDistributorIds: [] });
    setMinText('');
  };

  return (
    <SheetScreen
      title={count > 0 ? `Stock (${count})` : 'Stock'}
      leading={{ label: 'Réinitialiser', onPress: reset, disabled: count === 0 }}
      closeLabel={total === null ? 'OK' : `${formatInteger(total)} résultat${total > 1 ? 's' : ''}`}
    >
      <Text style={styles.intro}>
        Où se trouve le stock ? Le classement part de l’entrepôt principal puis s’élargit.
      </Text>

      <SheetSection title="Chez quel(s) fournisseur(s) ?">
        <LinkRow
          label="Fournisseurs"
          value={
            names.length === 0 ? 'Entrepôt principal' : names.length === 1 ? names[0]! : `${names.length} sélectionnés`
          }
          onPress={() => openPaPicker('stock-suppliers')}
        />
        <Text style={styles.hint}>
          {scoped
            ? 'Les options ci-dessous portent sur le stock de l’offre de ces fournisseurs : au moins l’un d’eux doit toutes les remplir.'
            : 'Sans sélection, le stock est celui de l’entrepôt principal de l’analyse.'}
        </Text>
      </SheetSection>

      <SheetSection title="Disponibilité">
        <View accessibilityRole="radiogroup" style={styles.choices}>
          {CHOICES.map((c, i) => {
            const checked = current === c.key;
            return (
              <View key={c.key}>
                {i === 2 ? <Text style={styles.group}>Où est le stock (exclusif)</Text> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  onPress={() => {
                    void Haptics.selectionAsync().catch(() => undefined);
                    patchPaFilters(c.patch);
                  }}
                  style={[
                    styles.choice,
                    checked && { borderColor: t.accent, backgroundColor: withAlpha(t.accent, 0.1) },
                  ]}
                >
                  <View style={[styles.radio, checked && { borderColor: t.accent }]}>
                    {checked ? <View style={[styles.radioDot, { backgroundColor: t.accent }]} /> : null}
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.titleRow}>
                      {c.color ? <View style={[styles.dot, { backgroundColor: c.color }]} /> : null}
                      <Text style={styles.title}>{c.title}</Text>
                    </View>
                    {c.desc ? <Text style={styles.desc}>{c.desc}</Text> : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      </SheetSection>

      <SheetSection title="Quantité minimale">
        <TextField
          label={scoped ? 'En entrepôt du fournisseur' : 'En entrepôt principal'}
          value={minText}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, '');
            setMinText(digits);
            patchPaFilters({ minStockWh: digits });
          }}
          placeholder="ex. 10"
          keyboardType="number-pad"
          returnKeyType="done"
        />
        <Text style={styles.hint}>unités ou plus</Text>
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  intro: { fontSize: fontSize.sm, color: t.textMuted, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  hint: { fontSize: fontSize.xs, color: t.textMuted },
  choices: { gap: spacing.xs },
  group: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: t.textSubtle,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  choice: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radio: {
    width: 18,
    height: 18,
    marginTop: 2,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  desc: { fontSize: fontSize.xs, color: t.textMuted, marginTop: 1 },
}));
