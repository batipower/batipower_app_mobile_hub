import { createFiltersStore } from '../shared/createFiltersStore';

export type DeliveryNoteView = 'pending' | 'treated';

export type DeliveryNotesFilters = {
  view: DeliveryNoteView;
  brand: string | null;
};

const store = createFiltersStore<DeliveryNotesFilters>({ view: 'pending', brand: null });

export const useDeliveryNotesFilters = store.useFilters;
export const patchDeliveryNotesFilters = store.patch;
/** Remise à zéro complète (déconnexion). */
export const resetDeliveryNotesFilters = store.reset;

/** Efface la marque en gardant la vue (à traiter / traités). */
export function clearDeliveryNotesFilters() {
  store.patch({ brand: null });
}
