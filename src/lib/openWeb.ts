import * as WebBrowser from 'expo-web-browser';
import { toast } from 'sonner-native';

import { env } from '@/config/env';
import { colors } from '@/theme';

/**
 * Ouvre une page du front externe web dans le navigateur intégré (SFSafariViewController).
 * Utilisé pour les parcours pas encore portés sur mobile : mot de passe oublié,
 * demande d'accès, changement du mot de passe temporaire.
 */
export async function openWebPage(path: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(`${env.webUrl}${path}`, {
      controlsColor: colors.green,
    });
  } catch {
    toast.error("Impossible d'ouvrir la page web.");
  }
}
