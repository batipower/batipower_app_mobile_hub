import type { LiveAffaire, LivePoste, LiveSnapshot } from '@/api/hubAnalysesLive';

import { posteHealth } from './liveFormat';

export const NO_AFFAIRE_LABEL = 'Sans affaire';
const NO_AFFAIRE_KEY = '__none__';

/** Clé stable d'une affaire dans une liste (l'id est null pour « Sans affaire »). */
export function affaireKey(a: Pick<LiveAffaire, 'id' | 'name'>): string {
  return a.id ?? (a.name === NO_AFFAIRE_LABEL ? NO_AFFAIRE_KEY : `name:${a.name}`);
}

/**
 * Reconstitue un avancement par affaire depuis les lignes détenues par les postes. Utilisé quand le back est
 * plus ancien que l'app : seules les lignes en cours sont connues (les terminées ne le sont pas par affaire).
 */
export function deriveAffairesFromLines(postes: LivePoste[]): LiveAffaire[] {
  const byName = new Map<string, LiveAffaire>();
  for (const poste of postes) {
    for (const line of poste.lines) {
      const name = line.affaireName ?? NO_AFFAIRE_LABEL;
      let a = byName.get(name);
      if (!a) {
        a = {
          id: null,
          name,
          rank: null,
          done: 0,
          enCours: 0,
          enAttente: 0,
          total: 0,
          percent: 0,
          analysing: false,
          postes: [],
        };
        byName.set(name, a);
      }
      a.enCours += 1;
      a.total += 1;
      if (line.analysing) a.analysing = true;
      let p = a.postes.find((x) => x.key === poste.key);
      if (!p) {
        p = { key: poste.key, done: 0, enCours: 0 };
        a.postes.push(p);
      }
      p.enCours += 1;
    }
  }
  return Array.from(byName.values()).sort((x, y) => {
    if ((x.name === NO_AFFAIRE_LABEL) !== (y.name === NO_AFFAIRE_LABEL)) {
      return x.name === NO_AFFAIRE_LABEL ? 1 : -1;
    }
    return y.enCours - x.enCours || x.name.localeCompare(y.name);
  });
}

/** Avancement par affaire du back, ou reconstitué depuis les lignes si le back ne l'envoie pas encore. */
export function resolveAffaires(
  snapshot: Pick<LiveSnapshot, 'affaires' | 'postes'> | undefined,
): LiveAffaire[] {
  if (!snapshot) return [];
  return snapshot.affaires ?? deriveAffairesFromLines(snapshot.postes);
}

export type AffaireTotals = {
  done: number;
  enCours: number;
  enAttente: number;
  total: number;
  percent: number;
};

/** Lignes en attente d'une affaire (0 si le back ne les envoie pas encore). */
export function affaireEnAttente(a: Pick<LiveAffaire, 'enAttente'>): number {
  return a.enAttente ?? 0;
}

/** Total global des affaires : somme des `total` du back (analysées + en cours + en attente), jamais `done + enCours`. */
export function affaireTotals(
  affaires: Pick<LiveAffaire, 'done' | 'enCours' | 'enAttente' | 'total'>[],
): AffaireTotals {
  const done = affaires.reduce((n, a) => n + a.done, 0);
  const enCours = affaires.reduce((n, a) => n + a.enCours, 0);
  const enAttente = affaires.reduce((n, a) => n + affaireEnAttente(a), 0);
  const total = affaires.reduce((n, a) => n + a.total, 0);
  return { done, enCours, enAttente, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export type AffaireState = 'done' | 'analysing' | 'stopped' | 'idle';

/**
 * État d'une affaire : `done` s'il ne reste rien, `analysing` si une analyse est en vol, `stopped` s'il reste des
 * lignes sans agent connecté dessus, `idle` sinon (agent connecté entre deux lignes).
 */
export function affaireState(affaire: LiveAffaire, connectedPosteKeys: Set<string>): AffaireState {
  if (affaire.enCours + affaireEnAttente(affaire) === 0) return 'done';
  if (affaire.analysing) return 'analysing';
  const hasAgent = affaire.postes.some((p) => p.enCours > 0 && connectedPosteKeys.has(p.key));
  return hasAgent ? 'idle' : 'stopped';
}

/**
 * Un agent est listé s'il est connecté. Avec un back qui envoie `connected`, on s'y fie (une analyse en vol
 * suffit). Sinon : analyse en vol, ou lignes détenues et signal non perdu.
 */
export function isPosteVisible(
  poste: LivePoste,
  analysingKeys: Set<string>,
  now: number = Date.now(),
): boolean {
  if (analysingKeys.has(poste.key)) return true;
  if (typeof poste.connected === 'boolean') return poste.connected;
  return poste.enCours > 0 && posteHealth(poste, now) !== 'lost';
}

/** Les affaires sur lesquelles un poste travaille, avec sa part (analysées / en cours). */
export function affairesOfPoste(
  affaires: LiveAffaire[],
  posteKey: string,
): { affaire: LiveAffaire; done: number; enCours: number }[] {
  const out: { affaire: LiveAffaire; done: number; enCours: number }[] = [];
  for (const affaire of affaires) {
    const part = affaire.postes.find((p) => p.key === posteKey);
    if (part) out.push({ affaire, done: part.done, enCours: part.enCours });
  }
  // Celles où le poste a encore des lignes d'abord.
  return out.sort((x, y) => Number(y.enCours > 0) - Number(x.enCours > 0));
}

/** Le serveur a redémarré depuis moins de 15 min : on prévient que les agents se réannoncent. */
export const SERVER_RESTART_NOTICE_MS = 15 * 60 * 1000;
