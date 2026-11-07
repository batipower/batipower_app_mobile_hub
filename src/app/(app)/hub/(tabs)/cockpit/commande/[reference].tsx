import { OrderDetailScreen } from '@/features/orders/OrderDetailScreen';

/** Fiche d'une commande (lecture seule), ouverte depuis les commandes d'un jour du cockpit. */
export default function CockpitOrderRoute() {
  return <OrderDetailScreen />;
}
