import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { SheetScreen } from '@/components/sheet/SheetScreen';

import type { PaEditKind } from '../navigation';
import { DepEdit, ItemAffaireEdit, MarketplacesEdit, SupplierCodesEdit } from './edit/ComplexEdits';
import {
  AffaireBrandForm,
  BrandForm,
  EanForm,
  LaunchFromStagingForm,
  NegoPriceForm,
  NewAffaireForm,
  WeightForm,
} from './edit/SimpleForms';

type Params = {
  kind: PaEditKind;
  uuid?: string;
  id?: string;
  mode?: string;
  ean?: string;
  warehouse?: string;
  opportunityUuid?: string;
  price?: string;
  label?: string;
  from?: string;
  /** `1` : après création, l'affaire devient le filtre de l'historique. */
  filter?: string;
};

/** Feuille d'édition (route `editer/[kind]`) : un formulaire par type de modification d'un produit ou d'une affaire. */
export function EditSheet() {
  const p = useLocalSearchParams<Params>();
  const { uuid } = p;

  switch (p.kind) {
    case 'weight':
      return uuid ? <WeightForm uuid={uuid} /> : null;
    case 'brand':
      return uuid ? <BrandForm uuid={uuid} /> : null;
    case 'ean':
      return uuid ? (
        <EanForm
          uuid={uuid}
          mode={p.mode === 'edit' ? 'edit' : 'attach'}
          previousEan={p.ean}
          warehouse={p.warehouse}
          opportunityUuid={p.opportunityUuid}
          fromLive={p.from === 'live'}
        />
      ) : null;
    case 'affaire':
      return uuid ? <ItemAffaireEdit uuid={uuid} /> : null;
    case 'nego-price':
      return uuid && p.opportunityUuid ? (
        <NegoPriceForm uuid={uuid} opportunityUuid={p.opportunityUuid} price={p.price} label={p.label} />
      ) : null;
    case 'launch-from-staging':
      return uuid ? <LaunchFromStagingForm uuid={uuid} opportunityUuid={p.opportunityUuid} /> : null;
    case 'marketplaces':
      return uuid ? <MarketplacesEdit uuid={uuid} /> : null;
    case 'dep':
      return uuid ? <DepEdit uuid={uuid} /> : null;
    case 'supplier-codes':
      return uuid ? <SupplierCodesEdit uuid={uuid} /> : null;
    case 'affaire-brand':
      return p.id ? <AffaireBrandForm affaireId={p.id} /> : null;
    case 'new-affaire':
      return <NewAffaireForm uuid={uuid} selectAsFilter={p.filter === '1'} />;
    default:
      return (
        <SheetScreen title="Édition">
          <Text>Modification inconnue.</Text>
        </SheetScreen>
      );
  }
}
