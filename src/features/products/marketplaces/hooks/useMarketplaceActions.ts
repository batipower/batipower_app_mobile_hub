import { Alert } from 'react-native';

import { chooseAction, type ActionSheetOption } from '@/lib/actionSheet';

import type { MarketplaceConfigEntry } from '../config';
import {
  openAsinSheet,
  openFieldSheet,
  openLinkEanSheet,
  openOfferSheet,
} from '../navigation';
import type { MarketplaceCountryView } from '../viewModel';
import { useMarketplaceMutations } from './useMarketplaceMutations';

type Action =
  | 'create'
  | 'update'
  | 'asin'
  | 'link'
  | 'sync'
  | 'availability'
  | 'seller'
  | 'objective'
  | 'commission'
  | 'delist';

/** Les actions disponibles pour la marketplace, dans l'ordre du menu web. */
function actionOptions(
  config: MarketplaceConfigEntry,
  view: MarketplaceCountryView,
): ActionSheetOption<Action>[] {
  const isFr = view.country === 'FR';
  const options: ActionSheetOption<Action>[] = [];
  if (config.canCreateOffer) options.push({ label: 'Créer une offre', value: 'create' });
  if (config.canUpdateOffer) options.push({ label: "Mettre à jour l'offre", value: 'update' });
  if (config.canDeployAsin && isFr) options.push({ label: 'Déployer avec un ASIN', value: 'asin' });
  if (config.syncSku && isFr) options.push({ label: 'Synchroniser le SKU PrestaShop', value: 'sync' });
  if (config.linkEan) options.push({ label: 'Lier par EAN', value: 'link' });
  options.push({
    label: view.notAvailable ? 'Remettre disponible' : 'Marquer indisponible',
    value: 'availability',
  });
  if (config.hasSellerName) options.push({ label: 'Nom du vendeur', value: 'seller' });
  // L'objectif HT ne s'édite qu'en France (le back ne le porte pas par pays pour les autres).
  if (config.targetField && isFr) options.push({ label: "Objectif HT", value: 'objective' });
  options.push({ label: 'Commission', value: 'commission' });
  if (config.canDelist) options.push({ label: "Retirer l'offre (force delist)", value: 'delist', destructive: true });
  return options;
}

function confirm(title: string, message: string, label: string, destructive: boolean, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: label, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/**
 * Menu d'actions d'une carte marketplace (SUPERADMIN) : feuille native de choix, puis soit une
 * feuille de saisie (offre, champ, EAN, ASIN), soit une confirmation suivie de l'appel direct
 * (synchro SKU, disponibilité, retrait forcé).
 */
export function useMarketplaceActions(
  reference: string,
  config: MarketplaceConfigEntry,
  view: MarketplaceCountryView,
) {
  const mutations = useMarketplaceMutations(reference);
  const marketplace = config.key;
  const country = view.country;
  const where = country === 'FR' ? config.label : `${config.label} ${country}`;
  const target = { reference, marketplace, country };
  const apiCountry = country === 'FR' ? undefined : country;

  const pending =
    mutations.setAvailability.isPending ||
    mutations.syncSku.isPending ||
    mutations.forceDelist.isPending;

  const run = (action: Action) => {
    switch (action) {
      case 'create':
        return openOfferSheet({ ...target, mode: 'create' });
      case 'update':
        return openOfferSheet({ ...target, mode: 'update' });
      case 'asin':
        return openAsinSheet(reference);
      case 'link':
        return openLinkEanSheet(target);
      case 'seller':
        return openFieldSheet({ ...target, field: 'seller' });
      case 'objective':
        return openFieldSheet({ ...target, field: 'objective' });
      case 'commission':
        return openFieldSheet({ ...target, field: 'commission' });
      case 'sync':
        return confirm(
          'Synchroniser le SKU ?',
          `Le SKU ${config.label} est relu depuis la fiche PrestaShop.`,
          'Synchroniser',
          false,
          () => mutations.syncSku.mutate(marketplace),
        );
      case 'availability': {
        const next = !view.notAvailable;
        return confirm(
          next ? `Marquer ${where} indisponible ?` : `Remettre ${where} disponible ?`,
          next
            ? "Le produit n'est plus proposé sur cette marketplace."
            : 'Le produit redevient proposé sur cette marketplace.',
          next ? 'Marquer indisponible' : 'Remettre disponible',
          false,
          () => mutations.setAvailability.mutate({ marketplace, notAvailable: next, country: apiCountry }),
        );
      }
      case 'delist':
        return confirm(
          `Retirer l'offre ${where} ?`,
          "L'offre est retirée et le suivi associé coupé. Action irréversible côté marketplace (stock mis à 0).",
          "Retirer l'offre",
          true,
          () => mutations.forceDelist.mutate({ marketplace, country: apiCountry }),
        );
    }
  };

  const openMenu = async () => {
    if (pending) return;
    const action = await chooseAction(where, actionOptions(config, view));
    if (action) run(action);
  };

  return { openMenu, pending };
}
