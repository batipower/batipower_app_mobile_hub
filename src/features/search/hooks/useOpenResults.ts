import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

import { customerName } from '@/features/orders/orderDisplay';
import type { OrderSearchHit } from '@/types/order';
import type { HubProductSearchHit } from '@/types/product';
import type { HubSearchHistoryEntry } from '@/types/searchHistory';

import { openPaFiche } from '@/features/product-analyzer/navigation';

import { openOrder, openProduct } from '../navigation';
import { useSearchHistoryActions } from './useSearchHistory';

/**
 * Ouvre un résultat (commande, produit, recherche récente) en l'enregistrant dans
 * l'historique partagé avec le web : retour haptique, enregistrement sans attendre la
 * réponse, puis navigation.
 */
export function useOpenResults() {
  const { recordSearch, clearHistory } = useSearchHistoryActions();

  const openOrderHit = useCallback(
    (hit: Pick<OrderSearchHit, 'reference' | 'customer'>) => {
      recordSearch({
        type: 'ORDER',
        reference: hit.reference,
        label: hit.reference,
        subtitle: hit.customer ? customerName(hit.customer) : undefined,
      });
      void Haptics.selectionAsync().catch(() => undefined);
      openOrder(hit.reference);
    },
    [recordSearch],
  );

  const openProductHit = useCallback(
    (hit: Pick<HubProductSearchHit, 'reference' | 'designation'>) => {
      recordSearch({
        type: 'PRODUCT',
        reference: hit.reference,
        label: hit.reference,
        subtitle: hit.designation ?? undefined,
      });
      void Haptics.selectionAsync().catch(() => undefined);
      openProduct(hit.reference);
    },
    [recordSearch],
  );

  const openRecent = useCallback(
    (entry: HubSearchHistoryEntry) => {
      // Ré-enregistrer remonte l'entrée en tête de l'historique.
      recordSearch({
        type: entry.type,
        reference: entry.reference,
        label: entry.label,
        subtitle: entry.subtitle ?? undefined,
      });
      void Haptics.selectionAsync().catch(() => undefined);
      if (entry.type === 'PRODUCT') openProduct(entry.reference);
      else if (entry.type === 'ANALYZER') openPaFiche(entry.reference);
      else openOrder(entry.reference);
    },
    [recordSearch],
  );

  return { openOrderHit, openProductHit, openRecent, clearHistory };
}
