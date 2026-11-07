import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { toast } from 'sonner-native';

/**
 * Ouvre un fichier local dans l'aperçu natif (Quick Look sur iOS) ; à défaut, dans la feuille de
 * partage. Le fichier doit exister dans le cache de l'app.
 */
export async function openLocalFile(file: File, title?: string): Promise<void> {
  try {
    if (await File.canPreview(file)) {
      await File.preview(file, { title });
      return;
    }
  } catch {
    // Aperçu indisponible pour ce type : on tente le partage.
  }
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { dialogTitle: title, mimeType: file.type || undefined });
      return;
    }
  } catch {
    // Géré ci-dessous.
  }
  toast.error("Impossible d'ouvrir ce fichier sur cet appareil.");
}
