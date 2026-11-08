let counter = 0;

/** Clé locale d'une ligne (liste React) : unique pour la session, jamais envoyée au back. */
export function newLineKey(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Ligne vierge « titre » ou « texte libre ». */
export function blankTextLine(type: 'title' | 'text', content = '') {
  return {
    key: newLineKey(),
    lineType: type,
    content,
    reference: '',
    quantity: 0,
    unitPriceHT: 0,
    catalogPriceTTC: 0,
    discountPct: 0,
    taxRate: 0.2,
  } as const;
}
