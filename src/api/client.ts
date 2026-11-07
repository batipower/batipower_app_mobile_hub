import { fetch as expoFetch } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';

import {
  clearImpersonation,
  clearTokens,
  getImpersonation,
  getTokens,
  setAccessToken,
  setImpersonation,
} from '@/auth/tokenStorage';
import { env } from '@/config/env';

/** Délai maximal d'une requête : `fetch` n'en a aucun par défaut en React Native. */
const REQUEST_TIMEOUT_MS = 20_000;

/** Délai d'un envoi de fichier ou d'un téléchargement (10 Mo sur une connexion mobile). */
export const UPLOAD_TIMEOUT_MS = 60_000;

/** Délai d'une génération IA (réponse suggérée, affinage), bien plus lente qu'une requête usuelle. */
export const LONG_REQUEST_TIMEOUT_MS = 90_000;

/** Code de l'erreur levée quand le back ne délivre plus de jeton pour le compte usurpé. */
export const IMPERSONATION_ENDED_CODE = 'IMPERSONATION_ENDED';

/**
 * Erreur API. `status === 0` signale un échec réseau (hors ligne, timeout, DNS…) :
 * le serveur n'a pas répondu, la session n'est donc pas remise en cause.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.code =
      body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
        ? body.code
        : null;
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Objet JSON (sérialisé) ou `FormData` (multipart : le `Content-Type` et sa frontière sont posés par fetch). */
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  /**
   * `true` (défaut) : ajoute le Bearer et tente un refresh sur 401.
   * `false` : routes publiques (login, 2FA, mot de passe oublié).
   */
  auth?: boolean;
  /**
   * `true` : la requête part avec la session du compte connecté (SUPERADMIN), même pendant
   * une impersonation. Réservé aux appels qui n'ont de sens que pour ce compte : lister
   * les comptes à usurper, démarrer ou arrêter une impersonation.
   */
  asAdmin?: boolean;
  /**
   * Annulation par l'appelant (ex. `signal` de TanStack Query, pour abandonner une
   * recherche devenue obsolète). Lève une `AbortError`, et non une `ApiError`.
   */
  signal?: AbortSignal;
  /** Délai maximal de la requête (défaut : 20 s). Réservé aux envois de fichiers et aux appels IA. */
  timeoutMs?: number;
}

// ─── Événements de session ───────────────────────────────────────────────────

let sessionExpiredHandler: (() => void) | null = null;

/** Enregistré par l'AuthProvider : appelé quand le refresh est refusé par le back. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

let impersonationEndedHandler: (() => void) | null = null;

/**
 * Enregistré par l'AuthProvider : appelé quand une impersonation ne peut plus être
 * renouvelée (compte usurpé supprimé ou désactivé…). Le client a déjà effacé l'impersonation.
 */
export function setImpersonationEndedHandler(handler: (() => void) | null) {
  impersonationEndedHandler = handler;
}

// ─── Requête bas niveau ──────────────────────────────────────────────────────

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `${env.apiBaseUrl}/${path.replace(/^\/+/, '')}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/** Les erreurs Nest ont `message: string` ou, pour la validation, `string[]`. */
function extractMessage(status: number, data: unknown): string {
  if (status === 429) return 'Trop de tentatives. Réessayez dans une minute.';
  if (data && typeof data === 'object' && 'message' in data) {
    const { message } = data as { message: unknown };
    if (typeof message === 'string' && message) return message;
    if (Array.isArray(message) && message.length > 0) return message.join('\n');
  }
  if (status >= 500) return 'Le serveur est momentanément indisponible. Réessayez plus tard.';
  return `Erreur ${status}`;
}

async function send(
  path: string,
  options: RequestOptions,
  accessToken: string | null,
): Promise<Response> {
  const { method = 'GET', body, query, headers, signal, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  // Le signal de l'appelant et le délai maximal coupent la même requête.
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    return await fetch(buildUrl(path, query), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !isMultipart ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: isMultipart ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (signal?.aborted) {
      const aborted = new Error('Requête annulée');
      aborted.name = 'AbortError';
      throw aborted;
    }
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) throw new ApiError(res.status, extractMessage(res.status, data), data);
  return data as T;
}

// ─── Refresh du compte connecté (une seule requête en vol) ───────────────────

let adminRefreshInFlight: Promise<string | null> | null = null;

async function performAdminRefresh(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;

  try {
    const res = await send(
      '/buyer-app/auth/refresh',
      { method: 'POST', body: { refreshToken: tokens.refreshToken } },
      null,
    );
    const { accessToken } = await parse<{ accessToken: string }>(res);
    await setAccessToken(accessToken);
    return accessToken;
  } catch (error) {
    // Refus explicite du back : la session est terminée. Une panne réseau ou
    // une erreur serveur ne doit en revanche pas déconnecter l'utilisateur.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      await clearTokens();
      sessionExpiredHandler?.();
      return null;
    }
    throw error;
  }
}

/**
 * Renouvelle le jeton d'accès du compte connecté (le SUPERADMIN pendant une impersonation).
 * Les requêtes concurrentes qui reçoivent un 401 partagent le même refresh.
 */
export function refreshAccessToken(): Promise<string | null> {
  adminRefreshInFlight ??= performAdminRefresh().finally(() => {
    adminRefreshInFlight = null;
  });
  return adminRefreshInFlight;
}

// ─── Renouvellement d'une impersonation (une seule requête en vol) ───────────

let impersonationRenewInFlight: Promise<string | null> | null = null;

/**
 * Le jeton d'un compte usurpé dure 2 h et n'a pas de refresh token (`/impersonate/:id`
 * ne renvoie qu'un jeton d'accès). On en redemande donc un : refresh du SUPERADMIN, puis
 * nouvelle impersonation du même compte. Si le back la refuse (compte supprimé, droits
 * perdus), l'impersonation est terminée : on l'efface et on lève `IMPERSONATION_ENDED`.
 */
async function performImpersonationRenew(): Promise<string | null> {
  const impersonation = await getImpersonation();
  if (!impersonation) return null;

  const adminToken = await refreshAccessToken();
  if (!adminToken) return null; // session SUPERADMIN expirée : déjà gérée par le refresh

  try {
    const res = await send(
      `/buyer-app/impersonate/${encodeURIComponent(impersonation.targetUserId)}`,
      { method: 'POST' },
      adminToken,
    );
    const { accessToken } = await parse<{ accessToken: string }>(res);
    await setImpersonation({ ...impersonation, accessToken });
    return accessToken;
  } catch (error) {
    if (error instanceof ApiError && !error.isNetworkError && error.status < 500) {
      await clearImpersonation();
      impersonationEndedHandler?.();
      throw new ApiError(401, "L'impersonation a pris fin : ce compte n'est plus utilisable.", {
        code: IMPERSONATION_ENDED_CODE,
      });
    }
    throw error;
  }
}

function renewImpersonationAccessToken(): Promise<string | null> {
  impersonationRenewInFlight ??= performImpersonationRenew().finally(() => {
    impersonationRenewInFlight = null;
  });
  return impersonationRenewInFlight;
}

// ─── API publique du client ──────────────────────────────────────────────────

/**
 * Envoie la requête avec le jeton de la session courante (celui du compte usurpé pendant une
 * impersonation, sauf `asAdmin`) et, sur 401, la rejoue une fois avec un jeton renouvelé.
 * `perform` exécute la requête avec le jeton fourni ; on rend la dernière réponse obtenue.
 */
async function authorizedSend(
  asAdmin: boolean,
  perform: (accessToken: string | null) => Promise<Response>,
): Promise<Response> {
  // Pendant une impersonation, les requêtes portent le jeton du compte usurpé.
  const impersonation = asAdmin ? null : await getImpersonation();
  const tokens = await getTokens();
  const usedToken = impersonation?.accessToken ?? tokens?.accessToken ?? null;
  const first = await perform(usedToken);
  if (first.status !== 401) return first;

  // 401 : jeton d'accès expiré. Si une requête concurrente l'a déjà remplacé,
  // on rejoue directement avec le nouveau, sinon on le renouvelle.
  const current = impersonation
    ? ((await getImpersonation())?.accessToken ?? null)
    : ((await getTokens())?.accessToken ?? null);
  const freshToken =
    current && current !== usedToken
      ? current
      : await (impersonation ? renewImpersonationAccessToken() : refreshAccessToken());
  if (!freshToken) return first; // l'appelant lève l'ApiError 401 d'origine

  return perform(freshToken);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, asAdmin = false } = options;

  if (!auth) return parse<T>(await send(path, options, null));

  return parse<T>(await authorizedSend(asAdmin, (token) => send(path, options, token)));
}

/** Nom de fichier sûr pour le cache : sans séparateur de chemin ni caractère exotique. */
function safeFileName(fileName: string): string {
  const cleaned = fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  return cleaned.length > 0 ? cleaned.slice(-120) : 'fichier';
}

/**
 * Télécharge un fichier protégé (Bearer, refresh sur 401, impersonation comme `apiRequest`)
 * vers le cache de l'app, puis renvoie le fichier local. Le nom est celui de la pièce jointe :
 * l'aperçu et le partage natifs s'en servent pour reconnaître le type.
 */
export async function downloadAuthenticated(path: string, fileName: string): Promise<File> {
  const url = buildUrl(path);
  const response = await authorizedSend(false, async (token) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    try {
      return (await expoFetch(url, {
        signal: controller.signal,
        headers: { Accept: '*/*', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })) as unknown as Response;
    } catch {
      throw new ApiError(0, 'Impossible de joindre le serveur. Vérifiez votre connexion internet.');
    } finally {
      clearTimeout(timeout);
    }
  });

  if (!response.ok) {
    let data: unknown = null;
    try {
      data = JSON.parse(await response.text());
    } catch {
      // Corps absent ou non JSON : on retombe sur le message générique du statut.
    }
    throw new ApiError(response.status, extractMessage(response.status, data), data);
  }

  const directory = new Directory(Paths.cache, 'downloads');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, safeFileName(fileName));
  file.create({ overwrite: true });
  file.write(new Uint8Array(await response.arrayBuffer()));
  return file;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
  /** Envoi multipart (pièce jointe) : mêmes refresh, impersonation et `asAdmin` que les autres appels. */
  upload: <T>(
    path: string,
    formData: FormData,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => apiRequest<T>(path, { timeoutMs: UPLOAD_TIMEOUT_MS, ...options, method: 'POST', body: formData }),
};
