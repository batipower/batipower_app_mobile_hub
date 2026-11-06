/**
 * URL publique de suivi selon le nom du transporteur, portée de
 * `front_externe_batipower/lib/hub/carrier-tracking-url.ts`.
 */
function normalizeCarrier(name: string): string {
  return name.toUpperCase().replace(/\s+/g, '');
}

/** Un suivi peut regrouper plusieurs colis (« 123/456 ») : on ouvre le premier. */
function firstTrackingNumber(trackingNumber: string): string | null {
  const first = trackingNumber.split('/')[0]?.trim();
  return first || null;
}

export function buildCarrierTrackingUrl(
  carrierName: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  if (!carrierName || !trackingNumber) return null;
  const tracking = firstTrackingNumber(trackingNumber);
  if (!tracking) return null;

  const carrier = normalizeCarrier(carrierName);
  const encoded = encodeURIComponent(tracking);

  if (carrier.includes('GLS')) {
    return `https://gls-group.eu/GROUP/en/parcel-tracking?match=${encoded}`;
  }
  if (carrier.includes('CHRONOPOST')) {
    return `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encoded}`;
  }
  if (carrier.includes('COLISSIMO')) {
    return `https://www.laposte.fr/outils/suivre-vos-envois?code=${encoded}`;
  }
  if (carrier.includes('DBSCHENKER')) {
    return `https://www.dbschenker.com/app/tracking/?refNumber=${encoded}`;
  }

  return null;
}
