import { clearTokens, getTokens, setAccessToken } from '@/auth/tokenStorage';
import { env } from '@/config/env';

/** Délai maximal d'une requête : `fetch` n'en a aucun par défaut en React Native. */
const REQUEST_TIMEOUT_MS = 20_000;

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
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  /**
   * `true` (défaut) : ajoute le Bearer et tente un refresh sur 401.
   * `false` : routes publiques (login, 2FA, mot de passe oublié).
   */
  auth?: boolean;
}

// ─── Session expirée ─────────────────────────────────────────────────────────

let sessionExpiredHandler: (() => void) | null = null;

/** Enregistré par l'AuthProvider : appelé quand le refresh est refusé par le back. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
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
  const { method = 'GET', body, query, headers } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(buildUrl(path, query), {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  } finally {
    clearTimeout(timeout);
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

// ─── Refresh (une seule requête en vol) ──────────────────────────────────────

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
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

/** Les requêtes concurrentes qui reçoivent un 401 partagent le même refresh. */
function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// ─── API publique du client ──────────────────────────────────────────────────

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true } = options;

  if (!auth) return parse<T>(await send(path, options, null));

  const tokens = await getTokens();
  const usedToken = tokens?.accessToken ?? null;
  const first = await send(path, options, usedToken);
  if (first.status !== 401) return parse<T>(first);

  // 401 : jeton d'accès expiré. Si une requête concurrente l'a déjà remplacé,
  // on rejoue directement avec le nouveau, sinon on rafraîchit.
  const current = (await getTokens())?.accessToken ?? null;
  const freshToken = current && current !== usedToken ? current : await refreshAccessToken();
  if (!freshToken) return parse<T>(first); // lève l'ApiError 401 d'origine

  return parse<T>(await send(path, options, freshToken));
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
};
