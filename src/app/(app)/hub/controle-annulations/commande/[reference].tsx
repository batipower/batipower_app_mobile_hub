import { OrderDetailScreen } from '@/features/orders/OrderDetailScreen';

/** Fiche d'une commande (lecture seule), ouverte depuis une alerte du contrôle des annulations. */
export default function CancellationControlOrderRoute() {
  return <OrderDetailScreen />;
}
