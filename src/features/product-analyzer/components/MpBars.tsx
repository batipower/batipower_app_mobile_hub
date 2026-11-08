import { Text, View } from 'react-native';

import { MP_FLAGS, MP_KEYS } from '@/features/product-analyzer/lib/constants';
import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, useTheme } from '@/theme';
import type { StagingMpSales } from '@/types/hubProductAnalyzer';

const BAR_HEIGHT = 26;

/** Mini-histogramme des ventes Amazon sur 30 jours par pays (unités), avec le total. */
export function MpBars({
  sales,
  asin,
}: {
  sales?: Record<string, StagingMpSales> | null;
  asin: string | null;
}) {
  const styles = useStyles();
  const t = useTheme();
  if (!asin) return null;

  const units = (k: string) => sales?.[k]?.approximate30DayUnitsSold ?? null;
  const hasData = !!sales && MP_KEYS.some((k) => units(k) != null);
  const max = Math.max(1, ...MP_KEYS.map((k) => units(k) ?? 0));
  const total = hasData ? MP_KEYS.reduce((sum, k) => sum + (units(k) ?? 0), 0) : null;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={
        hasData
          ? `Ventes Amazon 30 jours : ${MP_KEYS.map((k) => `${k} ${units(k) ?? 0}`).join(', ')}`
          : 'Ventes Amazon non disponibles'
      }
    >
      <View style={styles.bars}>
        {MP_KEYS.map((k) => {
          const u = units(k);
          const height = u == null ? 2 : Math.max(3, (u / max) * BAR_HEIGHT);
          return (
            <View key={k} style={styles.col}>
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: k === 'FR' ? '#FF9900' : t.accent,
                      opacity: u == null ? 0.2 : u === 0 ? 0.25 : 0.9,
                    },
                  ]}
                />
              </View>
              <Text style={styles.flag}>{MP_FLAGS[k]}</Text>
            </View>
          );
        })}
      </View>
      <View>
        <Text style={styles.total}>{total != null ? formatInteger(total) : '—'}</Text>
        <Text style={styles.caption}>u. / 30 j</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  col: { alignItems: 'center', gap: 2, width: 16 },
  track: { height: BAR_HEIGHT, justifyContent: 'flex-end' },
  bar: { width: 10, borderTopLeftRadius: radius.sm / 2, borderTopRightRadius: radius.sm / 2 },
  flag: { fontSize: 9 },
  total: { fontSize: fontSize.sm, fontWeight: '800', color: t.text },
  caption: { fontSize: 9, color: t.textSubtle },
}));
