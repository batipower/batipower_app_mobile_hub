import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

import { FilterPill } from '@/components/sheet/FilterPill';
import { EmptyState } from '@/features/preparation/components/ListState';
import { formatInteger } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { HubBrandMarginDetail } from '@/types/hubBrandMargin';

import { OrderRow, ShowMoreButton, useShowMore } from '../components/rows';
import { marginOf, type MarginView } from '../lib/model';
import { openBrandOrder } from '../navigation';

type OrderFilter = 'all' | 'negative' | 'incomplete' | 'sav';

type OrdersTabProps = {
  detail: HubBrandMarginDetail;
  view: MarginView;
};

/** Pires commandes de la marque (marge croissante) avec filtres sur leurs signaux. */
export function OrdersTab({ detail, view }: OrdersTabProps) {
  const styles = useStyles();
  const t = useTheme();
  const [filter, setFilter] = useState<OrderFilter>('all');

  const orders = useMemo(() => {
    const matching = detail.orders.filter((order) => {
      switch (filter) {
        case 'negative':
          return order.negativeMargin;
        case 'incomplete':
          return order.incomplete;
        case 'sav':
          return order.sav.totalHT !== 0;
        default:
          return true;
      }
    });
    // L'API trie sur la marge nette : en vue brute, on remet les pires marges brutes en tête.
    return view === 'gross'
      ? [...matching].sort((a, b) => marginOf(a, view).value - marginOf(b, view).value)
      : matching;
  }, [detail.orders, filter, view]);

  const more = useShowMore(orders);
  const truncated = detail.ordersTotal > detail.orders.length;

  return (
    <View style={styles.root}>
      <View style={styles.chips}>
        <FilterPill
          label={`Toutes (${formatInteger(detail.ordersTotal)})`}
          state={filter === 'all' ? 'on' : 'off'}
          onPress={() => setFilter('all')}
        />
        <FilterPill
          label={`Marge négative (${formatInteger(detail.negativeOrders)})`}
          state={filter === 'negative' ? 'negative' : 'off'}
          onPress={() => setFilter('negative')}
        />
        <FilterPill
          label={`Estimées (${formatInteger(detail.incompleteOrders)})`}
          state={filter === 'incomplete' ? 'on' : 'off'}
          onPress={() => setFilter('incomplete')}
        />
        <FilterPill
          label="Avec SAV"
          state={filter === 'sav' ? 'on' : 'off'}
          onPress={() => setFilter('sav')}
        />
      </View>
      {truncated ? (
        <Text style={styles.note}>
          {`Les ${formatInteger(detail.orders.length)} pires commandes sur ${formatInteger(detail.ordersTotal)}.`}
        </Text>
      ) : null}

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={24} color={t.textMuted} />}
          title="Aucune commande"
          text="Aucune commande ne correspond à ce filtre."
        />
      ) : (
        <>
          {more.visible.map((order) => (
            <OrderRow
              key={order.reference}
              order={order}
              view={view}
              mode="margin"
              onPress={openBrandOrder}
            />
          ))}
          {more.hasMore ? (
            <ShowMoreButton remaining={more.remaining} onPress={more.showMore} />
          ) : null}
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: { fontSize: fontSize.xs, color: t.textMuted },
}));
