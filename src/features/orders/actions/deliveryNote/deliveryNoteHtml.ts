import type { HubOrder, HubOrderRow } from '@/types/order';
import type { DeliveryNoteCatalogEntry, SiteRating } from '@/types/orderActions';

import { originLabel } from '../../orderDisplay';
import { initialParcelCount } from '../orderActionRules';
import { code128Svg } from './code128Svg';

export type DeliveryNoteFormat = 'standard' | 'label';

export const DELIVERY_NOTE_FORMATS: readonly { key: DeliveryNoteFormat; label: string }[] = [
  { key: 'standard', label: 'Standard A4' },
  { key: 'label', label: 'Étiquette autocollante A4' },
];

export interface DeliveryNoteInput {
  order: HubOrder;
  catalog: Record<string, DeliveryNoteCatalogEntry | undefined>;
  siteRating: SiteRating | null;
  format: DeliveryNoteFormat;
  /** Logo Batipower en data URI (WKWebView n'ouvre pas les assets locaux). */
  logoDataUri: string | null;
  now?: Date;
}

/** Dimensions de l'encadré détachable (format `label`), identiques au BL imprimé du site HUB. */
const LABEL_WIDTH_MM = 100;
const LABEL_HEIGHT_MM = 45;
const LABEL_PAGE_MARGIN_MM = 8;
const LABEL_OFFSET_TOP_MM = 15;
const LABEL_OFFSET_LEFT_MM = 12;
/** Gouttière droite réservée à la mention verticale du dépôt. */
const WH_EDGE_GUTTER_MM = 4;
const WH_LABEL = 'QG Batipower';

const QR_PATH = 'M0 0h1v1h-1zM1 0h1v1h-1zM2 0h1v1h-1zM3 0h1v1h-1zM4 0h1v1h-1zM5 0h1v1h-1zM6 0h1v1h-1zM8 0h1v1h-1zM9 0h1v1h-1zM10 0h1v1h-1zM13 0h1v1h-1zM14 0h1v1h-1zM15 0h1v1h-1zM16 0h1v1h-1zM18 0h1v1h-1zM19 0h1v1h-1zM20 0h1v1h-1zM21 0h1v1h-1zM22 0h1v1h-1zM23 0h1v1h-1zM24 0h1v1h-1zM0 1h1v1h-1zM6 1h1v1h-1zM9 1h1v1h-1zM12 1h1v1h-1zM18 1h1v1h-1zM24 1h1v1h-1zM0 2h1v1h-1zM2 2h1v1h-1zM3 2h1v1h-1zM4 2h1v1h-1zM6 2h1v1h-1zM8 2h1v1h-1zM11 2h1v1h-1zM15 2h1v1h-1zM18 2h1v1h-1zM20 2h1v1h-1zM21 2h1v1h-1zM22 2h1v1h-1zM24 2h1v1h-1zM0 3h1v1h-1zM2 3h1v1h-1zM3 3h1v1h-1zM4 3h1v1h-1zM6 3h1v1h-1zM8 3h1v1h-1zM11 3h1v1h-1zM12 3h1v1h-1zM13 3h1v1h-1zM14 3h1v1h-1zM18 3h1v1h-1zM20 3h1v1h-1zM21 3h1v1h-1zM22 3h1v1h-1zM24 3h1v1h-1zM0 4h1v1h-1zM2 4h1v1h-1zM3 4h1v1h-1zM4 4h1v1h-1zM6 4h1v1h-1zM8 4h1v1h-1zM10 4h1v1h-1zM11 4h1v1h-1zM12 4h1v1h-1zM15 4h1v1h-1zM16 4h1v1h-1zM18 4h1v1h-1zM20 4h1v1h-1zM21 4h1v1h-1zM22 4h1v1h-1zM24 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM9 5h1v1h-1zM11 5h1v1h-1zM12 5h1v1h-1zM13 5h1v1h-1zM18 5h1v1h-1zM24 5h1v1h-1zM0 6h1v1h-1zM1 6h1v1h-1zM2 6h1v1h-1zM3 6h1v1h-1zM4 6h1v1h-1zM5 6h1v1h-1zM6 6h1v1h-1zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM19 6h1v1h-1zM20 6h1v1h-1zM21 6h1v1h-1zM22 6h1v1h-1zM23 6h1v1h-1zM24 6h1v1h-1zM9 7h1v1h-1zM11 7h1v1h-1zM12 7h1v1h-1zM14 7h1v1h-1zM15 7h1v1h-1zM2 8h1v1h-1zM3 8h1v1h-1zM4 8h1v1h-1zM5 8h1v1h-1zM6 8h1v1h-1zM7 8h1v1h-1zM10 8h1v1h-1zM11 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM17 8h1v1h-1zM19 8h1v1h-1zM20 8h1v1h-1zM21 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM0 9h1v1h-1zM4 9h1v1h-1zM5 9h1v1h-1zM7 9h1v1h-1zM8 9h1v1h-1zM9 9h1v1h-1zM10 9h1v1h-1zM14 9h1v1h-1zM24 9h1v1h-1zM0 10h1v1h-1zM1 10h1v1h-1zM2 10h1v1h-1zM4 10h1v1h-1zM5 10h1v1h-1zM6 10h1v1h-1zM7 10h1v1h-1zM8 10h1v1h-1zM9 10h1v1h-1zM11 10h1v1h-1zM12 10h1v1h-1zM14 10h1v1h-1zM16 10h1v1h-1zM17 10h1v1h-1zM18 10h1v1h-1zM20 10h1v1h-1zM22 10h1v1h-1zM23 10h1v1h-1zM0 11h1v1h-1zM4 11h1v1h-1zM5 11h1v1h-1zM10 11h1v1h-1zM18 11h1v1h-1zM19 11h1v1h-1zM20 11h1v1h-1zM0 12h1v1h-1zM1 12h1v1h-1zM6 12h1v1h-1zM7 12h1v1h-1zM8 12h1v1h-1zM10 12h1v1h-1zM13 12h1v1h-1zM15 12h1v1h-1zM16 12h1v1h-1zM18 12h1v1h-1zM21 12h1v1h-1zM23 12h1v1h-1zM24 12h1v1h-1zM0 13h1v1h-1zM1 13h1v1h-1zM3 13h1v1h-1zM5 13h1v1h-1zM8 13h1v1h-1zM10 13h1v1h-1zM13 13h1v1h-1zM14 13h1v1h-1zM15 13h1v1h-1zM21 13h1v1h-1zM22 13h1v1h-1zM23 13h1v1h-1zM1 14h1v1h-1zM3 14h1v1h-1zM5 14h1v1h-1zM6 14h1v1h-1zM8 14h1v1h-1zM9 14h1v1h-1zM14 14h1v1h-1zM16 14h1v1h-1zM19 14h1v1h-1zM21 14h1v1h-1zM22 14h1v1h-1zM24 14h1v1h-1zM1 15h1v1h-1zM3 15h1v1h-1zM5 15h1v1h-1zM7 15h1v1h-1zM8 15h1v1h-1zM10 15h1v1h-1zM12 15h1v1h-1zM14 15h1v1h-1zM17 15h1v1h-1zM20 15h1v1h-1zM21 15h1v1h-1zM22 15h1v1h-1zM3 16h1v1h-1zM4 16h1v1h-1zM5 16h1v1h-1zM6 16h1v1h-1zM7 16h1v1h-1zM9 16h1v1h-1zM10 16h1v1h-1zM11 16h1v1h-1zM12 16h1v1h-1zM13 16h1v1h-1zM14 16h1v1h-1zM15 16h1v1h-1zM16 16h1v1h-1zM17 16h1v1h-1zM18 16h1v1h-1zM19 16h1v1h-1zM20 16h1v1h-1zM23 16h1v1h-1zM11 17h1v1h-1zM12 17h1v1h-1zM13 17h1v1h-1zM14 17h1v1h-1zM16 17h1v1h-1zM20 17h1v1h-1zM21 17h1v1h-1zM24 17h1v1h-1zM0 18h1v1h-1zM1 18h1v1h-1zM2 18h1v1h-1zM3 18h1v1h-1zM4 18h1v1h-1zM5 18h1v1h-1zM6 18h1v1h-1zM8 18h1v1h-1zM10 18h1v1h-1zM11 18h1v1h-1zM12 18h1v1h-1zM14 18h1v1h-1zM15 18h1v1h-1zM16 18h1v1h-1zM18 18h1v1h-1zM20 18h1v1h-1zM21 18h1v1h-1zM24 18h1v1h-1zM0 19h1v1h-1zM6 19h1v1h-1zM8 19h1v1h-1zM9 19h1v1h-1zM13 19h1v1h-1zM14 19h1v1h-1zM15 19h1v1h-1zM16 19h1v1h-1zM20 19h1v1h-1zM23 19h1v1h-1zM24 19h1v1h-1zM0 20h1v1h-1zM2 20h1v1h-1zM3 20h1v1h-1zM4 20h1v1h-1zM6 20h1v1h-1zM8 20h1v1h-1zM10 20h1v1h-1zM12 20h1v1h-1zM14 20h1v1h-1zM15 20h1v1h-1zM16 20h1v1h-1zM17 20h1v1h-1zM18 20h1v1h-1zM19 20h1v1h-1zM20 20h1v1h-1zM21 20h1v1h-1zM23 20h1v1h-1zM24 20h1v1h-1zM0 21h1v1h-1zM2 21h1v1h-1zM3 21h1v1h-1zM4 21h1v1h-1zM6 21h1v1h-1zM8 21h1v1h-1zM10 21h1v1h-1zM13 21h1v1h-1zM14 21h1v1h-1zM17 21h1v1h-1zM19 21h1v1h-1zM21 21h1v1h-1zM22 21h1v1h-1zM23 21h1v1h-1zM24 21h1v1h-1zM0 22h1v1h-1zM2 22h1v1h-1zM3 22h1v1h-1zM4 22h1v1h-1zM6 22h1v1h-1zM8 22h1v1h-1zM12 22h1v1h-1zM16 22h1v1h-1zM18 22h1v1h-1zM20 22h1v1h-1zM21 22h1v1h-1zM22 22h1v1h-1zM24 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM9 23h1v1h-1zM10 23h1v1h-1zM12 23h1v1h-1zM13 23h1v1h-1zM14 23h1v1h-1zM18 23h1v1h-1zM20 23h1v1h-1zM21 23h1v1h-1zM24 23h1v1h-1zM0 24h1v1h-1zM1 24h1v1h-1zM2 24h1v1h-1zM3 24h1v1h-1zM4 24h1v1h-1zM5 24h1v1h-1zM6 24h1v1h-1zM10 24h1v1h-1zM11 24h1v1h-1zM12 24h1v1h-1zM14 24h1v1h-1zM15 24h1v1h-1zM18 24h1v1h-1zM19 24h1v1h-1zM20 24h1v1h-1zM21 24h1v1h-1zM22 24h1v1h-1zM23 24h1v1h-1zM24 24h1v1h-1z';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toThumbnailSrc(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  return trimmed.startsWith('data:') ? trimmed : `data:image/jpeg;base64,${trimmed}`;
}

function formatWeightBl(grams: number): string {
  if (grams === 0) return '0g';
  return grams >= 1000 ? `${(grams / 1000).toFixed(1)}kg` : `${grams}g`;
}

function totalWeightGrams(rows: readonly HubOrderRow[]): number {
  return rows.reduce((sum, row) => sum + (row.weightInGrams || 0) * (row.quantity || 0), 0);
}

/**
 * Bon de livraison Batipower en HTML, pour `expo-print`. Même rendu que le BL imprimé du site HUB
 * (`delivery-note-print.ts`) : un BL suivi de sa page de remerciement (QR vers batipower.fr, note
 * du site). Deux formats : `standard` (code-barres en bandeau) et `label` (encadré détachable en
 * haut à gauche pour planche autocollante). Le code-barres et le QR sont des SVG inline ; le logo
 * et les vignettes sont des data URI, seule forme que WKWebView imprime sur iOS.
 */
export function buildDeliveryNoteHtml({
  order,
  catalog,
  siteRating,
  format,
  logoDataUri,
  now = new Date(),
}: DeliveryNoteInput): string {
  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const logoImg = (className: string, alt = 'Batipower') =>
    logoDataUri
      ? `<img src="${logoDataUri}" alt="${alt}" class="${className}" />`
      : '';

  const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="promo-page-qr" width="132" height="132" viewBox="0 0 25 25" shape-rendering="crispEdges" role="img" aria-label="QR code batipower.fr"><rect width="25" height="25" fill="#ffffff"/><path fill="#0f1111" d="${QR_PATH}"/></svg>`;

  const ratingHtml =
    siteRating != null && siteRating.count > 0
      ? `
    <div class="promo-page-bottom">
      <div class="promo-page-rating">
        <span class="promo-page-score">${siteRating.average.toFixed(1).replace('.', ',')}</span>
        <span class="promo-page-slash">/5</span>
      </div>
      <div>
        <div class="promo-page-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
        <div class="promo-page-label">Avis V&#233;rifi&#233;s</div>
        <div class="promo-page-count">${siteRating.count.toLocaleString('fr-FR')} avis v&#233;rifi&#233;s</div>
      </div>
    </div>`
      : '';

  const promoPageHtml = `
<div class="promo-page">
  <div class="promo-page-inner">
    ${logoImg('promo-page-logo')}
    <div class="promo-page-thanks">Merci pour votre commande</div>
    <div class="promo-page-url">www.batipower.fr</div>
    <div class="promo-page-offer">
      <div class="promo-page-qr-wrap">${qrSvg}</div>
      <div class="promo-page-qr-caption">Scannez pour ouvrir batipower.fr</div>
    </div>
    ${ratingHtml}
    <div class="promo-page-tagline">Mat&#233;riaux &amp; outillage de qualit&#233; &nbsp;·&nbsp; Livraison rapide partout en France</div>
  </div>
</div>`;

  const rows = order.rows ?? [];
  const da = order.deliveryAddress;
  const fullName = escapeHtml([da?.firstname, da?.lastname].filter(Boolean).join(' '));
  const addr1 = escapeHtml(da?.address || '');
  const addr2 = escapeHtml(da?.complt_address || '');
  const zipcode = escapeHtml(da?.zipcode || '');
  const city = escapeHtml((da?.city || '').toUpperCase());
  const country = escapeHtml(da?.country || '');
  const ref = escapeHtml(order.reference);
  const origin = order.origin ? escapeHtml(originLabel(order.origin)) : '';
  const warehouseName = escapeHtml(
    (order.warehouseOrder?.warehouseAffectation || WH_LABEL).replace(/_/g, ' ').trim().toUpperCase(),
  );
  const ebatRef = order.ebatRef ? escapeHtml(order.ebatRef) : '';
  const nbColis = initialParcelCount(order);
  const poids = totalWeightGrams(rows);
  const totalArticles = rows.reduce((sum, row) => sum + row.quantity, 0);

  const articleRows = rows
    .map((row, index) => {
      const entry = catalog[row.reference];
      const thumbSrc = toThumbnailSrc(entry?.thumbnailBase64);
      const thumbCell = thumbSrc
        ? `<td class="thumb-td"><img class="row-thumb" src="${thumbSrc}" alt="" /></td>`
        : `<td class="thumb-td"><span class="na">—</span></td>`;
      const brand = entry?.brand ?? null;
      const name = row.name ? escapeHtml(row.name) : '<span class="na">—</span>';
      const weight =
        row.weightInGrams && row.weightInGrams > 0
          ? formatWeightBl(row.weightInGrams * row.quantity)
          : '<span class="na">—</span>';
      return `
        <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
          <td class="c"><span class="qty-pill">${row.quantity}</span></td>
          ${thumbCell}
          <td class="ref-td">${escapeHtml(row.reference)}</td>
          <td class="name-td">${name}</td>
          <td class="brand-td">${brand ? escapeHtml(brand) : '<span class="na">—</span>'}</td>
          <td class="num-td fw">${weight}</td>
        </tr>`;
    })
    .join('');

  const headerHtml = `
  <div class="bl-header">
    <div class="brand">
      ${logoDataUri ? `<img src="${logoDataUri}" alt="Batipower" />` : ''}
      <div>
        <div class="brand-name">BATIPOWER</div>
        <div class="brand-sub">Bon de livraison</div>
      </div>
    </div>
    <div class="doc-block">
      <div class="doc-date">${dateStr}</div>
    </div>
  </div>`;
  const barcodeHtml = `
  <div class="bc-section">
    ${code128Svg(order.reference, { moduleWidth: 2, height: 32, className: 'bc' })}
    <div class="ref-label">${ref}</div>
  </div>`;
  const metaHtml =
    origin || ebatRef
      ? `
  <div class="meta-strip">
    ${origin ? `<span>Origine&nbsp;: <strong>${origin}</strong></span>` : ''}
    ${ebatRef ? `<span>N° plateforme&nbsp;: <strong>${ebatRef}</strong></span>` : ''}
  </div>`
      : '';
  const whEdgeHtml = `<div class="wh-edge">${warehouseName} · ${ref}</div>`;
  const addressHtml = `
  <div class="address-row">
    <div class="addr-box sender">
      <div class="addr-label">EXPÉDITEUR</div>
      <div class="addr-name">BATIPOWER</div>
    </div>
    <div class="addr-box dest">
      <div class="addr-label">DESTINATAIRE</div>
      ${fullName ? `<div class="addr-name">${fullName}</div>` : `<div class="addr-name addr-missing">— Destinataire non renseigné —</div>`}
      ${addr1 ? `<div class="addr-line">${addr1}</div>` : ''}
      ${addr2 ? `<div class="addr-line addr-complement">${addr2}</div>` : ''}
      ${zipcode || city ? `<div class="addr-line addr-city">${[zipcode, city].filter(Boolean).join(' ')}</div>` : ''}
      ${country ? `<div class="addr-line addr-country">${country}</div>` : ''}
      ${!da ? `<div class="addr-missing">Adresse non disponible</div>` : ''}
    </div>
  </div>`;
  const kpiHtml = `
  <div class="kpi-strip">
    <div class="kpi"><div class="kpi-val">${nbColis}</div><div class="kpi-lbl">colis</div></div>
    <div class="kpi-sep"></div>
    <div class="kpi"><div class="kpi-val">${totalArticles}</div><div class="kpi-lbl">articles</div></div>
    <div class="kpi-sep"></div>
    <div class="kpi"><div class="kpi-val">${formatWeightBl(poids)}</div><div class="kpi-lbl">poids total</div></div>
  </div>`;
  const tableHtml = articleRows
    ? `
  <table>
    <thead>
      <tr>
        <th class="c" style="width:42px">Qté</th>
        <th class="c" style="width:60px">Visuel</th>
        <th>Référence article</th>
        <th>Désignation</th>
        <th style="width:90px">Marque</th>
        <th class="r" style="width:80px">Pds total</th>
      </tr>
    </thead>
    <tbody>${articleRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="5" class="foot-label">Total commande</td>
        <td class="r fw">${formatWeightBl(poids)}</td>
      </tr>
    </tfoot>
  </table>`
    : `<div class="empty-rows">Aucun article renseigné</div>`;
  const footHtml = `
  <div class="promo-bar">
    <div class="promo-left">
      ${logoImg('promo-logo')}
      <div>
        <div class="promo-discover">Commandez en ligne</div>
        <div class="promo-url">www.batipower.fr</div>
      </div>
    </div>
    <div class="promo-tagline">Matériaux &amp; outillage de qualité<br/>Livraison rapide partout en France</div>
  </div>
  <div class="bl-footer">
    <span>Réf. commande : <strong>${ref}</strong></span>
    <span>BATIPOWER</span>
  </div>`;

  let blPage: string;
  if (format === 'label') {
    const labelHtml = `
  <div class="label-cut">
    <div class="label-head">
      ${logoImg('label-logo')}
      ${
        origin || ebatRef
          ? `<div class="label-meta">${origin ? `<span>${origin}</span>` : ''}${ebatRef ? `<span>N° ${ebatRef}</span>` : ''}</div>`
          : ''
      }
    </div>
    <div class="label-bc">
      ${code128Svg(order.reference, { moduleWidth: 2, height: 64, className: 'label-bc-svg' })}
    </div>
    <div class="label-ref">${ref}</div>
  </div>`;
    blPage = `
<div class="bl-page bl-page-label">
  ${whEdgeHtml}
  <div class="label-top">
    ${labelHtml}
    <div class="label-side">
      ${headerHtml}
      ${metaHtml}
      ${kpiHtml}
    </div>
  </div>
  ${addressHtml}
  ${tableHtml}
  ${footHtml}
</div>`;
  } else {
    blPage = `
<div class="bl-page">
  ${whEdgeHtml}
  ${headerHtml}
  ${barcodeHtml}
  ${metaHtml}
  ${addressHtml}
  ${kpiHtml}
  ${tableHtml}
  ${footHtml}
</div>`;
  }

  const pageMinHeight =
    format === 'label' ? `calc(297mm - ${LABEL_PAGE_MARGIN_MM * 2}mm)` : 'calc(297mm - 24mm)';

  const labelCss = `
    .label-top { display: flex; align-items: stretch; gap: 6mm; padding-top: ${LABEL_OFFSET_TOP_MM}mm; padding-left: ${LABEL_OFFSET_LEFT_MM}mm; }
    .label-cut { flex: none; width: ${LABEL_WIDTH_MM}mm; height: ${LABEL_HEIGHT_MM}mm; border: 0.3mm dashed #adb1b8; padding: 2.5mm 4mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; background: #fff; overflow: hidden; }
    .label-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .label-logo { height: 8mm; width: auto; max-width: 40mm; object-fit: contain; }
    .label-bc { width: 100%; display: flex; justify-content: center; }
    .label-bc-svg { display: block; max-width: 100%; height: 15mm; }
    .label-ref { font-family: 'Courier New', monospace; font-size: 14px; font-weight: 800; letter-spacing: 1.5px; color: #0f1111; line-height: 1; text-align: center; word-break: break-all; }
    .label-meta { display: flex; gap: 8px; justify-content: flex-end; font-size: 8px; color: #565959; }
    .label-side { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .label-side .meta-strip { padding: 0; }
    .label-side .kpi-strip { margin-top: auto; }
    .bl-page-label { gap: 6mm; }
  `;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Bon de livraison — ${ref}</title>
  <style>
    @page { size: A4; margin: ${format === 'label' ? `${LABEL_PAGE_MARGIN_MM}mm` : '12mm 14mm'}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Arial, Helvetica, sans-serif; font-size: 10px; color: #0f1111; background: #fff; }
    .bl-page { position: relative; padding-right: ${WH_EDGE_GUTTER_MM}mm; min-height: ${pageMinHeight}; display: flex; flex-direction: column; gap: 10px; page-break-after: always; }
    .bl-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 9px; border-bottom: 2px solid #0f1111; }
    .brand { display: flex; align-items: center; gap: 9px; }
    .brand img { width: 36px; height: 36px; object-fit: contain; border: 1px solid #e3e6e6; }
    .brand-name { font-size: 16px; font-weight: 900; letter-spacing: -0.3px; color: #0f1111; line-height: 1.1; }
    .brand-sub  { font-size: 8px; color: #767676; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
    .doc-block  { text-align: right; }
    .doc-date   { font-size: 8px; color: #565959; margin-top: 1px; }
    .wh-edge { position: absolute; top: 0; right: 0; writing-mode: vertical-rl; font-size: 6px; line-height: 1; letter-spacing: 1.5px; text-transform: uppercase; color: #c4c7cc; white-space: nowrap; }
    .bc-section { flex: 0 0 auto; align-self: stretch; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: #f0f2f2; border: 1px solid #d5d9d9; padding: 9px 14px 5px; }
    .bc { display: block; flex: none; }
    .ref-label { font-family: 'Courier New', monospace; font-size: 12px; font-weight: 800; color: #0f1111; line-height: 1; letter-spacing: 1px; }
    .meta-strip { display: flex; gap: 14px; justify-content: flex-end; font-size: 7.5px; color: #adb1b8; padding: 3px 2px 0; }
    .meta-strip span strong { color: #565959; font-weight: 600; }
    .address-row { display: flex; gap: 10px; }
    .addr-box { flex: 1; border: 1.5px solid #adb1b8; padding: 8px 10px; }
    .addr-box.dest { border-width: 2px; border-color: #0f1111; }
    .addr-label { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #565959; margin-bottom: 5px; }
    .addr-name { font-size: 13px; font-weight: 800; color: #0f1111; margin-bottom: 3px; }
    .addr-line { font-size: 10px; color: #0f1111; line-height: 1.5; }
    .addr-complement { color: #565959; }
    .addr-city { font-size: 11px; font-weight: 700; margin-top: 2px; }
    .addr-country { font-size: 9px; color: #767676; text-transform: uppercase; letter-spacing: 0.5px; }
    .addr-missing { font-size: 9px; color: #adb1b8; font-style: italic; }
    .kpi-strip { display: flex; align-items: center; background: #f0f2f2; border: 1px solid #d5d9d9; }
    .kpi { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 6px 0; }
    .kpi-val { font-size: 14px; font-weight: 800; color: #0f1111; line-height: 1; }
    .kpi-lbl { font-size: 7px; color: #565959; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
    .kpi-sep { width: 1px; height: 30px; background: #d5d9d9; flex-shrink: 0; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f0f2f2; border-bottom: 1.5px solid #adb1b8; }
    thead th { padding: 4px 8px; text-align: left; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #565959; }
    th.c { text-align: center; } th.r { text-align: right; }
    tbody tr.even { background: #fff; } tbody tr.odd { background: #f7f8f8; }
    tbody tr { border-bottom: 1px solid #d5d9d9; }
    td { padding: 4px 8px; vertical-align: middle; line-height: 1.25; }
    td.c { text-align: center; } td.r { text-align: right; }
    .ref-td { font-family: 'Courier New', monospace; font-size: 9px; font-weight: 600; }
    .name-td { font-size: 9px; }
    .num-td { text-align: right; font-size: 9px; color: #565959; }
    .fw { font-weight: 700; color: #0f1111 !important; }
    .na { color: #adb1b8; }
    .qty-pill { display: inline-block; background: #febd69; color: #0f1111; font-weight: 800; font-size: 10px; padding: 1px 6px; }
    .thumb-td { width: 60px; max-width: 66px; text-align: center; padding: 4px 5px !important; }
    .row-thumb { width: 42px; height: 42px; object-fit: cover; border-radius: 4px; border: 1px solid #d5d9d9; }
    tfoot td { padding: 4px 8px; background: #f0f2f2; border-top: 1.5px solid #adb1b8; font-size: 9px; font-weight: 700; }
    .foot-label { color: #565959; text-transform: uppercase; letter-spacing: 0.3px; font-size: 8px; }
    .empty-rows { padding: 8px 10px; font-size: 9px; color: #adb1b8; font-style: italic; border: 1px solid #d5d9d9; }
    .promo-bar { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #0f1111; color: #fff; padding: 10px 14px; }
    .promo-left { display: flex; align-items: center; gap: 10px; }
    .promo-logo { width: 30px; height: 30px; object-fit: contain; background: #fff; padding: 2px; }
    .promo-discover { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.8px; color: #adb1b8; margin-bottom: 2px; }
    .promo-url { font-size: 17px; font-weight: 900; color: #febd69; letter-spacing: -0.3px; }
    .promo-tagline { font-size: 8px; color: #adb1b8; text-align: right; line-height: 1.5; }
    .bl-footer { padding-top: 6px; border-top: 1px solid #d5d9d9; display: flex; justify-content: space-between; font-size: 8px; color: #adb1b8; }
    .bl-footer strong { color: #0f1111; }
    .promo-page { min-height: ${pageMinHeight}; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; page-break-after: auto; }
    .promo-page-inner { transform: rotate(180deg); width: 100%; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 20px 16px; background: #0f1111; border-top: 3px solid #febd69; }
    .promo-page-logo { width: 64px; height: 64px; object-fit: contain; background: #fff; padding: 4px; }
    .promo-page-thanks { font-size: 18px; font-weight: 800; color: #fff; }
    .promo-page-url { font-size: 30px; font-weight: 900; color: #febd69; }
    .promo-page-bottom { display: flex; align-items: center; gap: 10px; }
    .promo-page-score { font-size: 32px; font-weight: 900; color: #febd69; }
    .promo-page-slash { font-size: 14px; font-weight: 700; color: #adb1b8; }
    .promo-page-stars { font-size: 14px; color: #febd69; letter-spacing: 2px; }
    .promo-page-label { font-size: 6.5px; text-transform: uppercase; letter-spacing: 1px; color: #adb1b8; }
    .promo-page-count { font-size: 7px; color: #adb1b8; margin-top: 2px; }
    .promo-page-tagline { font-size: 8.5px; color: #767676; text-align: center; margin-top: 8px; border-top: 1px solid #2a2a2a; padding-top: 8px; width: 100%; }
    .promo-page-offer { display: flex; flex-direction: column; align-items: center; margin-top: 8px; padding: 10px 12px; background: rgba(255,255,255,0.06); border-radius: 8px; border: 1px solid #2a2a2a; width: fit-content; }
    .promo-page-qr-wrap { background: #fff; padding: 6px; border-radius: 6px; line-height: 0; }
    .promo-page-qr { display: block; width: 132px; height: 132px; }
    .promo-page-qr-caption { font-size: 8px; color: #adb1b8; margin-top: 6px; }
    ${format === 'label' ? labelCss : ''}
  </style>
</head>
<body>
  ${blPage}
  ${promoPageHtml}
</body>
</html>`;
}
