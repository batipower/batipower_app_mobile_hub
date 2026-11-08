import { router } from 'expo-router';

/** Navigation interne à la page Marges marques (menu) : tout s'empile dans sa pile. */

export function openBrand(brand: string) {
  router.push({ pathname: '/hub/marges-marques/[brand]', params: { brand } });
}

export function openBrandMarginFilters() {
  router.push('/hub/marges-marques/filtres');
}

export function openBrandOrder(reference: string) {
  router.push({ pathname: '/hub/marges-marques/commande/[reference]', params: { reference } });
}
