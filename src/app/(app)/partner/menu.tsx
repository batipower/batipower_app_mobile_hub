import { MenuSheet } from '@/features/menu/MenuSheet';
import { partnerMenuSectionsFor } from '@/features/partner/menu/partnerMenu';

/** Feuille de menu du module PARTNER (mi-écran), ouverte par le bouton éclair de la barre. */
export default function PartnerMenuRoute() {
  return <MenuSheet module="PARTNER" sectionsFor={partnerMenuSectionsFor} />;
}
