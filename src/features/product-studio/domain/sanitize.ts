const ALLOWED_TAGS = new Set(['p', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'br', 'h2', 'h3', 'h4']);

const WAREHOUSE_WORDS = 'flevy|dombasle|nancy|nicodeme|lille';

/** Même règle que le back (`isInternalCodeLabel`) : « Code Nancy », « Réf. interne », « code_man », « SKU »... */
const INTERNAL_LABEL_PATTERNS: RegExp[] = [
  /^code$/,
  /^(sku|asin|taz)(\s|$)/,
  /^code man$/,
  /^(code|ref|reference)\s+(interne|ebat|ebatpro|entrepot|depot|fournisseur|distributeur|logistique|stock)\b/,
  new RegExp(`\\b(${WAREHOUSE_WORDS})\\b`),
];

/** Vrai si le libellé d'une ligne de description est un code interne, jamais affiché. */
export function isInternalCodeLabel(label: string): boolean {
  const normalized = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_.\-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return !!normalized && INTERNAL_LABEL_PATTERNS.some((re) => re.test(normalized));
}

function dropInternalCodeLines(html: string): string {
  return html.replace(/<(p|li)>([\s\S]*?)<\/\1>/g, (whole, _tag: string, inner: string) => {
    const text = inner.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const label = text.match(/^([^:：]{1,60}?)\s*[:：]/);
    return label && isInternalCodeLabel(label[1] ?? "") ? '' : whole;
  });
}

function escapeText(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Nettoie le HTML éditorial (description, intro GEO) avant `dangerouslySetInnerHTML` :
 * seules des balises de mise en forme sont conservées, sans aucun attribut, et tout
 * `<` / `>` résiduel est échappé (aucune injection possible, même avec des balises imbriquées).
 * Filet de sécurité : les lignes `p` / `li` dont le libellé est un code interne (Flevy, Dombasle,
 * Nancy, Nicodème, SKU...) ne sont jamais rendues, même si le back en laisse passer une.
 */
export function sanitizeStudioHtml(html: string | null | undefined): string {
  const cleaned = (html ?? '')
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  let out = '';
  let last = 0;
  for (const match of cleaned.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*>/gi)) {
    const index = match.index ?? 0;
    out += escapeText(cleaned.slice(last, index));
    const tag = (match[2] ?? "").toLowerCase();
    if (ALLOWED_TAGS.has(tag)) out += `<${match[1]}${tag}>`;
    last = index + match[0].length;
  }
  return dropInternalCodeLines(out + escapeText(cleaned.slice(last)));
}
