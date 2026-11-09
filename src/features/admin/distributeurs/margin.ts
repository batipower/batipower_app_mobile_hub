import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { adminPartnersApi } from '@/api/adminPartners';
import { formatInteger } from '@/lib/format';
import type { AdminDistributor, NegoMarginJob } from '@/types/adminPartners';

import { adminNegoMarginJobKey } from '../queryKeys';
import { useRefreshPartners } from './hooks';

export const DEFAULT_TARGET_MARGIN_PCT = 10;
export const MARGIN_PRESETS = [0, 3, 5, 7, 10] as const;
export const MARGIN_MAX_PCT = 30;

/** Remise DEP only par défaut (alignée sur le back). */
export const DEFAULT_DEP_ONLY_PCT = 5;

export type MarginKind = 'nego' | 'dep' | 'depOnly';

export const MARGIN_COPY: Record<
  MarginKind,
  { pill: string; title: string; description: (name: string) => string; label: string; hint: string; apply: string }
> = {
  nego: {
    pill: 'Marge opportunités',
    title: 'Marge des opportunités (hors DEP)',
    description: (name) =>
      `Marge cible cachée incluse dans le prix d'équilibre montré aux référents de « ${name} ». L'enregistrement recalcule toutes ses opportunités ouvertes (hors DEP) en arrière-plan : les référents voient chaque nouveau prix dès qu'il est calculé.`,
    label: 'Marge cible (%)',
    hint: "Les prix demandés saisis à la main sont conservés. L'historique de prix reste neutre, sans mention de la marge.",
    apply: 'Appliquer et recalculer',
  },
  dep: {
    pill: 'Remise DEP',
    title: 'Remise DEP',
    description: (name) =>
      `Remise retirée du prix d'équilibre des DEP de « ${name} » à l'affichage (remplace le −10 % fixe). Effet immédiat sur toutes ses DEP affichées ; aucune opportunité n'est réécrite.`,
    label: 'Remise (%)',
    hint: 'Le prix brut saisi reste en base : revenir à 10 % rétablit exactement l’affichage précédent.',
    apply: 'Appliquer',
  },
  depOnly: {
    pill: 'Remise DEP only',
    title: "Remise DEP only (prix d'achat demandé)",
    description: (name) =>
      `Remise supplémentaire retirée, après la remise DEP, du prix demandé des DEP de « ${name} » (distributeur DEP only : il ne voit qu'un prix d'achat demandé, pas de marge). Effet immédiat sur toutes ses DEP affichées ; aucune opportunité n'est réécrite.`,
    label: 'Remise (%)',
    hint: 'Exemple : 10,00 € brut, remise DEP 10 % puis remise DEP only 5 % : 8,55 € demandés.',
    apply: 'Appliquer',
  },
};

export function clampMarginPct(raw: number): number {
  if (!Number.isFinite(raw)) return DEFAULT_TARGET_MARGIN_PCT;
  return Math.min(MARGIN_MAX_PCT, Math.max(0, Math.round(raw * 10) / 10));
}

/** Valeur saisie → pourcentage valide (0 à 30), sinon `null`. */
export function parseMarginInput(raw: string): number | null {
  const n = Number(raw.replace(',', '.'));
  if (raw.trim() === '' || !Number.isFinite(n) || n < 0 || n > MARGIN_MAX_PCT) return null;
  return clampMarginPct(n);
}

export function currentMargin(kind: MarginKind, d: AdminDistributor): number {
  const raw = kind === 'nego' ? d.negoMarginPct : kind === 'dep' ? d.depDiscountPct : d.depOnlyAskedDiscountPct;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return kind === 'depOnly' ? DEFAULT_DEP_ONLY_PCT : DEFAULT_TARGET_MARGIN_PCT;
}

export function jobPercent(job: NegoMarginJob): number | null {
  if (job.total <= 0) return null;
  return Math.min(100, Math.floor((job.examined / job.total) * 100));
}

/** Bilan chiffré d'un recalcul terminé. */
export function jobResultMessage(name: string, r: NegoMarginJob): string {
  const s = (n: number) => (n > 1 ? 's' : '');
  const parts = [`${formatInteger(r.updated)} opportunité${s(r.updated)} recalculée${s(r.updated)}`];
  if (r.keptManual > 0) parts.push(`${formatInteger(r.keptManual)} prix saisi${s(r.keptManual)} à la main conservé${s(r.keptManual)}`);
  if (r.unusable > 0) parts.push(`${formatInteger(r.unusable)} sans données de viabilité`);
  if (r.conflicts > 0) parts.push(`${formatInteger(r.conflicts)} modifiée${s(r.conflicts)} entre-temps`);
  return `Marge de ${name} mise à jour : ${parts.join(' · ')}`;
}

/**
 * Avancement du dernier recalcul des prix. Relu chaque seconde tant qu'il tourne (plusieurs milliers de
 * lignes possibles) ; sans recalcul en cours, aucune requête récurrente.
 */
export function useNegoMarginJob(distributor: AdminDistributor | undefined) {
  return useQuery({
    queryKey: adminNegoMarginJobKey(distributor?.id ?? ''),
    queryFn: () => adminPartnersApi.getNegoMarginJob(distributor!.id),
    enabled: !!distributor && distributor.negoMarginPct !== undefined,
    refetchInterval: (query) => (query.state.data?.status === 'RUNNING' ? 1000 : false),
    staleTime: 10_000,
    // Un échec réseau ponctuel pendant le suivi ne doit pas figer l'affichage : retente au tick suivant.
    retry: 1,
  });
}

/**
 * Annonce la fin d'un recalcul observé en cours (jamais celle d'un ancien job déjà terminé au chargement)
 * par un toast chiffré, puis rafraîchit la hiérarchie.
 */
export function useNegoMarginJobWatcher(distributor: AdminDistributor | undefined) {
  const { data: job } = useNegoMarginJob(distributor);
  const refresh = useRefreshPartners();
  const watched = useRef<string | null>(null);
  const name = distributor?.name ?? '';

  useEffect(() => {
    if (!job) return;
    if (job.status === 'RUNNING') {
      watched.current = job.id;
      return;
    }
    if (watched.current !== job.id) return;
    watched.current = null;
    if (job.status === 'DONE') toast.success(jobResultMessage(name, job));
    else toast.error(`Recalcul des prix de ${name} interrompu : ${job.error ?? 'erreur inconnue'}`);
    void refresh();
    // `watched` rend l'effet idempotent : il ne s'exécute qu'une fois par fin de recalcul observée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job]);
}
