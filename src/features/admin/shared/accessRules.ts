/**
 * Règles métier d'accès des comptes (rôles, modules, rattachement partenaire, entrepôts, accès
 * marque), portées du front web : `lib/module-access.ts`, `lib/partners.ts`,
 * `lib/warehouse-catalog.ts`, `components/modules/BrandAccessFields.tsx` et les validations de
 * `super-admin/utilisateurs/page.tsx`. Le back reste seul juge ; ces règles évitent les allers-retours.
 */
import type {
  ApproveRegistrationPayload,
  BrandAlertFrequency,
  BrandPlan,
  CategoryType,
  DistributorWarehouseOption,
  SubsidiaryOption,
  UpdateUserPayload,
  Warehouse,
} from '@/types/admin';
import type { AppUserRole, BatipowerModule } from '@/types/user';

// ─── Rôles ───────────────────────────────────────────────────────────────────

/** Tous les rôles d'un compte (création / édition). */
export const ALL_ROLES: readonly AppUserRole[] = [
  'ACHETEUR',
  'CHEF_SERVICE',
  'RESPONSABLE_ACHAT',
  'RESPONSABLE_ACHAT_REFERENT',
  'LOGISTIQUE',
  'RESPONSABLE_PLATEFORME',
  'RESPONSABLE',
  'SUPERADMIN',
  'PREPARATEUR',
  'RESPONSABLE_EXPEDITION_PALETTE',
  'DIRECTION',
  'MANAGER',
  'RESPONSABLE_MARQUE',
  'VERIFICATEUR_BL',
];

/** Rôles attribuables à une inscription : ni SUPERADMIN ni PREPARATEUR (comme le web). */
export const REGISTRATION_ROLES: readonly AppUserRole[] = ALL_ROLES.filter(
  (role) => role !== 'SUPERADMIN' && role !== 'PREPARATEUR',
);

/** Rôles dont l'entrepôt est écrit sur le compte à partir de la filiale (miroir du back). */
export const WAREHOUSE_SCOPED_ROLES: readonly AppUserRole[] = [
  'LOGISTIQUE',
  'RESPONSABLE_PLATEFORME',
  'PREPARATEUR',
  'RESPONSABLE_EXPEDITION_PALETTE',
  'VERIFICATEUR_BL',
  'DIRECTION',
];

/** Rôles pour lesquels un entrepôt rattaché est obligatoire. */
export function roleNeedsWarehouse(role: AppUserRole): boolean {
  return (
    role === 'PREPARATEUR' ||
    role === 'RESPONSABLE_EXPEDITION_PALETTE' ||
    role === 'DIRECTION' ||
    role === 'VERIFICATEUR_BL'
  );
}

/** Explication affichée sous le champ entrepôt selon le rôle. */
export function warehouseRoleHint(role: AppUserRole): string | null {
  switch (role) {
    case 'PREPARATEUR':
      return "Obligatoire : le préparateur n'a accès qu'à la préparation de son entrepôt (Dombasle, Flévy ou l'entrepôt de sa filiale).";
    case 'RESPONSABLE_EXPEDITION_PALETTE':
      return 'Obligatoire : ne voit que les demandes de son entrepôt.';
    case 'VERIFICATEUR_BL':
      return 'Obligatoire : ne voit que les annulations de son entrepôt (Dombasle ou Flévy).';
    case 'DIRECTION':
      return 'Obligatoire : arrive sur le dashboard flux de son entrepôt (Dombasle, Flévy ou QG Batipower).';
    case 'RESPONSABLE_ACHAT_REFERENT':
      return 'Voit le dashboard flux de son entrepôt (Dombasle, Flévy ou QG Batipower).';
    default:
      return null;
  }
}

// ─── Modules ─────────────────────────────────────────────────────────────────

/** Modules d'appartenance : le module par défaut d'un compte est choisi parmi eux. */
export const CORE_MODULES: readonly BatipowerModule[] = ['PARTNER', 'HUB'];

/** Modules partagés, ouverts au cas par cas par le SUPERADMIN. */
export const SHARED_MODULES: readonly BatipowerModule[] = ['MARQUE', 'POWER'];

/** Module d'appartenance imposé par le rôle (Manager = HUB, Vérificateur BL = PARTNER), sinon `null`. */
export function lockedCoreModuleForRole(role: string): BatipowerModule | null {
  if (role === 'MANAGER') return 'HUB';
  if (role === 'VERIFICATEUR_BL') return 'PARTNER';
  return null;
}

/** MARQUE / POWER ne s'ouvrent ni au Vérificateur BL, ni au Responsable de marque, ni au SUPERADMIN. */
export function canHaveSharedModules(role: string): boolean {
  return role !== 'VERIFICATEUR_BL' && role !== 'RESPONSABLE_MARQUE' && role !== 'SUPERADMIN';
}

/** Modules et module par défaut réellement attribués, selon les cloisonnements du rôle. */
export function assignedModulesForRole(
  role: string,
  modules: BatipowerModule[],
  defaultModule: BatipowerModule,
): { modules: BatipowerModule[]; defaultModule: BatipowerModule } {
  const locked = lockedCoreModuleForRole(role);
  if (!locked) return { modules, defaultModule };
  const shared = canHaveSharedModules(role) ? SHARED_MODULES.filter((m) => modules.includes(m)) : [];
  return { modules: [locked, ...shared], defaultModule: locked };
}

/** JWT antérieur au déploiement, ou tableau vide : le parc historique est PARTNER. */
export function effectiveModules(modules?: BatipowerModule[] | null): BatipowerModule[] {
  return modules && modules.length > 0 ? modules : ['PARTNER'];
}

/** Module par défaut valide : celui demandé s'il fait partie des modules, sinon le premier. */
export function pickDefaultModule(
  modules: BatipowerModule[],
  wanted?: BatipowerModule | null,
): BatipowerModule {
  return wanted && modules.includes(wanted) ? wanted : (modules[0] ?? 'PARTNER');
}

/** Coche ou décoche un module en gardant l'ordre canonique et un module par défaut cohérent. */
export function toggleModule(
  modules: BatipowerModule[],
  defaultModule: BatipowerModule,
  id: BatipowerModule,
): { modules: BatipowerModule[]; defaultModule: BatipowerModule } {
  const has = modules.includes(id);
  if (has && modules.length === 1) return { modules, defaultModule };
  const next = has ? modules.filter((m) => m !== id) : [...modules, id];
  const ordered = [...CORE_MODULES, ...SHARED_MODULES].filter((m) => next.includes(m));
  const core = ordered.filter((m) => CORE_MODULES.includes(m));
  const pool = core.length ? core : ordered;
  return { modules: ordered, defaultModule: pool.includes(defaultModule) ? defaultModule : (pool[0] ?? 'PARTNER') };
}

/** Le module MARQUE d'un responsable de marque découle du rôle : retiré quand le compte le quitte. */
function withoutBrandModule(
  modules: BatipowerModule[],
  defaultModule: BatipowerModule,
): { modules: BatipowerModule[]; defaultModule: BatipowerModule } {
  const rest = modules.filter((m) => m !== 'MARQUE');
  const next: BatipowerModule[] = rest.length ? rest : ['PARTNER'];
  return { modules: next, defaultModule: next.includes(defaultModule) ? defaultModule : (next[0] ?? 'PARTNER') };
}

// ─── Rattachement partenaire ─────────────────────────────────────────────────

/** Un compte « partenaire » (module PARTNER, hors SUPERADMIN) doit être rattaché à une filiale. */
export function needsSubsidiary(role: AppUserRole, modules: BatipowerModule[]): boolean {
  return role !== 'SUPERADMIN' && modules.includes('PARTNER');
}

/** Une filiale est sélectionnable si elle et son distributeur sont actifs (ou si c'est la valeur enregistrée). */
export function selectableSubsidiaries(
  options: SubsidiaryOption[] | undefined,
  currentId?: string | null,
): SubsidiaryOption[] {
  return (options ?? []).filter((o) => (o.isActive && o.distributorActive) || o.id === currentId);
}

/** Entrepôts distributeurs actifs sans filiale : non sélectionnables pour un rattachement. */
export function warehousesWithoutSubsidiary(
  warehouses: DistributorWarehouseOption[] | undefined,
  subsidiaries: SubsidiaryOption[] | undefined,
): DistributorWarehouseOption[] {
  const withSubsidiary = new Set((subsidiaries ?? []).map((s) => s.distributorWarehouseId));
  return (warehouses ?? []).filter((w) => w.distributorActive && !withSubsidiary.has(w.id));
}

/** Clé de l'entrepôt d'une filiale : valeur de l'enum, sinon code de l'entrepôt libre (ex. LILLE). */
export function subsidiaryWarehouseKey(sub: SubsidiaryOption | undefined): string | null {
  return sub ? (sub.warehouse ?? sub.warehouseCode ?? null) : null;
}

// ─── Entrepôts historiques ───────────────────────────────────────────────────

export type WarehouseCapability = 'PREPARATION' | 'STOCK_COLUMNS' | 'DEP';

interface LegacyWarehouse {
  value: Warehouse;
  label: string;
  capabilities: readonly WarehouseCapability[];
  supportsEbatpro: boolean;
}

/** Entrepôts historiques (miroir de `FALLBACK_WAREHOUSE_CATALOG`), dans l'ordre d'affichage du web. */
export const LEGACY_WAREHOUSES: readonly LegacyWarehouse[] = [
  { value: 'FLEVY', label: 'Flevy', capabilities: ['PREPARATION', 'STOCK_COLUMNS', 'DEP'], supportsEbatpro: true },
  { value: 'DOMBASLE', label: 'Dombasle', capabilities: ['PREPARATION', 'STOCK_COLUMNS', 'DEP'], supportsEbatpro: true },
  { value: 'NANCY', label: 'Nancy', capabilities: ['PREPARATION'], supportsEbatpro: true },
  { value: 'QG_BATIPOWER', label: 'QG Batipower', capabilities: ['PREPARATION', 'STOCK_COLUMNS'], supportsEbatpro: false },
  { value: 'NICODEME', label: 'Nicodème', capabilities: [], supportsEbatpro: true },
  { value: 'FBA_AMAZON', label: 'FBA Amazon', capabilities: [], supportsEbatpro: false },
];

/** Rattachement d'un compte interne (écriture) : sans NICODEME, comme le web. */
export const ASSIGNABLE_WAREHOUSES = LEGACY_WAREHOUSES.filter((w) => w.value !== 'NICODEME');

/** Valeurs de l'enum ayant la capacité demandée, dans l'ordre du catalogue. */
export function legacyWarehousesWithCapability(capability: WarehouseCapability): Warehouse[] {
  return LEGACY_WAREHOUSES.filter((w) => w.capabilities.includes(capability)).map((w) => w.value);
}

/** Libellé d'un code d'entrepôt : catalogue historique, sinon le code lui-même. */
export function warehouseLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return LEGACY_WAREHOUSES.find((w) => w.value === code)?.label ?? code;
}

/** Un entrepôt de distributeur peut porter des comptes eBatPro, sauf s'il est lié à QG / FBA. */
export function warehouseSupportsEbatpro(warehouse: Warehouse | null): boolean {
  if (warehouse === null) return true;
  return LEGACY_WAREHOUSES.find((w) => w.value === warehouse)?.supportsEbatpro ?? true;
}

// ─── Catégories ──────────────────────────────────────────────────────────────

export const CATEGORY_VALUES: readonly CategoryType[] = [
  'ELECTRICITE',
  'VENTILATION',
  'PLOMBERIE',
  'CHAUFFAGE',
  'SANITAIRE',
  'OUTILLAGE',
  'CARRELAGE',
  'PHOTO',
];

export const CATEGORY_LABELS: Record<string, string> = {
  ELECTRICITE: 'Électricité',
  VENTILATION: 'Ventilation',
  PLOMBERIE: 'Plomberie',
  CHAUFFAGE: 'Chauffage',
  SANITAIRE: 'Sanitaire',
  OUTILLAGE: 'Outillage',
  CARRELAGE: 'Carrelage',
  PHOTO: 'Photo',
};

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

// ─── Accès marque ────────────────────────────────────────────────────────────

export interface BrandAccessValue {
  brands: string[];
  brandPlan: BrandPlan | null;
  brandAlertFrequency: BrandAlertFrequency;
}

export const BRAND_PLAN_LABELS: Record<BrandPlan, string> = {
  ESSENTIEL: 'Essentiel',
  PREMIUM: 'Premium',
};

export const BRAND_PLAN_DESCRIPTIONS: Record<BrandPlan, string> = {
  ESSENTIEL: 'Suivi des prix et alertes, 90 jours d’historique.',
  PREMIUM: 'Politique prix, vendeurs, rapports, e-mails, 365 jours d’historique.',
};

export const BRAND_ALERT_FREQUENCY_LABELS: Record<BrandAlertFrequency, string> = {
  NONE: 'Aucune',
  INSTANT: 'Immédiate',
  DAILY: 'Quotidienne',
  WEEKLY: 'Hebdomadaire',
};

export function brandAccessFromUser(user?: {
  brands?: string[];
  brandPlan?: BrandPlan | null;
  brandAlertFrequency?: BrandAlertFrequency;
}): BrandAccessValue {
  return {
    brands: user?.brands ?? [],
    brandPlan: user?.brandPlan ?? null,
    brandAlertFrequency: user?.brandAlertFrequency ?? 'DAILY',
  };
}

/** Message d'erreur à afficher, ou `null` si la saisie est valide (mêmes règles que le back). */
export function validateBrandAccess(value: BrandAccessValue): string | null {
  if (value.brands.length === 0) return 'Sélectionnez au moins une marque pour un responsable de marque';
  if (!value.brandPlan) return 'L’offre (Essentiel ou Premium) est obligatoire pour un responsable de marque';
  return null;
}

// ─── Formulaire d'accès (inscription approuvée, utilisateur créé ou modifié) ─

export interface AccessFormValue {
  role: AppUserRole;
  code: string;
  categoryTypes: CategoryType[];
  warehouse: Warehouse | '';
  subsidiaryId: string;
  modules: BatipowerModule[];
  defaultModule: BatipowerModule;
  brandAccess: BrandAccessValue;
}

/** Applique un changement de rôle : cloisonnement des modules, nettoyage du module MARQUE. */
export function changeRole(prev: AccessFormValue, role: AppUserRole): AccessFormValue {
  if (role === 'MANAGER') return { ...prev, role, modules: ['HUB'], defaultModule: 'HUB' };
  if (role === 'VERIFICATEUR_BL') {
    return { ...prev, role, modules: ['PARTNER'], defaultModule: 'PARTNER' };
  }
  if (role === 'RESPONSABLE_MARQUE') return { ...prev, role };
  return {
    ...prev,
    ...(prev.role === 'RESPONSABLE_MARQUE' ? withoutBrandModule(prev.modules, prev.defaultModule) : {}),
    role,
  };
}

/** Applique le choix d'une filiale : l'entrepôt s'en déduit s'il fait partie des entrepôts assignables. */
export function changeSubsidiary(
  prev: AccessFormValue,
  subsidiaryId: string,
  sub: SubsidiaryOption | undefined,
): AccessFormValue {
  if (!subsidiaryId) return { ...prev, subsidiaryId: '' };
  const derived =
    sub?.warehouse && ASSIGNABLE_WAREHOUSES.some((w) => w.value === sub.warehouse) ? sub.warehouse : '';
  return { ...prev, subsidiaryId, warehouse: derived };
}

/** Entrepôt effectif d'un compte : valeur saisie, sinon celui de la filiale choisie. */
export function effectiveWarehouse(value: AccessFormValue, sub: SubsidiaryOption | undefined): string {
  return value.warehouse || subsidiaryWarehouseKey(sub) || '';
}

/**
 * Valide le formulaire d'accès avant envoi (règles de `UserPanel.handleSubmit` du web).
 * Renvoie le message à afficher, ou `null` si la saisie est valide.
 */
export function validateAccessForm(
  value: AccessFormValue,
  sub: SubsidiaryOption | undefined,
): string | null {
  if (value.role === 'RESPONSABLE_MARQUE') return validateBrandAccess(value.brandAccess);

  const warehouse = effectiveWarehouse(value, sub);
  const needsWarehouse = roleNeedsWarehouse(value.role);
  if (needsWarehouse && !warehouse) {
    return sub
      ? `La filiale choisie (${sub.name} — ${sub.warehouseName}) n'est rattachée à aucun entrepôt compatible avec ce rôle`
      : 'Un entrepôt rattaché est obligatoire pour ce rôle';
  }
  // Entrepôt libre d'une filiale (ex. LILLE) : seuls alertes, annulations, discussions et préparation.
  if (needsWarehouse && !!sub && !sub.warehouse && value.role !== 'PREPARATEUR') {
    return (
      `Le rôle choisi n'est pas disponible sur l'entrepôt ${sub.warehouseName} (filiale ${sub.name}) : ` +
      "cet entrepôt n'a que les alertes, annulations, discussions et la préparation. " +
      'Choisissez le rôle Logistique, Responsable plateforme ou Préparateur.'
    );
  }
  if (
    value.role === 'VERIFICATEUR_BL' &&
    !(legacyWarehousesWithCapability('DEP') as string[]).includes(warehouse)
  ) {
    return sub
      ? 'La filiale choisie n’est pas rattachée à Dombasle ou Flévy'
      : 'Le Vérificateur BL doit être rattaché à Dombasle ou Flévy';
  }
  if (
    value.role === 'DIRECTION' &&
    warehouse &&
    !(legacyWarehousesWithCapability('STOCK_COLUMNS') as string[]).includes(warehouse)
  ) {
    return sub
      ? 'La filiale choisie n’est pas rattachée à Dombasle, Flévy ou QG Batipower'
      : 'La Direction doit être rattachée à Dombasle, Flévy ou QG Batipower';
  }
  const { modules } = assignedModulesForRole(value.role, value.modules, value.defaultModule);
  if (needsSubsidiary(value.role, modules) && !value.subsidiaryId) {
    return 'Une filiale est obligatoire pour un compte partenaire';
  }
  return null;
}

/** Champs d'accès à envoyer à l'approbation d'une inscription ou à la création d'un compte. */
export function accessPayload(value: AccessFormValue, mode: 'create'): ApproveRegistrationPayload;
/** Champs d'accès à envoyer à la modification d'un compte (les champs vidés sont envoyés à `null`). */
export function accessPayload(value: AccessFormValue, mode: 'update'): UpdateUserPayload;
export function accessPayload(
  value: AccessFormValue,
  mode: 'create' | 'update',
): ApproveRegistrationPayload | UpdateUserPayload {
  if (value.role === 'RESPONSABLE_MARQUE') {
    // Code, catégories, entrepôt et filiale ne s'appliquent pas : omis à la création, vidés en édition.
    const brandFields = {
      role: value.role,
      modules: ['MARQUE'] as BatipowerModule[],
      defaultModule: 'MARQUE' as BatipowerModule,
      brands: value.brandAccess.brands,
      brandPlan: value.brandAccess.brandPlan,
      brandAlertFrequency: value.brandAccess.brandAlertFrequency,
    };
    return mode === 'create'
      ? brandFields
      : { ...brandFields, code: null, categoryTypes: [], warehouse: null, subsidiaryId: null };
  }

  const { modules, defaultModule } = assignedModulesForRole(
    value.role,
    value.modules,
    value.defaultModule,
  );
  if (mode === 'create') {
    return {
      role: value.role,
      code: value.code || undefined,
      categoryTypes: value.categoryTypes.length ? value.categoryTypes : undefined,
      warehouse: value.warehouse || undefined,
      subsidiaryId: value.subsidiaryId || undefined,
      modules,
      defaultModule,
    };
  }
  return {
    role: value.role,
    code: value.code || null,
    categoryTypes: value.categoryTypes,
    warehouse: value.warehouse || null,
    subsidiaryId: value.subsidiaryId || null,
    modules,
    defaultModule,
  };
}
