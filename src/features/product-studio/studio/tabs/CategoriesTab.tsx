import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Check, ChevronDown, ChevronRight, Plus, RotateCcw, Star } from 'lucide-react-native';

import { Button } from '@/components/ui';
import type { StudioCategoryProposalItem } from '@/types/hubStudio';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import {
  addCategories,
  buildCategoryTree,
  diffCategories,
  expandedForSelection,
  filterCategories,
  initialDefault,
  initialSelection,
  pathOf,
  resolveDefault,
  selectedDescendantCounts,
  toggleCategory,
  type CategoryTree,
} from '../../domain/category-tree';
import { categoryProposalOf } from '../../domain/model';
import { useStudioCategoryTree } from '../../hooks/useStudioQueries';
import { RefreshBar } from '../RefreshBar';
import { useStudio } from '../StudioContext';
import { StudioCard, StudioHeading, StudioInput } from '../ui';

const NO_IDS: number[] = [];
const NO_ITEMS: StudioCategoryProposalItem[] = [];

type TreeRowsProps = {
  tree: CategoryTree;
  ids: number[];
  depth: number;
  selected: ReadonlySet<number>;
  expanded: ReadonlySet<number>;
  visible: ReadonlySet<number> | null;
  counts: ReadonlyMap<number, number>;
  currentIds: ReadonlySet<number>;
  suggestedIds: ReadonlySet<number>;
  disabled: boolean;
  onToggle: (id: number) => void;
  onExpand: (id: number) => void;
};

function TreeRows({ ids, depth, visible, expanded, ...rest }: TreeRowsProps) {
  const styles = useStyles();
  const t = useTheme();
  const { tree, selected, counts, currentIds, suggestedIds, disabled, onToggle, onExpand } = rest;
  return (
    <>
      {ids
        .filter((id) => !visible || visible.has(id))
        .map((id) => {
          const node = tree.byId.get(id);
          if (!node) return null;
          const children = tree.childrenOf.get(id) ?? [];
          const open = visible ? children.some((child) => visible.has(child)) : expanded.has(id);
          const checked = selected.has(id);
          const hiddenSelected = !open ? (counts.get(id) ?? 0) : 0;
          return (
            <View key={id}>
              <View
                style={[
                  styles.treeRow,
                  { paddingLeft: spacing.xs + depth * 18 },
                  checked && { backgroundColor: withAlpha(t.accent, 0.1) },
                ]}
              >
                {children.length ? (
                  <Pressable
                    accessibilityLabel={open ? 'Replier' : 'Déplier'}
                    hitSlop={6}
                    onPress={() => onExpand(id)}
                    style={styles.chevron}
                  >
                    {open ? (
                      <ChevronDown size={16} color={t.textMuted} />
                    ) : (
                      <ChevronRight size={16} color={t.textMuted} />
                    )}
                  </Pressable>
                ) : (
                  <View style={styles.chevron} />
                )}
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked, disabled }}
                  disabled={disabled}
                  onPress={() => onToggle(id)}
                  style={styles.treeMain}
                >
                  <View
                    style={[
                      styles.box,
                      checked && { backgroundColor: t.accent, borderColor: t.accent },
                    ]}
                  >
                    {checked ? <Check size={12} color={t.onAccent} strokeWidth={3} /> : null}
                  </View>
                  <Text
                    style={[styles.treeName, checked && { fontWeight: '700', color: t.text }]}
                    numberOfLines={2}
                  >
                    {node.name}
                  </Text>
                </Pressable>
                {hiddenSelected > 0 ? <Text style={styles.count}>{hiddenSelected}</Text> : null}
                {currentIds.has(id) ? <Text style={styles.tag}>actuelle</Text> : null}
                {suggestedIds.has(id) ? (
                  <Text style={[styles.tag, { color: t.info }]}>IA</Text>
                ) : null}
              </View>
              {open && children.length > 0 ? (
                <TreeRows
                  {...rest}
                  ids={children}
                  depth={depth + 1}
                  visible={visible}
                  expanded={expanded}
                />
              ) : null}
            </View>
          );
        })}
    </>
  );
}

/**
 * Onglet Catégories : arbre complet des catégories PrestaShop. Cocher ajoute (avec ses parents),
 * décocher retire (avec ses sous-catégories) ; l'étoile choisit la catégorie principale.
 */
export function CategoriesTab() {
  const styles = useStyles();
  const t = useTheme();
  const { draft, blocks, reference } = useStudio();
  const proposal = categoryProposalOf(draft);
  const treeQuery = useStudioCategoryTree(reference, Boolean(proposal));
  const tree = useMemo(() => buildCategoryTree(treeQuery.data ?? []), [treeQuery.data]);
  const ready = treeQuery.isSuccess;

  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [wantedDefault, setWantedDefault] = useState<number | undefined>();
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [query, setQuery] = useState('');

  // Resynchronise la saisie locale sur le serveur (recalcul, enregistrement) : ajustement d'état
  // pendant le rendu, déclenché uniquement quand la proposition serveur change.
  const serverKey = JSON.stringify([
    ready,
    proposal?.currentIds,
    proposal?.currentDefaultId,
    proposal?.finalIds,
    proposal?.defaultId,
    proposal?.applyDefault,
    proposal?.suggestedDefaultId,
    proposal?.items.map((item) => [item.categoryId, item.selected]),
  ]);
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (ready && syncedKey !== serverKey) {
    const next = initialSelection(proposal, tree);
    setSyncedKey(serverKey);
    setSelected(next);
    setWantedDefault(initialDefault(proposal));
    setExpanded(expandedForSelection(next, tree));
  }

  const locked = blocks.saveCategory.isPending || blocks.refreshCategory.isPending;
  const currentIds = proposal?.currentIds ?? NO_IDS;
  const currentSet = new Set(currentIds);
  const items = proposal?.items ?? NO_ITEMS;
  const suggestedSet = new Set(items.map((item) => item.categoryId));
  const defaultId = resolveDefault(selected, wantedDefault, proposal?.currentDefaultId, tree);
  const diff = diffCategories(currentIds, selected, proposal?.currentDefaultId, defaultId);
  const counts = useMemo(() => selectedDescendantCounts(selected, tree), [selected, tree]);
  const filter = useMemo(() => filterCategories(query, tree), [query, tree]);

  const toggle = useCallback(
    (id: number) => setSelected((prev) => toggleCategory(prev, id, tree)),
    [tree],
  );
  const toggleExpand = useCallback(
    (id: number) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );

  const sortedSelected = useMemo(
    () => [...selected].sort((a, b) => pathOf(a, tree).localeCompare(pathOf(b, tree), 'fr')),
    [selected, tree],
  );
  const removed = currentIds.filter((id) => !selected.has(id));
  const dirty = diff.added.length > 0 || removed.length > 0 || diff.defaultChanged;
  const pendingSuggestions = items.filter(
    (item) => !selected.has(item.categoryId) && tree.byId.has(item.categoryId),
  );

  return (
    <View style={styles.root}>
      <RefreshBar
        pending={blocks.refreshCategory.isPending}
        disabled={locked}
        onRefresh={() => blocks.refreshCategory.mutate()}
      >
        Cochez les catégories du produit : cocher une sous-catégorie coche ses parents, décocher une
        catégorie la retire de PrestaShop au déploiement (avec ses sous-catégories). « Recalculer »
        relance les suggestions IA.
      </RefreshBar>

      {!proposal ? <Text style={styles.empty}>Aucune proposition de catégorie.</Text> : null}
      {proposal && treeQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={t.accent} />
          <Text style={styles.hint}>Chargement de l’arbre des catégories…</Text>
        </View>
      ) : null}
      {proposal && treeQuery.isError ? (
        <View style={styles.loading}>
          <Text style={styles.hint}>Impossible de charger l’arbre des catégories.</Text>
          <Button label="Réessayer" variant="outline" onPress={() => void treeQuery.refetch()} />
        </View>
      ) : null}
      {proposal && ready && tree.byId.size === 0 ? (
        <Text style={styles.empty}>Aucune catégorie disponible.</Text>
      ) : null}

      {proposal && ready && tree.byId.size > 0 ? (
        <>
          {pendingSuggestions.length > 0 ? (
            <View style={styles.suggest}>
              <Text style={styles.label}>Suggestions IA</Text>
              <View style={styles.chips}>
                {pendingSuggestions.map((item) => (
                  <Pressable
                    key={item.categoryId}
                    disabled={locked}
                    onPress={() => setSelected((prev) => addCategories(prev, [item.categoryId], tree))}
                    style={[styles.chip, { borderColor: withAlpha(t.info, 0.5) }]}
                  >
                    <Plus size={13} color={t.info} />
                    <Text style={[styles.chipText, { color: t.info }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <StudioCard>
            <StudioInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une catégorie…"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {filter && filter.matches.size === 0 ? (
              <Text style={styles.empty}>Aucune catégorie ne correspond.</Text>
            ) : (
              <TreeRows
                tree={tree}
                ids={tree.roots}
                depth={0}
                selected={selected}
                expanded={expanded}
                visible={filter?.visible ?? null}
                counts={counts}
                currentIds={currentSet}
                suggestedIds={suggestedSet}
                disabled={locked}
                onToggle={toggle}
                onExpand={toggleExpand}
              />
            )}
          </StudioCard>

          <StudioCard>
            <View style={styles.headRow}>
              <StudioHeading>{`Sélection finale (${selected.size})`}</StudioHeading>
              <Text style={styles.hint}>
                {diff.added.length} ajoutée(s), {removed.length} retirée(s)
              </Text>
            </View>
            {sortedSelected.length === 0 ? (
              <Text style={styles.empty}>Aucune catégorie sélectionnée.</Text>
            ) : null}
            {sortedSelected.map((id) => {
              const isDefault = id === defaultId;
              const added = !currentSet.has(id);
              return (
                <View
                  key={id}
                  style={[
                    styles.final,
                    added && {
                      borderColor: withAlpha(t.accent, 0.5),
                      backgroundColor: withAlpha(t.accent, 0.08),
                    },
                  ]}
                >
                  <Pressable
                    accessibilityLabel={
                      isDefault ? 'Catégorie principale' : 'Définir comme catégorie principale'
                    }
                    disabled={locked}
                    hitSlop={8}
                    onPress={() => setWantedDefault(id)}
                  >
                    <Star
                      size={20}
                      color={isDefault ? t.warning : t.textFaint}
                      fill={isDefault ? t.warning : 'transparent'}
                    />
                  </Pressable>
                  <Text style={styles.finalPath}>
                    {tree.byId.has(id) ? pathOf(id, tree) : `Catégorie #${id} (hors arbre ou désactivée)`}
                  </Text>
                  {added ? <Text style={[styles.tag, { color: t.success }]}>ajoutée</Text> : null}
                  <Pressable
                    accessibilityLabel="Retirer cette catégorie"
                    disabled={locked}
                    hitSlop={8}
                    onPress={() => toggle(id)}
                  >
                    <RotateCcw size={16} color={t.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </StudioCard>

          {diff.defaultChanged ? (
            <StudioCard tone="warning">
              <Text style={styles.warnTitle}>La catégorie principale va changer</Text>
              <Text style={styles.hint}>
                {defaultId ? pathOf(defaultId, tree) : '—'}
                {proposal.defaultReason && proposal.suggestedDefaultId === defaultId
                  ? ` — ${proposal.defaultReason}`
                  : ''}
                . Cela peut changer l’URL publique du produit.
              </Text>
            </StudioCard>
          ) : null}
          {selected.size === 0 ? (
            <StudioCard tone="danger">
              <Text style={styles.hint}>Un produit doit rester dans au moins une catégorie.</Text>
            </StudioCard>
          ) : null}

          <Button
            label={`Enregistrer les catégories${dirty ? '' : ' (aucun changement)'}`}
            loading={blocks.saveCategory.isPending}
            disabled={locked || selected.size === 0 || !defaultId}
            onPress={() =>
              defaultId && blocks.saveCategory.mutate({ finalIds: [...selected], defaultId })
            }
          />
        </>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hint: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  empty: { paddingVertical: spacing.lg, textAlign: 'center', fontSize: fontSize.xs, color: t.textSubtle },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  suggest: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: fontSize.xs, fontWeight: '600' },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingRight: spacing.sm,
    borderRadius: radius.md,
  },
  chevron: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  treeMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  treeName: { flex: 1, fontSize: fontSize.sm, color: t.textMuted },
  box: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: t.borderStrong,
  },
  count: { fontSize: 11, fontWeight: '700', color: t.accentText },
  tag: { fontSize: 10, color: t.textSubtle },
  final: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
  },
  finalPath: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.text },
  warnTitle: { fontSize: fontSize.sm, fontWeight: '800', color: t.warning },
}));
