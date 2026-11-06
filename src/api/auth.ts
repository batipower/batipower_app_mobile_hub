import { ApiError, apiClient } from '@/api/client';
import { getTokens, type StoredTokens } from '@/auth/tokenStorage';
import type { CurrentUser } from '@/types/user';

/**
 * Endpoints d'authentification du back NestJS (`/buyer-app/auth/*`).
 *
 * Contrairement au front web, qui passe par un BFF Next (cookie de session +
 * Turnstile), le mobile appelle l'API directement : jeton d'accès en `Bearer`,
 * jeton de rafraîchissement dans le corps des requêtes.
 */

/** Réponse brute de `POST /buyer-app/auth/login` (trois formes possibles). */
interface LoginResponse {
  message: string;
  /** 2FA active : un code a été envoyé par email, à valider via `verify-code`. */
  tempToken?: string;
  /** Premier login : mot de passe temporaire à changer, tokens fournis sans 2FA. */
  mustChangePassword?: boolean;
  /** 2FA désactivée par l'admin : connexion directe. */
  twoFactorSkipped?: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: CurrentUser;
}

export type LoginResult =
  | { status: 'two_factor_required'; tempToken: string }
  | { status: 'authenticated'; tokens: StoredTokens; user: CurrentUser }
  | { status: 'password_change_required'; tokens: StoredTokens };

/**
 * Distingue, parmi les 401 de `verify-code` / `resend-code`, ceux qui signifient que
 * la vérification en cours est perdue (jeton temporaire expiré, trop de tentatives)
 * de ceux qui sont simplement un mauvais code (« Code incorrect », « Code expire… »).
 *
 * Le back ne fournit pas de code d'erreur pour ces cas : on se base sur son message.
 * À remplacer par un `code` dédié si le back en expose un.
 */
export function isTwoFactorSessionLost(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 401) return false;
  return /reconnect|temporaire|token invalide|session de verification/i.test(error.message);
}

function tokensFrom(res: { accessToken?: string; refreshToken?: string }): StoredTokens | null {
  return res.accessToken && res.refreshToken
    ? { accessToken: res.accessToken, refreshToken: res.refreshToken }
    : null;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResult> {
    const res = await apiClient.post<LoginResponse>(
      '/buyer-app/auth/login',
      { email: email.trim(), password },
      { auth: false },
    );
    const tokens = tokensFrom(res);

    if (res.mustChangePassword && tokens) return { status: 'password_change_required', tokens };
    if (res.twoFactorSkipped && tokens && res.user) {
      return { status: 'authenticated', tokens, user: res.user };
    }
    if (res.tempToken) return { status: 'two_factor_required', tempToken: res.tempToken };

    throw new Error('Réponse de connexion inattendue');
  },

  async verifyCode(
    tempToken: string,
    code: string,
  ): Promise<{ tokens: StoredTokens; user: CurrentUser }> {
    const res = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: CurrentUser;
    }>('/buyer-app/auth/verify-code', { tempToken, code }, { auth: false });
    return {
      tokens: { accessToken: res.accessToken, refreshToken: res.refreshToken },
      user: res.user,
    };
  },

  /** Le back émet un nouveau `tempToken` à chaque renvoi : il remplace l'ancien. */
  resendCode(tempToken: string) {
    return apiClient.post<{ message: string; tempToken: string }>(
      '/buyer-app/auth/resend-code',
      { tempToken },
      { auth: false },
    );
  },

  me() {
    return apiClient.get<CurrentUser>('/buyer-app/me');
  },

  /** Révoque le refresh token côté back (Bearer + refreshToken dans le corps). */
  async logout(): Promise<void> {
    const tokens = await getTokens();
    if (!tokens) return;
    await authApi.revokeSession(tokens);
  },

  /** Révocation avec des jetons explicites (ex. login `mustChangePassword` non retenu). */
  async revokeSession(tokens: StoredTokens): Promise<void> {
    await apiClient.post(
      '/buyer-app/auth/logout',
      { refreshToken: tokens.refreshToken },
      { auth: false, headers: { Authorization: `Bearer ${tokens.accessToken}` } },
    );
  },
};
