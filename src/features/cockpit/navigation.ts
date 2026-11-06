import { router } from 'expo-router';

/** Filtre « toutes les marketplaces » (origines autres que le site) de la liste des commandes. */
export const MARKETPLACES_FILTER = 'MARKETPLACES';

type DayOrdersOptions = {
  /** Origine présélectionnée dans le filtre (`WEBSITE`, `AMAZON`…) ; absente = toutes. */
  origin?: string;
  /** Ouvre la liste avec la marge visible (reprend la bascule « Marge » du cockpit). */
  margin?: boolean;
};

/** Ouvre la liste des commandes d'un jour (`YYYY-MM-DD`) dans la pile du cockpit. */
export function openDayOrders(date: string, { origin, margin }: DayOrdersOptions = {}) {
  router.push({
    pathname: '/hub/cockpit/jour/[date]',
    params: { date, ...(origin ? { origin } : {}), ...(margin ? { margin: '1' } : {}) },
  });
}
