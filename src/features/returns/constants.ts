import {
  Ban,
  CheckCircle2,
  PackageCheck,
  PackageMinus,
  PackageOpen,
  PackageSearch,
  PackageX,
  Truck,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

import type { BadgeTone } from '@/components/ui';
import type {
  HubReturnHistoryItem,
  ReturnBrokenCause,
  ReturnHistoryType,
  ReturnItemCondition,
  ReturnPackagingCondition,
} from '@/api/hubReturns';

/** Taille d'une page de l'historique. */
export const RETURN_HISTORY_PAGE_SIZE = 30;

/** Filtre « source » de l'historique : `ALL`, retours site (étiquettes GLS) ou une marketplace. */
export const RETURN_HISTORY_SOURCES = [
  'ALL',
  'SITE',
  'AMAZON',
  'MANOMANO',
  'LEROY_MERLIN',
  'CASTORAMA',
  'CDISCOUNT',
  'BRICOMAN',
] as const;
export type ReturnHistorySource = (typeof RETURN_HISTORY_SOURCES)[number];

const SOURCE_LABELS: Record<string, string> = {
  ALL: 'Toutes les sources',
  SITE: 'Site Batipower',
  AMAZON: 'Amazon',
  MANOMANO: 'ManoMano',
  LEROY_MERLIN: 'Leroy Merlin',
  CASTORAMA: 'Castorama',
  CDISCOUNT: 'Cdiscount',
  BRICOMAN: 'Bricoman',
};

export function returnSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

/** Filtre « état » de l'historique, aligné sur `ReturnTypeFilter` du back. */
export const RETURN_HISTORY_TYPES: readonly { value: ReturnHistoryType; label: string }[] = [
  { value: 'ANY', label: 'Tous les états' },
  { value: 'UNVERIFIED', label: 'Non vérifié' },
  { value: 'READY_TO_SELL', label: 'Prêt à vendre' },
  { value: 'BROKEN', label: 'Cassé (tout)' },
  { value: 'BAD_TRANSPORT', label: 'Casse transport' },
  { value: 'TECHNICAL_FAILURE', label: 'Panne technique' },
  { value: 'BROKEN_OTHER', label: 'Cassé, cause non renseignée' },
  { value: 'NOT_RESELLABLE', label: 'Non revendable' },
];

export function returnTypeFilterLabel(type: ReturnHistoryType): string {
  return RETURN_HISTORY_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

export const RETURN_TYPE_BADGE: Record<
  HubReturnHistoryItem['returnType'],
  { label: string; tone: BadgeTone }
> = {
  READY_TO_SELL: { label: 'Prêt à vendre', tone: 'green' },
  BAD_TRANSPORT: { label: 'Casse transport', tone: 'red' },
  TECHNICAL_FAILURE: { label: 'Panne technique', tone: 'red' },
  BROKEN_OTHER: { label: 'Cassé', tone: 'amber' },
  NOT_RESELLABLE: { label: 'Non revendable', tone: 'red' },
  UNVERIFIED: { label: 'Non vérifié', tone: 'neutral' },
};

const STATUS_LABELS: Record<string, string> = {
  READY_TO_COLLECT: 'À collecter',
  COLLECTED: 'Collecté',
  DELIVERED: 'Livré',
  PENDING: 'En attente',
  RECEIVED: 'Reçu',
  CLOSED: 'Clôturé',
  CANCELLED: 'Annulé',
  REFUND_PROCESSED: 'Remboursé',
  NEW_PRODUCT_SENT: 'Produit renvoyé',
};

export function returnStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** Référence à ouvrir dans la fiche retour : commande, à défaut le n° de suivi. */
export function returnHistoryTarget(item: HubReturnHistoryItem): string | null {
  return item.orderReference ?? item.trackingNumber ?? null;
}

/** Les 4 états possibles d'un article retourné (saisis à la réception). */
export type ConditionOption = {
  key: string;
  condition: ReturnItemCondition;
  cause: ReturnBrokenCause | null;
  icon: LucideIcon;
  label: string;
  /** Teinte : vert = revendable, rouge = cassé / non revendable. */
  tone: 'green' | 'red';
};

export const CONDITION_OPTIONS: readonly ConditionOption[] = [
  {
    key: 'READY_TO_SELL:',
    condition: 'READY_TO_SELL',
    cause: null,
    icon: CheckCircle2,
    label: 'Prêt à vendre',
    tone: 'green',
  },
  {
    key: 'BROKEN:BAD_TRANSPORT',
    condition: 'BROKEN',
    cause: 'BAD_TRANSPORT',
    icon: Truck,
    label: 'Casse transport',
    tone: 'red',
  },
  {
    key: 'BROKEN:TECHNICAL_FAILURE',
    condition: 'BROKEN',
    cause: 'TECHNICAL_FAILURE',
    icon: Wrench,
    label: 'Panne technique',
    tone: 'red',
  },
  {
    key: 'NOT_RESELLABLE:',
    condition: 'NOT_RESELLABLE',
    cause: null,
    icon: Ban,
    label: 'Non revendable',
    tone: 'red',
  },
];

/** Clé (`CONDITION_OPTIONS`) d'un état enregistré. */
export function conditionKey(
  condition: ReturnItemCondition,
  brokenCause: ReturnBrokenCause | null | undefined,
): string {
  return `${condition}:${brokenCause ?? ''}`;
}

export function isConditionActive(
  option: ConditionOption,
  condition: ReturnItemCondition | null | undefined,
  brokenCause: ReturnBrokenCause | null | undefined,
): boolean {
  return (
    condition === option.condition && (option.cause === null || brokenCause === option.cause)
  );
}

export type PackagingOption = {
  value: ReturnPackagingCondition;
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  tone: 'green' | 'amber' | 'red' | 'neutral';
};

/** Les 5 états prédéfinis de l'emballage d'un retour (facultatif, saisi en un appui). */
export const PACKAGING_OPTIONS: readonly PackagingOption[] = [
  {
    value: 'INTACT',
    icon: PackageCheck,
    label: 'Emballage intact (revendable neuf)',
    shortLabel: 'Intact',
    tone: 'green',
  },
  {
    value: 'DAMAGED_RESELLABLE',
    icon: PackageMinus,
    label: 'Emballage abîmé, revendable',
    shortLabel: 'Abîmé revendable',
    tone: 'amber',
  },
  {
    value: 'DAMAGED_NOT_RESELLABLE',
    icon: PackageX,
    label: 'Emballage abîmé, non revendable',
    shortLabel: 'Abîmé non revendable',
    tone: 'red',
  },
  {
    value: 'OPENED_NOT_RESELLABLE',
    icon: PackageSearch,
    label: "Emballage d'origine ouvert, non revendable",
    shortLabel: 'Ouvert non revendable',
    tone: 'red',
  },
  {
    value: 'MISSING',
    icon: PackageOpen,
    label: 'Emballage absent',
    shortLabel: 'Absent',
    tone: 'neutral',
  },
];

export function packagingOptionFor(
  value: ReturnPackagingCondition | null | undefined,
): PackagingOption | null {
  if (!value) return null;
  return PACKAGING_OPTIONS.find((option) => option.value === value) ?? null;
}

/** Libellé d'un état d'article enregistré (« Casse transport », « Prêt à vendre »…). */
export function conditionLabel(
  condition: ReturnItemCondition | null | undefined,
  brokenCause: ReturnBrokenCause | null | undefined,
): string | null {
  if (!condition) return null;
  const option = CONDITION_OPTIONS.find((entry) => isConditionActive(entry, condition, brokenCause));
  if (option) return option.label;
  return condition === 'BROKEN' ? 'Cassé' : null;
}
