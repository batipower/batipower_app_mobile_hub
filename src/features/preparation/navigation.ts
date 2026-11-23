import { router } from 'expo-router';

/**
 * Stock réseau d'une référence de l'onglet « En agence » de la Préparation : `quantity` et `agency`
 * rappellent ce qui est à récupérer et où, pour choisir une autre agence si besoin.
 */
export function openStockNetwork(reference: string, quantity: number, agency: string) {
  router.push({
    pathname: '/hub/preparation/stock/[reference]',
    params: { reference, quantity: String(quantity), agency },
  });
}
