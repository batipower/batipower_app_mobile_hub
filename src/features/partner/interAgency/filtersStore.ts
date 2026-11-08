import { createFiltersStore } from '../shared/createFiltersStore';

export type InterAgencyStatusFilter = 'ALL' | 'TODO' | 'DONE' | 'IMPOSSIBLE';

export type InterAgencyFilters = {
  status: InterAgencyStatusFilter;
  /**
   * « Mes commandes » : `null` tant que l'utilisateur n'a pas choisi, ce qui active le filtre pour
   * un ACHETEUR (comme le web) et le laisse désactivé pour les autres rôles.
   */
  mineOnly: boolean | null;
  warehouse: string | null;
};

const store = createFiltersStore<InterAgencyFilters>({
  status: 'ALL',
  mineOnly: null,
  warehouse: null,
});

export const useInterAgencyFilters = store.useFilters;
export const patchInterAgencyFilters = store.patch;
/** Remise à zéro complète (déconnexion). */
export const resetInterAgencyFilters = store.reset;

/** Efface les filtres secondaires en gardant le statut choisi. */
export function clearInterAgencyFilters() {
  store.patch({ mineOnly: false, warehouse: null });
}
