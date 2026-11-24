import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner-native';

import { authApi } from '@/api/auth';
import {
  ApiError,
  IMPERSONATION_ENDED_CODE,
  setImpersonationEndedHandler,
  setSessionExpiredHandler,
} from '@/api/client';
import {
  clearBiometricCredentials,
  dismissActivationPrompt,
  getBiometricPreference,
  getDeviceName,
  isActivationPromptDismissed,
  isBiometricAvailable,
  readDeviceToken,
  saveDeviceToken,
  savePreference,
  type BiometricPreference,
} from '@/auth/biometrics';
import {
  clearImpersonation,
  clearTokens,
  getTokens,
  setImpersonation,
  setTokens,
  type StoredTokens,
} from '@/auth/tokenStorage';
import { resetPricingState } from '@/features/pricing/filtersStore';
import { resetBrandMarginState } from '@/features/brandMargin/filtersStore';
import { resetAdminUsersFilters } from '@/features/admin/utilisateurs/filtersStore';
import { resetPartnerState } from '@/features/partner/state';
import { resetReturnsState } from '@/features/returns/filtersStore';
import { resetPaState } from '@/features/product-analyzer/filtersStore';
import { clearSelection } from '@/features/product-analyzer/selectionStore';
import { goToLanding } from '@/modules/switchModule';
import { unregisterStoredPushToken } from '@/notifications/pushRegistration';
import type { CurrentUser } from '@/types/user';

/**
 * - `loading`     : lecture du Keychain et vérification de la session au lancement.
 * - `signedOut`   : pas de session valide, écrans de connexion.
 * - `signedIn`    : session valide, `user` renseigné.
 * - `unreachable` : jetons présents mais serveur injoignable au lancement (hors ligne) :
 *                   on ne déconnecte pas l'utilisateur, on propose de réessayer.
 */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'unreachable';

export type LoginOutcome = 'two_factor_required' | 'authenticated' | 'password_change_required';

/**
 * - `authenticated` : session ouverte.
 * - `cancelled`     : invite Face ID annulée ou échouée, on peut réessayer.
 * - `unavailable`   : Face ID n'est plus utilisable (visage modifié, appareil refusé ou expiré) :
 *                     la fonction est désactivée, il faut se connecter avec le mot de passe.
 */
export type BiometricLoginOutcome = 'authenticated' | 'cancelled' | 'unavailable';

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  /** Un code 2FA a été envoyé et attend d'être saisi. */
  hasPendingTwoFactor: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  verifyTwoFactor: (code: string) => Promise<LoginOutcome>;
  resendTwoFactorCode: () => Promise<void>;
  /** Abandonne la vérification 2FA en cours (retour à la connexion). */
  cancelTwoFactor: () => void;
  logout: () => Promise<void>;
  /** Face ID est utilisable sur cet appareil (configuré dans les réglages iOS). */
  biometricAvailable: boolean;
  /** Reconnexion par Face ID activée sur cet appareil (compte concerné), sinon `null`. */
  biometricPreference: BiometricPreference | null;
  /** Se reconnecte avec Face ID (sans mot de passe ni code 2FA). L'invite iOS s'affiche. */
  loginWithBiometrics: () => Promise<BiometricLoginOutcome>;
  /** Active Face ID pour le compte connecté. Lève une erreur si l'activation échoue. */
  enableBiometrics: () => Promise<void>;
  disableBiometrics: () => Promise<void>;
  /** Une connexion par mot de passe vient d'avoir lieu : proposer d'activer Face ID. */
  biometricOfferPending: boolean;
  /** Ferme la proposition ; `forever` ne la refait plus. */
  dismissBiometricOffer: (options?: { forever?: boolean }) => Promise<void>;
  retryBootstrap: () => Promise<void>;
  /**
   * Une impersonation est en cours : `user` est alors le compte usurpé, et non celui du
   * SUPERADMIN connecté (qui reste en session pour renouveler l'impersonation et en sortir).
   */
  isImpersonating: boolean;
  /** Se connecte « en tant que » un autre compte, puis ouvre son écran d'accueil. */
  startImpersonation: (userId: string) => Promise<CurrentUser>;
  /** Revient au compte du SUPERADMIN, puis ouvre son écran d'accueil. */
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionSnapshot =
  { status: 'signedIn'; user: CurrentUser } | { status: 'signedOut' | 'unreachable'; user: null };

/**
 * Vérifie la session stockée au lancement : `GET /me` valide les jetons (avec refresh
 * automatique du jeton d'accès si besoin). Ne touche pas à l'état React.
 */
async function resolveStoredSession(): Promise<SessionSnapshot> {
  try {
    if (!(await getTokens())) return { status: 'signedOut', user: null };
    return { status: 'signedIn', user: await authApi.me() };
  } catch (error) {
    // L'impersonation enregistrée n'est plus renouvelable : le client l'a effacée, la session
    // du SUPERADMIN est intacte. On relit donc son compte (l'impersonation n'existe plus,
    // la boucle est impossible).
    if (error instanceof ApiError && error.code === IMPERSONATION_ENDED_CODE) {
      return resolveStoredSession();
    }
    // Serveur injoignable ou en panne : on garde la session et on propose de réessayer.
    if (error instanceof ApiError && (error.isNetworkError || error.status >= 500)) {
      return { status: 'unreachable', user: null };
    }
    // 401 (jetons déjà purgés par le client), autre refus du back ou Keychain illisible :
    // session inutilisable. La purge ne doit jamais empêcher d'afficher l'écran de connexion.
    await clearTokens().catch(() => undefined);
    return { status: 'signedOut', user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [hasPendingTwoFactor, setHasPendingTwoFactor] = useState(false);
  const [biometricPreference, setBiometricPreference] = useState<BiometricPreference | null>(null);
  const [biometricOfferPending, setBiometricOfferPending] = useState(false);
  const [biometricAvailable] = useState(() => isBiometricAvailable());
  // Le tempToken 2FA (valable 5 min) ne sort jamais de la mémoire : ni disque, ni état React.
  const tempTokenRef = useRef<string | null>(null);

  const setTempToken = useCallback((token: string | null) => {
    tempTokenRef.current = token;
    setHasPendingTwoFactor(token !== null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getBiometricPreference().then((preference) => {
      if (!cancelled) setBiometricPreference(preference);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resetToSignedOut = useCallback(() => {
    setTempToken(null);
    setBiometricOfferPending(false);
    setUser(null);
    setStatus('signedOut');
    queryClient.clear();
    resetPricingState();
    resetReturnsState();
    resetPartnerState();
    resetAdminUsersFilters();
    resetBrandMarginState();
    resetPaState();
    clearSelection();
  }, [queryClient, setTempToken]);

  // Refresh refusé par le back : le client a déjà purgé les jetons.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      resetToSignedOut();
      toast.error('Votre session a expiré. Veuillez vous reconnecter.');
    });
    return () => setSessionExpiredHandler(null);
  }, [resetToSignedOut]);

  const applySession = useCallback((session: SessionSnapshot) => {
    setUser(session.user);
    setStatus(session.status);
  }, []);

  // L'état initial est déjà `loading`. Le résultat n'est appliqué que si le composant
  // est toujours monté.
  useEffect(() => {
    let cancelled = false;
    void resolveStoredSession().then((session) => {
      if (!cancelled) applySession(session);
    });
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const retryBootstrap = useCallback(async () => {
    setStatus('loading');
    applySession(await resolveStoredSession());
  }, [applySession]);

  /**
   * Finalise une connexion réussie. Un compte en `mustChangePassword` n'est pas
   * connecté dans l'app (le changement de mot de passe se fait sur le web) : ses
   * jetons sont révoqués immédiatement plutôt que laissés actifs 24 h sans usage.
   */
  const completeSignIn = useCallback(
    async (
      tokens: StoredTokens,
      signedInUser: CurrentUser | null,
      options: { offerBiometric?: boolean } = {},
    ): Promise<LoginOutcome> => {
      if (!signedInUser || signedInUser.mustChangePassword) {
        await authApi.revokeSession(tokens).catch(() => undefined);
        return 'password_change_required';
      }
      // Une impersonation restée en mémoire d'une session précédente ne doit jamais survivre
      // à une nouvelle connexion.
      await clearImpersonation();
      await setTokens(tokens);
      setTempToken(null);
      if (options.offerBiometric && biometricAvailable) {
        // Proposé si Face ID n'est pas déjà actif pour ce compte et qu'il n'a pas été refusé.
        const preference = await getBiometricPreference();
        const alreadyActive = preference?.email === signedInUser.email;
        setBiometricOfferPending(!alreadyActive && !(await isActivationPromptDismissed()));
      }
      setUser(signedInUser);
      setStatus('signedIn');
      return 'authenticated';
    },
    [biometricAvailable, setTempToken],
  );

  const login = useCallback<AuthContextValue['login']>(
    async (email, password) => {
      const result = await authApi.login(email, password);
      switch (result.status) {
        case 'two_factor_required':
          setTempToken(result.tempToken);
          return 'two_factor_required';
        case 'password_change_required':
          return completeSignIn(result.tokens, null);
        case 'authenticated':
          return completeSignIn(result.tokens, result.user, { offerBiometric: true });
      }
    },
    [completeSignIn, setTempToken],
  );

  const verifyTwoFactor = useCallback<AuthContextValue['verifyTwoFactor']>(
    async (code) => {
      const tempToken = tempTokenRef.current;
      if (!tempToken) {
        throw new ApiError(401, 'Session de vérification expirée. Reconnectez-vous.');
      }
      const { tokens, user: verifiedUser } = await authApi.verifyCode(tempToken, code);
      return completeSignIn(tokens, verifiedUser, { offerBiometric: true });
    },
    [completeSignIn],
  );

  const resendTwoFactorCode = useCallback(async () => {
    const tempToken = tempTokenRef.current;
    if (!tempToken) {
      throw new ApiError(401, 'Session de vérification expirée. Reconnectez-vous.');
    }
    const res = await authApi.resendCode(tempToken);
    setTempToken(res.tempToken);
  }, [setTempToken]);

  const cancelTwoFactor = useCallback(() => setTempToken(null), [setTempToken]);

  const logout = useCallback(async () => {
    // Le token push est retiré tant que le jeton de session est valide. Au mieux et borné dans
    // le temps (hors ligne, serveur en panne) : la déconnexion ne dépend jamais de cet appel.
    await unregisterStoredPushToken().catch(() => undefined);
    // Face ID : une déconnexion volontaire révoque l'appareil (par nom, sans relire le jeton :
    // pas d'invite Face ID). Elle ne dépend pas non plus de cet appel.
    const preference = await getBiometricPreference();
    if (preference) {
      await authApi.revokeBiometric(preference.deviceName).catch(() => undefined);
      await clearBiometricCredentials();
      setBiometricPreference(null);
    }
    try {
      await authApi.logout();
    } catch {
      // Révocation côté serveur au mieux : hors ligne, on déconnecte quand même localement.
    }
    // `clearTokens` efface aussi l'impersonation éventuelle.
    await clearTokens();
    resetToSignedOut();
  }, [resetToSignedOut]);

  // ─── Face ID ───────────────────────────────────────────────────────────────

  const forgetBiometrics = useCallback(async () => {
    await clearBiometricCredentials();
    setBiometricPreference(null);
  }, []);

  const loginWithBiometrics = useCallback<AuthContextValue['loginWithBiometrics']>(async () => {
    const stored = await readDeviceToken();
    if (stored.status === 'failed') return 'cancelled';
    if (stored.status === 'invalidated') {
      await forgetBiometrics();
      return 'unavailable';
    }

    let result: Awaited<ReturnType<typeof authApi.biometricLogin>>;
    try {
      result = await authApi.biometricLogin(stored.token);
    } catch (error) {
      // Appareil refusé par le back (expiré, révoqué, mot de passe changé, compte désactivé) :
      // Face ID ne peut plus servir. Une panne réseau ou serveur laisse le jeton intact.
      if (error instanceof ApiError && !error.isNetworkError && error.status < 500) {
        await forgetBiometrics();
        return 'unavailable';
      }
      throw error;
    }

    // Le jeton d'appareil est à usage unique : le nouveau remplace l'ancien. S'il ne peut pas
    // être enregistré, la session s'ouvre quand même mais Face ID est à réactiver.
    try {
      await saveDeviceToken(result.deviceToken);
    } catch {
      await forgetBiometrics();
    }
    const outcome = await completeSignIn(result.tokens, result.user);
    return outcome === 'authenticated' ? 'authenticated' : 'unavailable';
  }, [completeSignIn, forgetBiometrics]);

  const enableBiometrics = useCallback(async () => {
    if (!user || user.impersonatedBy) {
      throw new Error("Face ID n'est pas disponible pendant une impersonation.");
    }
    if (!isBiometricAvailable()) {
      throw new Error("Face ID n'est pas configuré sur cet iPhone.");
    }
    const deviceName = await getDeviceName();
    const deviceToken = await authApi.enrollBiometric(deviceName);
    try {
      await saveDeviceToken(deviceToken);
      // Relecture immédiate : confirme que Face ID fonctionne avant d'annoncer l'activation.
      const check = await readDeviceToken();
      if (check.status !== 'ok') throw new Error('Face ID non confirmé.');
      await savePreference({ email: user.email, deviceName });
      setBiometricPreference({ email: user.email, deviceName });
      setBiometricOfferPending(false);
    } catch (error) {
      await clearBiometricCredentials();
      await authApi.revokeBiometric(deviceName).catch(() => undefined);
      throw error instanceof Error && error.message === 'Face ID non confirmé.'
        ? new Error("Face ID n'a pas été confirmé : l'activation est annulée.")
        : new Error("Impossible d'activer Face ID sur cet appareil.");
    }
  }, [user]);

  const disableBiometrics = useCallback(async () => {
    const preference = await getBiometricPreference();
    if (preference) await authApi.revokeBiometric(preference.deviceName).catch(() => undefined);
    await forgetBiometrics();
  }, [forgetBiometrics]);

  const dismissBiometricOffer = useCallback<AuthContextValue['dismissBiometricOffer']>(
    async (options) => {
      setBiometricOfferPending(false);
      if (options?.forever) await dismissActivationPrompt();
    },
    [],
  );

  // ─── Impersonation (SUPERADMIN) ────────────────────────────────────────────

  /**
   * Bascule l'app sur un autre compte (usurpé, ou le SUPERADMIN qui reprend la main) : les
   * données du compte précédent ne doivent pas survivre au changement, on remet donc tout
   * le cache à zéro (les requêtes actives sont relancées avec le nouveau jeton) avant
   * d'ouvrir l'écran d'accueil du nouveau compte.
   */
  const switchIdentity = useCallback(
    (next: CurrentUser) => {
      setUser(next);
      void queryClient.resetQueries();
      goToLanding(next);
    },
    [queryClient],
  );

  const startImpersonation = useCallback<AuthContextValue['startImpersonation']>(
    async (userId) => {
      // Appels faits avec la session du SUPERADMIN (`asAdmin`), même si une impersonation
      // est déjà active : on peut passer directement d'un compte à un autre.
      const { accessToken } = await authApi.impersonate(userId);
      await setImpersonation({ accessToken, targetUserId: userId });
      let target: CurrentUser;
      try {
        // `/me` avec le jeton usurpé : le compte tel que l'app doit l'afficher, avec `impersonatedBy`.
        target = await authApi.me();
      } catch (error) {
        await clearImpersonation();
        throw error;
      }
      switchIdentity(target);
      return target;
    },
    [switchIdentity],
  );

  const stopImpersonation = useCallback<AuthContextValue['stopImpersonation']>(async () => {
    // Le compte réel est lu avant d'effacer l'impersonation : si la lecture échoue (hors
    // ligne), l'état reste cohérent et l'utilisateur peut réessayer.
    const admin = await authApi.me({ asAdmin: true });
    await clearImpersonation();
    switchIdentity(admin);
  }, [switchIdentity]);

  // Impersonation devenue impossible à renouveler (compte usurpé supprimé ou désactivé) :
  // le client l'a déjà effacée, on retombe sur le compte du SUPERADMIN. Au lancement,
  // `resolveStoredSession` s'en charge lui-même.
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    setImpersonationEndedHandler(() => {
      if (statusRef.current !== 'signedIn') return;
      void resolveStoredSession().then((session) => {
        applySession(session);
        if (session.status !== 'signedIn') return;
        void queryClient.resetQueries();
        goToLanding(session.user);
        toast.error("L'impersonation a pris fin : ce compte n'est plus utilisable.");
      });
    });
    return () => setImpersonationEndedHandler(null);
  }, [applySession, queryClient]);

  const isImpersonating = !!user?.impersonatedBy;

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      hasPendingTwoFactor,
      login,
      verifyTwoFactor,
      resendTwoFactorCode,
      cancelTwoFactor,
      logout,
      biometricAvailable,
      biometricPreference,
      loginWithBiometrics,
      enableBiometrics,
      disableBiometrics,
      biometricOfferPending,
      dismissBiometricOffer,
      retryBootstrap,
      isImpersonating,
      startImpersonation,
      stopImpersonation,
    }),
    [
      status,
      user,
      hasPendingTwoFactor,
      login,
      verifyTwoFactor,
      resendTwoFactorCode,
      cancelTwoFactor,
      logout,
      biometricAvailable,
      biometricPreference,
      loginWithBiometrics,
      enableBiometrics,
      disableBiometrics,
      biometricOfferPending,
      dismissBiometricOffer,
      retryBootstrap,
      isImpersonating,
      startImpersonation,
      stopImpersonation,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return context;
}
