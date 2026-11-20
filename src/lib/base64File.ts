import { Directory, File, Paths } from 'expo-file-system';

import { openLocalFile } from '@/lib/openAttachment';

/** Nom de fichier sûr pour le cache : sans séparateur de chemin ni caractère exotique. */
function safeName(fileName: string): string {
  const cleaned = fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
  return cleaned.length > 0 ? cleaned.slice(-120) : 'document.pdf';
}

/** Écrit un contenu base64 (facture, avoir, étiquette PDF) dans le cache de l'app. */
export function saveBase64File(base64: string, fileName: string): File {
  const directory = new Directory(Paths.cache, 'downloads');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, safeName(fileName));
  file.create({ overwrite: true });
  // Un éventuel préfixe `data:application/pdf;base64,` n'est pas du base64.
  file.write(base64.replace(/^data:[^,]*,/, ''), { encoding: 'base64' });
  return file;
}

/** Enregistre le PDF reçu en base64 puis l'ouvre dans l'aperçu natif (Quick Look / partage). */
export async function openBase64Pdf(base64: string, fileName: string, title?: string): Promise<void> {
  await openLocalFile(saveBase64File(base64, fileName), title);
}
