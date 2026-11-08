/** Aides IBAN / BIC côté formulaire, portées de `lib/finance/iban.ts` (le back fait foi). */

export function compactIban(value: string): string {
  return value.replace(/[\s\u00A0\u202F.-]/g, '').toUpperCase();
}

/** IBAN découpé par groupes de 4 caractères. */
export function formatIban(value: string): string {
  return compactIban(value).replace(/(.{4})/g, '$1 ').trim();
}

/** Structure + clé de contrôle (mod 97). */
export function isValidIban(value: string): boolean {
  const iban = compactIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith('FR') && iban.length !== 27) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = char >= 'A' && char <= 'Z' ? String(char.charCodeAt(0) - 55) : char;
    for (const d of digits) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

export function isValidBic(value: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value.replace(/\s/g, '').toUpperCase());
}

export interface FrenchRibParts {
  bankCode: string;
  branchCode: string;
  accountNumber: string;
  ribKey: string;
}

/** Décompose un IBAN français en RIB national (`null` si non français). */
export function parseFrenchIban(value: string): FrenchRibParts | null {
  const iban = compactIban(value);
  if (!iban.startsWith('FR') || iban.length !== 27) return null;
  const bban = iban.slice(4);
  return {
    bankCode: bban.slice(0, 5),
    branchCode: bban.slice(5, 10),
    accountNumber: bban.slice(10, 21),
    ribKey: bban.slice(21, 23),
  };
}

/** « Code Banque … · Code guichet … · N° de compte … · Clé RIB … » (même format que le PDF et l'email). */
export function buildRibDetails(parts: Partial<FrenchRibParts> | null): string {
  if (!parts) return '';
  const chunks: string[] = [];
  if (parts.bankCode) chunks.push(`Code Banque ${parts.bankCode}`);
  if (parts.branchCode) chunks.push(`Code guichet ${parts.branchCode}`);
  if (parts.accountNumber) chunks.push(`N° de compte ${parts.accountNumber}`);
  if (parts.ribKey) chunks.push(`Clé RIB ${parts.ribKey}`);
  return chunks.join('  ·  ');
}
