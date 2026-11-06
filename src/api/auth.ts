import { ApiError, apiClient, refreshAccessToken } from '@/api/client';
import { getImpersonation, getTokens, type StoredTokens } from '@/auth/tokenStorage';
import type { CurrentUser, ImpersonableUser } from '@/types/user';

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

  /**
   * Compte courant. Pendant une impersonation, c'est le compte usurpé (avec `impersonatedBy`) ;
   * `asAdmin` force la lecture du compte réellement connecté (le SUPERADMIN).
   */
  me(options?: { asAdmin?: boolean }) {
    return apiClient.get<CurrentUser>('/buyer-app/me', { asAdmin: options?.asAdmin });
  },

  /** Révoque le refresh token côté back (Bearer + refreshToken dans le corps). */
  async logout(): Promise<void> {
    let tokens = await getTokens();
    if (!tokens) return;
    // Pendant une impersonation, le jeton d'accès du SUPERADMIN n'est renouvelé qu'à la
    // demande (les requêtes portent celui du compte usurpé) : on le rafraîchit pour que la
    // révocation du refresh token ne soit pas refusée parce qu'il a expiré.
    if (await getImpersonation()) {
      const fresh = await refreshAccessToken().catch(() => null);
      if (fresh) tokens = { ...tokens, accessToken: fresh };
    }
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

  // ─── Impersonation (SUPERADMIN) ────────────────────────────────────────────

  /** Comptes actifs que le SUPERADMIN peut usurper (`GET /buyer-app/impersonate/users`). */
  listImpersonableUsers() {
    return apiClient.get<ImpersonableUser[]>('/buyer-app/impersonate/users', { asAdmin: true });
  },

  /**
   * Obtient un jeton d'accès (2 h, sans refresh token) au nom d'un autre compte
   * (`POST /buyer-app/impersonate/:userId`). La session du SUPERADMIN n'est pas modifiée :
   * c'est à l'appelant de stocker ce jeton. L'action est tracée côté back.
   */
  impersonate(userId: string) {
    return apiClient.post<{ accessToken: string }>(
      `/buyer-app/impersonate/${encodeURIComponent(userId)}`,
      undefined,
      { asAdmin: true },
    );
  },
};
