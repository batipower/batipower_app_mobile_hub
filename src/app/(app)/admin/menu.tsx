import { adminMenuSectionsFor } from '@/features/admin/menu/adminMenu';
import { MenuSheet } from '@/features/menu/MenuSheet';

/** Feuille de menu du module ADMIN (mi-écran), ouverte par le bouton central de la barre. */
export default function AdminMenuRoute() {
  return <MenuSheet module="ADMIN" sectionsFor={adminMenuSectionsFor} />;
}
