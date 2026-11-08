import { apiRequest } from '@/api/client';

const BASE = 'hub-app/push-tokens';

export interface RegisterPushTokenPayload {
  /** Token Expo Push (`ExponentPushToken[…]`). */
  token: string;
  platform: 'ios' | 'android';
  /** Identifiant d'installation : un seul token actif par appareil côté back. */
  deviceId: string;
}

/**
 * Enregistrement du token push de l'appareil (SUPERADMIN uniquement côté back).
 *
 * Les deux appels partent avec la session du compte réellement connecté (`asAdmin`), même
 * pendant une impersonation : le token reste rattaché au SUPERADMIN, jamais au compte usurpé.
 */
export interface RegisteredPushDevice {
  /** Token tronqué par le back. */
  token: string;
  platform: string;
  updatedAt: string;
}

export interface TestSalePushResult {
  success: boolean;
  sent: boolean;
  sentTo: number;
  reference?: string;
  reason?: string;
}

export const pushTokensApi = {
  /** Appareils Hub actifs du compte réel côté back (diagnostic). */
  me() {
    return apiRequest<{ success: boolean; count: number; devices: RegisteredPushDevice[] }>(
      `${BASE}/me`,
      { asAdmin: true },
    );
  },
  /** Envoie la notification « Nouvelle vente » de la dernière commande du site à ce compte seul. */
  testSale() {
    return apiRequest<TestSalePushResult>(`${BASE}/test-sale`, {
      method: 'POST',
      body: {},
      asAdmin: true,
    });
  },
  register(payload: RegisterPushTokenPayload) {
    return apiRequest<{ success: boolean }>(BASE, {
      method: 'POST',
      body: payload,
      asAdmin: true,
    });
  },
  unregister(token: string) {
    return apiRequest<{ success: boolean }>(BASE, {
      method: 'DELETE',
      body: { token },
      asAdmin: true,
    });
  },
};
