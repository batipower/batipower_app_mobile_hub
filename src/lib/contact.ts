import { Linking } from 'react-native';
import { toast } from 'sonner-native';

async function open(url: string, errorMessage: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    toast.error(errorMessage);
  }
}

/** Lance un appel : les espaces et séparateurs du numéro saisi dans le back sont retirés. */
export function callPhone(number: string): Promise<void> {
  return open(`tel:${number.replace(/[^\d+]/g, '')}`, "Impossible de lancer l'appel.");
}

export function composeEmail(address: string): Promise<void> {
  return open(`mailto:${address.trim()}`, "Impossible d'ouvrir la messagerie.");
}
