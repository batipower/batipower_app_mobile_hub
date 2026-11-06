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
  await openExternalUrl(`${env.webUrl}${path}`, "Impossible d'ouvrir la page web.");
}

/** Ouvre une URL absolue (suivi transporteur…) dans le navigateur intégré. */
export async function openExternalUrl(
  url: string,
  errorMessage = "Impossible d'ouvrir le lien.",
): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, { controlsColor: colors.green });
  } catch {
    toast.error(errorMessage);
  }
}
