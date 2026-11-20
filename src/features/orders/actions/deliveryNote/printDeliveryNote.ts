import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';

import { hubOrdersApi } from '@/api/hubOrders';
import type { HubOrder } from '@/types/order';

import { buildDeliveryNoteHtml, type DeliveryNoteFormat } from './deliveryNoteHtml';

let logoPromise: Promise<string | null> | null = null;

/** Logo Batipower en data URI, mis en cache : WKWebView n'imprime pas les assets locaux. */
function loadLogoDataUri(): Promise<string | null> {
  logoPromise ??= (async () => {
    try {
      const asset = Asset.fromModule(
        require('../../../../../assets/logo-batipower.png') as number,
      );
      await asset.downloadAsync();
      if (!asset.localUri) return null;
      const base64 = await new File(asset.localUri).base64();
      return `data:image/png;base64,${base64}`;
    } catch {
      return null;
    }
  })();
  // Un échec ne doit pas rester en cache : la prochaine impression réessaie.
  void logoPromise.then((value) => {
    if (value === null) logoPromise = null;
  });
  return logoPromise;
}

/** Fermer la feuille d'impression sans imprimer n'est pas une erreur. */
function isPrintCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|did not complete|annul/i.test(message);
}

/**
 * Imprime le bon de livraison d'une commande via la feuille d'impression native (AirPrint, service
 * d'impression Android, « Enregistrer en PDF »). Marques, vignettes, note du site et logo
 * enrichissent le BL mais l'impression reste possible sans eux.
 */
export async function printDeliveryNote(order: HubOrder, format: DeliveryNoteFormat): Promise<void> {
  const references = [...new Set((order.rows ?? []).map((row) => row.reference).filter(Boolean))];
  const [catalogResponse, siteRating, logoDataUri] = await Promise.all([
    references.length > 0
      ? hubOrdersApi.getPreparationCatalog(references).catch(() => null)
      : Promise.resolve(null),
    hubOrdersApi.getSiteRating().catch(() => null),
    loadLogoDataUri(),
  ]);

  const html = buildDeliveryNoteHtml({
    order,
    catalog: catalogResponse?.data ?? {},
    siteRating,
    format,
    logoDataUri,
  });

  try {
    await Print.printAsync({ html });
  } catch (error) {
    if (!isPrintCancellation(error)) throw error;
  }
}
