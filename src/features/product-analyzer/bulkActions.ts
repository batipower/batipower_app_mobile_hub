import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

import { hubProductAnalyzerApi } from '@/api/hubProductAnalyzer';
import { queryClient } from '@/api/queryClient';
import type { Affaire, StagingFilters, StagingItem } from '@/types/hubProductAnalyzer';

import { advanceBulkTask, endBulkTask, isBulkTaskRunning, startBulkTask } from './bulkTaskStore';
import { apiErrorMessage } from './lib/errors';
import { canDeleteStaging, deleteBlockedReason, stagingRerunTarget } from './lib/helpers';
import { PA_ROOT } from './queryKeys';
import { clearSelection, deselectMany } from './selectionStore';
import type { QueueSeed } from './socket/types';

/**
 * Actions groupées de l'historique (lancement, affaire, DEP, relecture EbatPro, négos, suppression).
 * Ce sont de simples fonctions : elles lisent la sélection passée en paramètre, pilotent la barre de
 * progression (`bulkTaskStore`) et rafraîchissent le cache, que l'appel vienne de l'écran ou d'une feuille.
 */

const MAX_DETAIL_LINES = 8;
const EBAT_REFRESH_CONCURRENCY = 3;

const plural = (n: number, one = '', many = 's') => (n > 1 ? many : one);
const itemLabel = (item: StagingItem) => item.designation || item.codeEbat || item.ean || item.uuid;

export function refreshAnalyzerData() {
  void queryClient.invalidateQueries({ queryKey: PA_ROOT });
}

/** Boîte de confirmation (promesse) : `true` si l'utilisateur valide. */
export function confirmDialog(
  title: string,
  message: string | undefined,
  confirmLabel: string,
  destructive = false,
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export type BulkNoticeKind = 'success' | 'info' | 'error';

/** Résultat d'une action groupée : toast sur la première ligne, détail dans une alerte s'il y en a. */
export function reportBulk(kind: BulkNoticeKind, lines: string[]) {
  const [head = '', ...rest] = lines;
  if (kind === 'success') toast.success(head);
  else if (kind === 'error') toast.error(head);
  else toast(head);
  void Haptics.notificationAsync(
    kind === 'error' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
  ).catch(() => undefined);
  if (rest.length > 0) Alert.alert(head, rest.join('\n'));
}

function guardBusy(): boolean {
  if (isBulkTaskRunning()) {
    toast('Une action groupée est déjà en cours.');
    return true;
  }
  return false;
}

// ─── Lancement ───────────────────────────────────────────────────────────────

export type BulkLaunchMode = 'launch' | 'deploy';

/** Lançable en masse dès qu'il a une référence EbatPro ou une fiche catalogue déjà liée. */
export const canBulkLaunch = (item: StagingItem): boolean => !!item.codeEbat || item.batipowerId != null;

export type SelectionCategories = {
  launchable: StagingItem[];
  /** Sans référence EbatPro ni fiche catalogue : à créer un par un depuis l'analyse. */
  noReference: StagingItem[];
  alreadyLaunched: StagingItem[];
};

export function categorizeSelection(items: readonly StagingItem[]): SelectionCategories {
  const launchable: StagingItem[] = [];
  const noReference: StagingItem[] = [];
  const alreadyLaunched: StagingItem[] = [];
  for (const item of items) {
    if (item.status === 'LAUNCHED') alreadyLaunched.push(item);
    else if (canBulkLaunch(item)) launchable.push(item);
    else noReference.push(item);
  }
  return { launchable, noReference, alreadyLaunched };
}

export function describeExclusions(cat: SelectionCategories): string[] {
  const lines: string[] = [];
  if (cat.alreadyLaunched.length > 0) {
    lines.push(`${cat.alreadyLaunched.length} déjà lancé${plural(cat.alreadyLaunched.length)}`);
  }
  if (cat.noReference.length > 0) {
    lines.push(
      `${cat.noReference.length} sans référence EbatPro ni fiche catalogue (à créer un par un depuis la fiche)`,
    );
  }
  return lines;
}

const MP_KEYS = ['amazon', 'manomano', 'leroymerlin'] as const;

/**
 * « Lancer » ou « Lancer + déployer » en séquence (un appel par produit, pour ne pas saturer
 * les APIs marketplace). `depChoice` : distributeur dont la DEP est posée avant le lancement.
 */
export async function runBulkLaunch(
  mode: BulkLaunchMode,
  cat: SelectionCategories,
  depChoice: string | null,
): Promise<void> {
  if (guardBusy()) return;
  const targets = cat.launchable;
  const exclusions = describeExclusions(cat);
  if (targets.length === 0) {
    reportBulk('error', [
      `Aucun produit ${mode === 'deploy' ? 'déployable' : 'lançable'}`,
      ...exclusions,
    ]);
    return;
  }

  let errors = 0;
  let launched = 0;
  let mpSuccess = 0;
  let mpErrors = 0;
  let mpSkipped = 0;
  const failures: string[] = [];
  const notes: string[] = [];
  const done: string[] = [];
  startBulkTask(mode === 'deploy' ? 'Lancement et déploiement' : 'Lancement', targets.length);

  for (const item of targets) {
    const label = itemLabel(item);
    let failed = false;
    try {
      // Non bloquant : une DEP qui échoue ne doit pas empêcher le lancement.
      if (depChoice) await hubProductAnalyzerApi.setPlannedDep(item.uuid, depChoice, true).catch(() => undefined);
      if (mode === 'launch') {
        const res = await hubProductAnalyzerApi.launch(item.uuid);
        if (res?.success === false) {
          failed = true;
          failures.push(`${label} : ${res.message || 'lancement échoué'}`);
        } else {
          launched += 1;
          done.push(item.uuid);
        }
      } else {
        const data = await hubProductAnalyzerApi.launchAndDeploy(item.uuid);
        if (data.launch?.success === false) {
          failed = true;
          failures.push(`${label} : ${data.launch.message || 'lancement échoué'}`);
        } else {
          launched += 1;
          done.push(item.uuid);
          if (data.note) notes.push(`${label} : ${data.note}`);
          for (const mp of MP_KEYS) {
            const result = data.deploy?.[mp];
            if (!result) continue;
            if (result.status === 'success') mpSuccess += 1;
            else if (result.status === 'error') {
              mpErrors += 1;
              failures.push(`${label} (${mp}) : ${result.error || 'erreur'}`);
            } else if (result.status === 'skipped') mpSkipped += 1;
          }
        }
      }
    } catch (err) {
      failed = true;
      failures.push(`${label} : ${apiErrorMessage(err, 'erreur réseau')}`);
    }
    if (failed) errors += 1;
    advanceBulkTask(failed);
  }

  endBulkTask();
  deselectMany(done);
  refreshAnalyzerData();

  const trimmed = (list: string[]) => [
    ...list.slice(0, MAX_DETAIL_LINES),
    ...(list.length > MAX_DETAIL_LINES ? [`… et ${list.length - MAX_DETAIL_LINES} autre(s)`] : []),
  ];
  const head =
    mode === 'launch'
      ? errors > 0
        ? `${errors} lancement${plural(errors)} échoué${plural(errors)} sur ${targets.length}`
        : `${launched} produit${plural(launched)} lancé${plural(launched)}`
      : `${launched}/${targets.length} produit(s) traité(s) · ${mpSuccess} offre(s) créée(s), ${mpErrors} en erreur${
          mpSkipped > 0 ? `, ${mpSkipped} ignorée(s)` : ''
        }`;
  const kind: BulkNoticeKind =
    errors > 0 || mpErrors > 0 ? 'error' : notes.length > 0 || exclusions.length > 0 ? 'info' : 'success';
  reportBulk(kind, [head, ...trimmed(failures), ...trimmed(notes), ...exclusions]);
}

// ─── Affaire ─────────────────────────────────────────────────────────────────

/** Ajoute les produits à une affaire (une affaire est par fournisseur). */
export async function assignItemsToAffaire(items: readonly StagingItem[], affaire: Affaire): Promise<boolean> {
  const targets = items.filter((it) => it.status !== 'LAUNCHED' && !it.forcedFromCatalogue);
  if (targets.length === 0) {
    toast.error('Aucun produit éligible (déjà lancés ou lignes de trace).');
    return false;
  }
  if (guardBusy()) return false;
  startBulkTask('Ajout à l’affaire', 1);
  try {
    const affaireDistributorId = affaire.distributorId ?? undefined;
    const groups = new Map<string, { warehouse?: 'FLEVY' | 'DOMBASLE'; distributorId?: string; stagingUuids: string[] }>();
    for (const it of targets) {
      if (affaireDistributorId) {
        const group = groups.get('affaire') ?? { distributorId: affaireDistributorId, stagingUuids: [] as string[] };
        group.stagingUuids.push(it.uuid);
        groups.set('affaire', group);
        continue;
      }
      // Affaire historique : regroupement par distributeur cible du produit.
      const offers = it.distributorOffers ?? [];
      const offer =
        offers.find((o) => o.plannedDep) ??
        offers.find((o) => o.warehouse === it.warehouse) ??
        (offers.length === 1 ? offers[0] : undefined);
      const wh: 'FLEVY' | 'DOMBASLE' = it.warehouse === 'DOMBASLE' ? 'DOMBASLE' : 'FLEVY';
      const key = offer ? `d:${offer.distributorId}` : `w:${wh}`;
      const group =
        groups.get(key) ??
        (offer
          ? { distributorId: offer.distributorId, stagingUuids: [] as string[] }
          : { warehouse: wh, stagingUuids: [] as string[] });
      group.stagingUuids.push(it.uuid);
      groups.set(key, group);
    }
    await Promise.all(
      [...groups.values()].map(({ stagingUuids, warehouse, distributorId }) =>
        hubProductAnalyzerApi.assignToAffaire(affaire.uuid, { stagingUuids, warehouse, distributorId }),
      ),
    );
    advanceBulkTask();
    reportBulk('success', [
      `${targets.length} produit${plural(targets.length)} ajouté${plural(targets.length)} à « ${affaire.name} »`,
    ]);
    refreshAnalyzerData();
    return true;
  } catch (err) {
    advanceBulkTask(true);
    toast.error(apiErrorMessage(err, "Impossible d'ajouter à l'affaire"));
    return false;
  } finally {
    endBulkTask();
  }
}

// ─── DEP planifiée ───────────────────────────────────────────────────────────

/** Pose / retire la DEP d'UN distributeur sur la sélection (un appel par produit). */
export async function applyDepToItems(
  items: readonly StagingItem[],
  distributorId: string,
  distributorName: string,
  planned: boolean,
): Promise<void> {
  if (guardBusy()) return;
  const targets = items.filter((it) => !it.forcedFromCatalogue);
  const locked = items.length - targets.length;
  if (targets.length === 0) {
    toast.error('Aucun produit modifiable (lignes de trace ignorées).');
    return;
  }
  startBulkTask(`DEP ${distributorName}`, targets.length);
  let ok = 0;
  const failures: string[] = [];
  for (const item of targets) {
    let failed = false;
    try {
      await hubProductAnalyzerApi.setPlannedDep(item.uuid, distributorId, planned);
      ok += 1;
    } catch (err) {
      failed = true;
      failures.push(`${itemLabel(item)} : ${apiErrorMessage(err, 'erreur')}`);
    }
    advanceBulkTask(failed);
  }
  endBulkTask();
  refreshAnalyzerData();
  reportBulk(failures.length > 0 ? 'error' : 'success', [
    `DEP ${distributorName} ${planned ? 'posée' : 'retirée'} sur ${ok}/${targets.length} produit${plural(targets.length)}`,
    ...failures.slice(0, MAX_DETAIL_LINES),
    ...(locked > 0 ? [`${locked} ligne${plural(locked)} de trace ignorée${plural(locked)}`] : []),
  ]);
}

// ─── EbatPro ─────────────────────────────────────────────────────────────────

/** Relit EbatPro (PA, stock, conditionnement, viabilité) sans refaire toute l'analyse. */
export async function refreshEbatproForItems(items: readonly StagingItem[]): Promise<void> {
  if (guardBusy()) return;
  const targets: StagingItem[] = [];
  let skipped = 0;
  for (const item of items) {
    const hasCode = !!item.codeEbat || (item.distributorOffers ?? []).some((o) => !!o.distributorCode);
    if (item.status === 'LAUNCHED' || item.forcedFromCatalogue || !hasCode) skipped += 1;
    else targets.push(item);
  }
  if (targets.length === 0) {
    toast.error('Rien à relire : produit lancé, ligne catalogue ou sans code EbatPro.');
    return;
  }
  startBulkTask('Relecture EbatPro', targets.length);
  let ok = 0;
  let cursor = 0;
  const failures: string[] = [];
  const worker = async () => {
    while (cursor < targets.length) {
      const item = targets[cursor++]!;
      let failed = false;
      try {
        await hubProductAnalyzerApi.refreshEbatpro(item.uuid);
        ok += 1;
      } catch (err) {
        failed = true;
        failures.push(`${itemLabel(item)} : ${apiErrorMessage(err, 'erreur EbatPro')}`);
      }
      advanceBulkTask(failed);
    }
  };
  await Promise.all(Array.from({ length: Math.min(EBAT_REFRESH_CONCURRENCY, targets.length) }, worker));
  endBulkTask();
  refreshAnalyzerData();
  reportBulk(failures.length > 0 ? 'error' : 'success', [
    `${ok} produit${plural(ok)} rafraîchi${plural(ok)} depuis EbatPro`,
    ...failures.slice(0, MAX_DETAIL_LINES),
    ...(skipped > 0 ? [`${skipped} ignoré${plural(skipped)} (sans code EbatPro)`] : []),
  ]);
}

// ─── Négociations ────────────────────────────────────────────────────────────

/** Annule les négociations en cours : la ligne disparaît des opportunités côté partenaire. */
export async function cancelNegotiationsFor(items: readonly StagingItem[]): Promise<boolean> {
  if (items.length === 0) return false;
  const label =
    items.length === 1
      ? `Annuler la négociation en cours sur « ${itemLabel(items[0]!)} » ?`
      : `Annuler les négociations en cours sur ${items.length} produits ?`;
  const ok = await confirmDialog(
    label,
    "La ligne disparaîtra des opportunités côté partenaire (l'historique est conservé). Une nouvelle demande la rouvrira.",
    'Annuler la négo',
    true,
  );
  if (!ok) return false;
  try {
    const res = await hubProductAnalyzerApi.cancelNegotiations(items.map((it) => it.uuid));
    const cancelled = new Set(res.cancelled.map((c) => c.stagingUuid)).size;
    const parts = [
      cancelled > 0 ? `${cancelled} négo${plural(cancelled)} annulée${plural(cancelled)}` : null,
      res.skipped.length > 0 ? `${res.skipped.length} ignorée${plural(res.skipped.length)}` : null,
    ].filter(Boolean);
    reportBulk('success', [parts.join(' · ') || 'Aucune négociation à annuler']);
    refreshAnalyzerData();
    return cancelled > 0;
  } catch (err) {
    toast.error(apiErrorMessage(err, "Impossible d'annuler la négociation"));
    return false;
  }
}

// ─── Suppression ─────────────────────────────────────────────────────────────

/** Supprime les lignes supprimables ; confirme avant et signale celles ignorées ou en échec. */
export async function deleteStagingItems(items: readonly StagingItem[]): Promise<boolean> {
  const deletable = items.filter(canDeleteStaging);
  const skipped = items.length - deletable.length;
  if (deletable.length === 0) {
    toast.error(
      items.length === 1
        ? (deleteBlockedReason(items[0]!) ?? 'Suppression impossible')
        : 'Aucune de ces lignes ne peut être supprimée (lancée, viable ou à négocier).',
    );
    return false;
  }
  const title =
    deletable.length === 1
      ? `Supprimer « ${itemLabel(deletable[0]!)} » ?`
      : `Supprimer ${deletable.length} produits ?`;
  const extra = skipped > 0 ? `\n${skipped} ligne${plural(skipped)} non supprimable${plural(skipped)} ignorée${plural(skipped)}.` : '';
  if (!(await confirmDialog(title, `Cette action est définitive.${extra}`, 'Supprimer', true))) return false;

  const results = await Promise.allSettled(deletable.map((it) => hubProductAnalyzerApi.deleteStaging(it.uuid)));
  const okIds = deletable.filter((_, i) => results[i]!.status === 'fulfilled').map((it) => it.uuid);
  const failed = deletable.length - okIds.length;
  deselectMany(okIds);
  const parts = [
    okIds.length > 0 ? `${okIds.length} supprimé${plural(okIds.length)}` : null,
    failed > 0 ? `${failed} échec${plural(failed)}` : null,
    skipped > 0 ? `${skipped} ignoré${plural(skipped)}` : null,
  ].filter(Boolean);
  reportBulk(failed > 0 ? 'error' : 'success', [parts.join(' · ')]);
  refreshAnalyzerData();
  return okIds.length > 0;
}

// ─── Relance d'analyse ───────────────────────────────────────────────────────

/** Graines de file pour relancer l'analyse de lignes existantes (les non relançables sont écartées). */
export function rerunSeeds(items: readonly StagingItem[]): { seeds: QueueSeed[]; skipped: number } {
  const seeds: QueueSeed[] = [];
  let skipped = 0;
  for (const item of items) {
    const target = stagingRerunTarget(item);
    if (!target) {
      skipped += 1;
      continue;
    }
    seeds.push({
      ref: target.code,
      label: item.designation,
      refType: target.refType,
      code: target.code,
      warehouse: target.warehouse,
      distributorId: target.distributorId,
      stagingUuid: item.uuid,
    });
  }
  return { seeds, skipped };
}

// ─── Chargement du filtre complet ────────────────────────────────────────────

const FETCH_ALL_PAGE = 100;
export const FETCH_ALL_CAP = 2000;

/** Tous les produits du filtre courant (pages de 100, plafonné à 2000) : « tout mettre en négo ». */
export async function fetchAllFilteredItems(
  filters: StagingFilters,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ items: StagingItem[]; total: number; capped: boolean }> {
  const out: StagingItem[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (let page = 1; out.length < FETCH_ALL_CAP; page += 1) {
    const res = await hubProductAnalyzerApi.listStaging(
      { ...filters, detail: '' },
      { page, limit: FETCH_ALL_PAGE },
    );
    total = res.total ?? total;
    for (const it of res.items) {
      if (seen.has(it.uuid)) continue;
      seen.add(it.uuid);
      out.push(it);
    }
    onProgress?.(Math.min(out.length, FETCH_ALL_CAP), total);
    if (res.items.length < FETCH_ALL_PAGE || out.length >= total) break;
  }
  return { items: out.slice(0, FETCH_ALL_CAP), total, capped: total > FETCH_ALL_CAP };
}

export { clearSelection };
