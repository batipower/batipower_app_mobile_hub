import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowDown, ArrowUp, Check } from 'lucide-react-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { DistributorLogo } from '@/features/admin/distributeurs/components';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

import {
  countActiveBrandMarginFilters,
  patchBrandMarginFilters,
  resetBrandMarginFilters,
  toggleBrandMarginWarehouse,
  useBrandMarginFilters,
} from './filtersStore';
import { useBrandMarginRange } from './hooks/useBrandMarginRange';
import { useBrandMarginSubsidiaries } from './hooks/useBrandMarginSubsidiaries';
import { formatIsoDate } from './lib/display';
import {
  ORIGIN_LABELS,
  PERIOD_PRESETS,
  isIsoDate,
  parseYmd,
  presetRange,
  ymd,
  type SortKey,
} from './lib/model';

const ORIGIN_OPTIONS = Object.entries(ORIGIN_LABELS)
  .filter(([origin]) => origin !== 'UNKNOWN')
  .map(([value, label]) => ({ value, label }));

const SORT_OPTIONS: readonly { key: SortKey; label: string; defaultDesc: boolean }[] = [
  { key: 'caHT', label: "Chiffre d'affaires", defaultDesc: true },
  { key: 'margin', label: 'Marge', defaultDesc: true },
  { key: 'rate', label: 'Taux de marge', defaultDesc: true },
  { key: 'siteRate', label: 'Taux de marge site', defaultDesc: true },
  { key: 'savImpact', label: 'Impact SAV', defaultDesc: true },
  { key: 'brand', label: 'Nom de la marque', defaultDesc: false },
];

/** Ligne « libellé + sélecteur de date natif » d'une borne de la période personnalisée. */
function DateRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <DateTimePicker
        accessibilityLabel={`${label} : ${formatIsoDate(value)}`}
        value={parseYmd(value)}
        mode="date"
        display="compact"
        locale="fr-FR"
        maximumDate={new Date()}
        onChange={(_event, date) => {
          if (date) onChange(ymd(date));
        }}
      />
    </View>
  );
}

/** Filtres de la marge par marque : période, filiales, marketplace et tri de la liste. */
export function BrandMarginFiltersSheet() {
  const styles = useStyles();
  const t = useTheme();
  const filters = useBrandMarginFilters();
  const subsidiaries = useBrandMarginSubsidiaries();
  const { error: periodProblem } = useBrandMarginRange(filters);
  // Dates affichées par les sélecteurs : celles saisies, sinon le mois en cours.
  const customFrom = isIsoDate(filters.from) ? filters.from : presetRange('month').from;
  const customTo = isIsoDate(filters.to) ? filters.to : presetRange('month').to;

  return (
    <SheetScreen
      title="Filtres"
      leading={{
        label: 'Réinitialiser',
        disabled: countActiveBrandMarginFilters(filters) === 0,
        onPress: resetBrandMarginFilters,
      }}
    >
      <SheetSection title="Période">
        <View>
          {PERIOD_PRESETS.map((preset) => {
            const selected = filters.period === preset.id;
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() =>
                  patchBrandMarginFilters(
                    preset.id === 'custom'
                      ? { period: 'custom', from: customFrom, to: customTo }
                      : { period: preset.id },
                  )
                }
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
              >
                <Text style={styles.label}>{preset.label}</Text>
                {selected ? <Check size={18} color={t.accentText} /> : null}
              </Pressable>
            );
          })}
        </View>
        {filters.period === 'custom' ? (
          <View>
            <DateRow
              label="Du"
              value={customFrom}
              onChange={(from) => patchBrandMarginFilters({ from, to: customTo })}
            />
            <DateRow
              label="Au"
              value={customTo}
              onChange={(to) => patchBrandMarginFilters({ to, from: customFrom })}
            />
            {periodProblem ? <Text style={styles.error}>{periodProblem}</Text> : null}
          </View>
        ) : null}
      </SheetSection>

      {!subsidiaries.failed && subsidiaries.groups.length > 0 ? (
        <SheetSection title="Filiales (entrepôts)">
          <View>
            {subsidiaries.groups.map((group) => {
              const selected = filters.warehouses.includes(group.code);
              return (
                <Pressable
                  key={group.code}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleBrandMarginWarehouse(group.code)}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
                >
                  <View style={styles.logos}>
                    {group.members.slice(0, 3).map((member) => (
                      <DistributorLogo
                        key={member.id}
                        logo={member.logo}
                        label={member.name}
                        size={28}
                      />
                    ))}
                  </View>
                  <Text style={styles.label} numberOfLines={2}>
                    {group.label}
                  </Text>
                  {selected ? <Check size={18} color={t.accentText} /> : null}
                </Pressable>
              );
            })}
            {filters.warehouses.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => patchBrandMarginFilters({ warehouses: [] })}
                style={styles.row}
              >
                <Text style={[styles.label, { color: t.accentText }]}>Toutes les filiales</Text>
              </Pressable>
            ) : null}
          </View>
        </SheetSection>
      ) : null}

      <SheetSection title="Marketplace">
        <View>
          {[{ value: null, label: 'Toutes' }, ...ORIGIN_OPTIONS].map((option) => {
            const selected = filters.origin === option.value;
            return (
              <Pressable
                key={option.value ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => patchBrandMarginFilters({ origin: option.value })}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
              >
                <Text style={styles.label}>{option.label}</Text>
                {selected ? <Check size={18} color={t.accentText} /> : null}
              </Pressable>
            );
          })}
        </View>
      </SheetSection>

      <SheetSection title="Tri de la liste">
        <View>
          {SORT_OPTIONS.map((option) => {
            const selected = filters.sort === option.key;
            const Arrow = filters.desc ? ArrowDown : ArrowUp;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityHint={selected ? "Appuyer pour inverser l'ordre" : undefined}
                onPress={() =>
                  patchBrandMarginFilters(
                    selected
                      ? { desc: !filters.desc }
                      : { sort: option.key, desc: option.defaultDesc },
                  )
                }
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }]}
              >
                <Text style={styles.label}>{option.label}</Text>
                {selected ? <Arrow size={18} color={t.accentText} /> : null}
              </Pressable>
            );
          })}
        </View>
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  label: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  logos: { flexDirection: 'row', gap: spacing.xs },
  error: { paddingTop: spacing.sm, fontSize: fontSize.xs, color: t.danger },
}));
