import type { LiveAffaire, LivePoste, LiveSnapshot } from '@/api/hubAnalysesLive';

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

export type AffaireTotals = { done: number; enCours: number; total: number; percent: number };

export function affaireTotals(affaires: Pick<LiveAffaire, 'done' | 'enCours'>[]): AffaireTotals {
  const done = affaires.reduce((n, a) => n + a.done, 0);
  const enCours = affaires.reduce((n, a) => n + a.enCours, 0);
  const total = done + enCours;
  return { done, enCours, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
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
