import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';

/** Copie une valeur (référence, n° de suivi, EAN…) avec un retour haptique et un toast. */
export async function copyToClipboard(value: string, label: string): Promise<void> {
  try {
    await Clipboard.setStringAsync(value);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    toast.success(`${label} copié`);
  } catch {
    toast.error('Impossible de copier.');
  }
}
