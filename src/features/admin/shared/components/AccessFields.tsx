import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { TextField } from '@/components/ui';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { MODULES } from '@/modules/registry';
import { roleLabel } from '@/modules/roles';
import { makeStyles, spacing, typography } from '@/theme';
import type { BrandAlertFrequency, BrandPlan, SubsidiaryOption, Warehouse } from '@/types/admin';
import type { AppUserRole, BatipowerModule } from '@/types/user';

import { useBrandOptions, useSubsidiaryOptions, useWarehouseOptions } from '../../hooks/useAdminOptions';
import {
  ASSIGNABLE_WAREHOUSES,
  BRAND_ALERT_FREQUENCY_LABELS,
  BRAND_PLAN_DESCRIPTIONS,
  BRAND_PLAN_LABELS,
  CATEGORY_VALUES,
  CORE_MODULES,
  SHARED_MODULES,
  assignedModulesForRole,
  canHaveSharedModules,
  categoryLabel,
  changeRole,
  changeSubsidiary,
  lockedCoreModuleForRole,
  needsSubsidiary,
  roleNeedsWarehouse,
  selectableSubsidiaries,
  subsidiaryWarehouseKey,
  toggleModule,
  warehouseLabel,
  warehouseRoleHint,
  warehousesWithoutSubsidiary,
  type AccessFormValue,
} from '../accessRules';
import { Field, Notice, SelectField, ToggleRow } from './FormParts';

type AccessFieldsProps = {
  value: AccessFormValue;
  onChange: (next: AccessFormValue) => void;
  /** Rôles proposés (les inscriptions excluent SUPERADMIN et PREPARATEUR). */
  roles: readonly AppUserRole[];
  /** Filiale déjà enregistrée sur le compte : reste sélectionnable même inactive. */
  currentSubsidiaryId?: string | null;
  /** Compte existant dont la colonne entrepôt est vide (le back l'écrira à l'enregistrement). */
  warehouseNotSavedYet?: boolean;
};

/**
 * Bloc « accès » d'un compte, partagé par l'approbation d'une inscription et par la création /
 * édition d'un utilisateur : rôle, modules (ou accès marque pour un responsable de marque), code
 * acheteur, catégories, filiale partenaire et entrepôt. Les règles viennent de `accessRules.ts`.
 */
export function AccessFields({
  value,
  onChange,
  roles,
  currentSubsidiaryId,
  warehouseNotSavedYet,
}: AccessFieldsProps) {
  const styles = useStyles();
  const isBrandManager = value.role === 'RESPONSABLE_MARQUE';
  const subsidiaryQuery = useSubsidiaryOptions();
  const warehouseQuery = useWarehouseOptions();
  const subsidiaryOptions = subsidiaryQuery.data;
  const selectedSubsidiary = subsidiaryOptions?.find((o) => o.id === value.subsidiaryId);
  const assigned = assignedModulesForRole(value.role, value.modules, value.defaultModule);
  const subsidiaryRequired = needsSubsidiary(value.role, assigned.modules);
  const warehouseRequired = roleNeedsWarehouse(value.role);
  const lockedCore = lockedCoreModuleForRole(value.role);

  const emptyWarehouses = useMemo(
    () => warehousesWithoutSubsidiary(warehouseQuery.data, subsidiaryOptions),
    [warehouseQuery.data, subsidiaryOptions],
  );

  const subsidiaryChoices = useMemo(
    () => buildSubsidiaryChoices(selectableSubsidiaries(subsidiaryOptions, currentSubsidiaryId)),
    [subsidiaryOptions, currentSubsidiaryId],
  );

  const subsidiaryWarehouse = subsidiaryWarehouseKey(selectedSubsidiary);
  const subsidiaryOnFreeWarehouse = !!selectedSubsidiary && !selectedSubsidiary.warehouse;

  return (
    <View style={styles.root}>
      <SelectField
        label="Rôle"
        required
        valueLabel={roleLabel(value.role)}
        options={roles.map((role) => ({ value: role, label: roleLabel(role) }))}
        selected={[value.role]}
        searchable={false}
        onToggle={(role) => onChange(changeRole(value, role as AppUserRole))}
      />

      {isBrandManager ? (
        <BrandAccessFields value={value} onChange={onChange} />
      ) : (
        <>
          <ModuleAccessFields
            modules={assigned.modules}
            defaultModule={assigned.defaultModule}
            lockedCore={lockedCore}
            allowShared={canHaveSharedModules(value.role)}
            onChange={(modules, defaultModule) => onChange({ ...value, modules, defaultModule })}
          />
          {value.role === 'MANAGER' ? (
            <Notice>Le Manager est cloisonné au module HUB (MARQUE et POWER restent ouvrables).</Notice>
          ) : null}
          {value.role === 'VERIFICATEUR_BL' ? (
            <Notice>Le Vérificateur BL est cloisonné au module PARTNER.</Notice>
          ) : null}

          <TextField
            label="Code acheteur"
            value={value.code}
            onChangeText={(code) => onChange({ ...value, code: code.toUpperCase() })}
            placeholder="ex : JD"
            maxLength={20}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={styles.hintInline}>Initiales ou code court unique, facultatif.</Text>

          <SelectField
            label="Catégories"
            valueLabel={value.categoryTypes.map(categoryLabel).join(', ')}
            placeholder="Sélectionner des catégories"
            options={CATEGORY_VALUES.map((c) => ({ value: c, label: categoryLabel(c) }))}
            selected={value.categoryTypes}
            multiple
            searchable={false}
            onToggle={(cat) =>
              onChange({
                ...value,
                categoryTypes: value.categoryTypes.includes(cat)
                  ? value.categoryTypes.filter((c) => c !== cat)
                  : [...value.categoryTypes, cat],
              })
            }
          />

          <SelectField
            label="Filiale partenaire"
            required={subsidiaryRequired}
            valueLabel={
              selectedSubsidiary
                ? `${selectedSubsidiary.name} — ${selectedSubsidiary.warehouseName}`
                : ''
            }
            placeholder="Aucune"
            noneLabel="Aucune"
            options={[
              ...subsidiaryChoices,
              ...emptyWarehouses.map((w) => ({
                value: `empty-${w.id}`,
                label: `${w.name} — aucune filiale`,
                detail: w.distributorName,
                disabled: true,
              })),
            ]}
            selected={value.subsidiaryId ? [value.subsidiaryId] : []}
            loading={subsidiaryQuery.isLoading}
            error={subsidiaryQuery.error}
            onRetry={() => void subsidiaryQuery.refetch()}
            onToggle={(id) => onChange(changeSubsidiary(value, id, subsidiaryOptions?.find((o) => o.id === id)))}
            hint={
              subsidiaryRequired
                ? 'Obligatoire : tout compte partenaire (module PARTNER, hors super admin) doit être rattaché à une filiale. Les filiales se paramètrent dans l’onglet Partenaires.'
                : null
            }
            warning={
              emptyWarehouses.length > 0
                ? `Un entrepôt distributeur n'apparaît ici qu'une fois une filiale créée (${emptyWarehouses
                    .map((w) => w.name)
                    .join(', ')}).`
                : null
            }
          />

          {selectedSubsidiary ? (
            <Field
              label="Entrepôt rattaché"
              required={warehouseRequired}
              hint={`Déduit de la filiale « ${selectedSubsidiary.name} » : le rattachement à un entrepôt de distributeur passe uniquement par la filiale. Pour choisir un entrepôt historique, retirez la filiale.`}
              warning={
                warehouseNotSavedYet
                  ? `Entrepôt ${subsidiaryWarehouse ?? ''} non enregistré sur le compte : enregistrer la fiche pour l'appliquer.`
                  : null
              }
            >
              <Text style={styles.readOnly}>{selectedSubsidiary.warehouseName}</Text>
              {subsidiaryOnFreeWarehouse && subsidiaryWarehouse ? (
                <Text style={styles.hintInline}>
                  Entrepôt de filiale ({subsidiaryWarehouse}) : le compte y sera rattaché automatiquement et
                  n’aura que les alertes, annulations, discussions et la préparation, sans palettes.
                </Text>
              ) : null}
              {warehouseRoleHint(value.role) ? (
                <Text style={styles.hintInline}>{warehouseRoleHint(value.role)}</Text>
              ) : null}
            </Field>
          ) : (
            <SelectField
              label="Entrepôt rattaché"
              required={warehouseRequired}
              valueLabel={value.warehouse ? warehouseLabel(value.warehouse) : ''}
              placeholder="Aucun"
              noneLabel="Aucun"
              searchable={false}
              options={ASSIGNABLE_WAREHOUSES.map((w) => ({ value: w.value, label: w.label }))}
              selected={value.warehouse ? [value.warehouse] : []}
              onToggle={(warehouse) => onChange({ ...value, warehouse: warehouse as Warehouse | '' })}
              hint={
                warehouseRoleHint(value.role) ??
                'Entrepôts historiques uniquement (rôles internes). Pour un entrepôt distributeur, utilisez « Filiale partenaire ».'
              }
            />
          )}
        </>
      )}
    </View>
  );
}

/** Filiales sélectionnables, triées par distributeur : le distributeur est affiché sous le nom. */
function buildSubsidiaryChoices(options: SubsidiaryOption[]) {
  return [...options]
    .sort((a, b) => a.distributorName.localeCompare(b.distributorName, 'fr'))
    .map((o) => ({
      value: o.id,
      label: `${o.name} — ${o.warehouseName}${!o.isActive || !o.distributorActive ? ' (inactive)' : ''}`,
      detail: o.distributorName,
    }));
}

function ModuleAccessFields({
  modules,
  defaultModule,
  lockedCore,
  allowShared,
  onChange,
}: {
  modules: BatipowerModule[];
  defaultModule: BatipowerModule;
  lockedCore: BatipowerModule | null;
  allowShared: boolean;
  onChange: (modules: BatipowerModule[], defaultModule: BatipowerModule) => void;
}) {
  const styles = useStyles();
  // Le module par défaut est choisi parmi PARTNER / HUB ; à défaut, le premier module attribué.
  const defaultOptions = modules.filter((id) => CORE_MODULES.includes(id));
  const selectableDefaults = defaultOptions.length ? defaultOptions : modules;
  const currentDefault: BatipowerModule = selectableDefaults.includes(defaultModule)
    ? defaultModule
    : (selectableDefaults[0] ?? 'PARTNER');

  const toggle = (id: BatipowerModule) => {
    const next = toggleModule(modules, defaultModule, id);
    onChange(next.modules, next.defaultModule);
  };

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>Modules</Text>
      {CORE_MODULES.map((id) => (
        <ToggleRow
          key={id}
          label={MODULES[id].fullName}
          description={MODULES[id].tagline}
          value={modules.includes(id)}
          disabled={!!lockedCore}
          onValueChange={() => toggle(id)}
        />
      ))}
      {allowShared ? (
        <>
          <Text style={[styles.groupTitle, styles.groupTitleSpaced]}>Modules partagés</Text>
          {SHARED_MODULES.map((id) => (
            <ToggleRow
              key={id}
              label={MODULES[id].fullName}
              description={MODULES[id].tagline}
              value={modules.includes(id)}
              onValueChange={() => toggle(id)}
            />
          ))}
          <Text style={styles.hintInline}>
            MARQUE : toutes les marques en offre Premium. POWER : consultation seule (comparateur et
            tableau de bord), sans paramétrage ni analyse de prix.
          </Text>
        </>
      ) : null}
      <SelectField
        label="Module par défaut"
        valueLabel={MODULES[currentDefault].fullName}
        disabled={!!lockedCore}
        searchable={false}
        options={selectableDefaults.map((id) => ({ value: id, label: MODULES[id].fullName }))}
        selected={[currentDefault]}
        onToggle={(id) => onChange(modules, id as BatipowerModule)}
      />
    </View>
  );
}

function BrandAccessFields({
  value,
  onChange,
}: {
  value: AccessFormValue;
  onChange: (next: AccessFormValue) => void;
}) {
  const styles = useStyles();
  const query = useBrandOptions(true);
  const access = value.brandAccess;
  const setAccess = (patch: Partial<typeof access>) =>
    onChange({ ...value, brandAccess: { ...access, ...patch } });

  const productCounts = useMemo(
    () => new Map((query.data ?? []).map((o) => [o.name, o.productCount])),
    [query.data],
  );
  const totalProducts = access.brands.reduce((sum, b) => sum + (productCounts.get(b) ?? 0), 0);

  return (
    <View style={styles.group}>
      <Notice>
        Module MARQUE uniquement : le responsable de marque est cloisonné au suivi des prix de ses marques.
      </Notice>

      <SelectField
        label="Marques suivies"
        required
        valueLabel={access.brands.join(', ')}
        placeholder="Sélectionner des marques"
        multiple
        loading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        options={(query.data ?? []).map((o) => ({
          value: o.name,
          label: o.name,
          detail: `${o.productCount} produit${o.productCount > 1 ? 's' : ''}`,
        }))}
        selected={access.brands}
        onToggle={(name) =>
          setAccess({
            brands: access.brands.includes(name)
              ? access.brands.filter((b) => b !== name)
              : [...access.brands, name],
          })
        }
        hint={
          access.brands.length === 0
            ? 'Au moins une marque est obligatoire.'
            : `${access.brands.length} marque(s) · ${totalProducts} produit(s) suivis.`
        }
      />

      <Field
        label="Offre"
        required
        hint={access.brandPlan ? BRAND_PLAN_DESCRIPTIONS[access.brandPlan] : null}
      >
        <SegmentedControl<BrandPlan>
          segments={[
            { key: 'ESSENTIEL', label: BRAND_PLAN_LABELS.ESSENTIEL },
            { key: 'PREMIUM', label: BRAND_PLAN_LABELS.PREMIUM },
          ]}
          value={access.brandPlan ?? ('' as BrandPlan)}
          onChange={(brandPlan) => setAccess({ brandPlan })}
        />
      </Field>

      <SelectField
        label="Alertes e-mail"
        valueLabel={BRAND_ALERT_FREQUENCY_LABELS[access.brandAlertFrequency]}
        searchable={false}
        options={(Object.keys(BRAND_ALERT_FREQUENCY_LABELS) as BrandAlertFrequency[]).map((f) => ({
          value: f,
          label: BRAND_ALERT_FREQUENCY_LABELS[f],
        }))}
        selected={[access.brandAlertFrequency]}
        onToggle={(f) => setAccess({ brandAlertFrequency: f as BrandAlertFrequency })}
        warning={
          access.brandPlan === 'ESSENTIEL' && access.brandAlertFrequency !== 'NONE'
            ? 'E-mails réservés à l’offre Premium : en Essentiel, les alertes restent visibles dans l’application uniquement.'
            : null
        }
        hint={access.brandPlan === 'ESSENTIEL' ? null : 'E-mails réservés à l’offre Premium.'}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.xl },
  group: { gap: spacing.md },
  groupTitle: { ...typography.label, color: t.textMuted },
  groupTitleSpaced: { marginTop: spacing.sm },
  hintInline: { fontSize: 12, lineHeight: 17, color: t.textSubtle },
  readOnly: {
    fontSize: 15,
    color: t.textMuted,
    paddingVertical: spacing.sm,
  },
}));
