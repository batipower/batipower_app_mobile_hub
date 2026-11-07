import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { toast } from 'sonner-native';

import { chooseAction } from '@/lib/actionSheet';

/** Fichier prêt à être envoyé en multipart. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

export interface AttachmentRules {
  acceptedMimeTypes: readonly string[];
  /** Taille maximale d'un fichier, en octets. */
  maxFileSize: number;
  /** Nombre maximal de fichiers par message. */
  maxFiles: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

/** Discussions d'équipe : PDF, images, Word, Excel et zip (mêmes types que `MessageComposer` web). */
export const TEAM_ATTACHMENT_RULES: AttachmentRules = {
  acceptedMimeTypes: [
    'application/pdf',
    ...IMAGE_TYPES,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
  ],
  maxFileSize: MAX_FILE_SIZE,
  maxFiles: 3,
};

/** Discussions clients : PDF et images uniquement. */
export const CLIENT_ATTACHMENT_RULES: AttachmentRules = {
  acceptedMimeTypes: ['application/pdf', ...IMAGE_TYPES],
  maxFileSize: MAX_FILE_SIZE,
  maxFiles: 3,
};

export type AttachmentSource = 'photo' | 'camera' | 'document';

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  zip: 'application/zip',
};

const EXTENSION_BY_MIME = Object.fromEntries(
  Object.entries(MIME_BY_EXTENSION)
    .filter(([ext]) => ext !== 'jpeg')
    .map(([ext, mime]) => [mime, ext]),
);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Taille lisible : « 850 o », « 1,2 Ko », « 3,4 Mo ». */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} o`;
  const oneDecimal = (n: number) => n.toFixed(1).replace('.', ',');
  if (bytes < 1024 * 1024) return `${oneDecimal(bytes / 1024)} Ko`;
  return `${oneDecimal(bytes / (1024 * 1024))} Mo`;
}

interface RawAsset {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
}

/** Normalise un fichier choisi, ou renvoie le motif du refus (type ou taille hors limites). */
function validate(asset: RawAsset, rules: AttachmentRules): PickedFile | string {
  const rawName = asset.name?.trim();
  const mimeFromName = MIME_BY_EXTENSION[extensionOf(rawName ?? asset.uri)];
  const mimeType = (asset.mimeType?.toLowerCase() || mimeFromName || '').trim();
  const fallbackName = `fichier.${EXTENSION_BY_MIME[mimeType] ?? 'bin'}`;
  const name = rawName || asset.uri.split('/').pop() || fallbackName;

  if (!rules.acceptedMimeTypes.includes(mimeType)) {
    return `« ${name} » : type de fichier non accepté.`;
  }
  if (asset.size != null && asset.size > rules.maxFileSize) {
    return `« ${name} » dépasse ${rules.maxFileSize / (1024 * 1024)} Mo.`;
  }
  return { uri: asset.uri, name, mimeType, size: asset.size ?? null };
}

function collect(assets: RawAsset[], rules: AttachmentRules, remaining: number): PickedFile[] {
  const files: PickedFile[] = [];
  for (const asset of assets) {
    const result = validate(asset, rules);
    if (typeof result === 'string') {
      toast.error(result);
    } else if (files.length < remaining) {
      files.push(result);
    } else {
      toast.error(`${rules.maxFiles} fichiers au maximum par message.`);
      break;
    }
  }
  return files;
}

/**
 * Ouvre la source choisie (photothèque, caméra ou documents) et renvoie les fichiers valides
 * (limites de taille, de type et de nombre du web). Les refus sont signalés par un toast.
 */
export async function pickFromSource(
  source: AttachmentSource,
  rules: AttachmentRules,
  remaining: number,
): Promise<PickedFile[]> {
  if (remaining <= 0) {
    toast.error(`${rules.maxFiles} fichiers au maximum par message.`);
    return [];
  }

  try {
    if (source === 'document') {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...rules.acceptedMimeTypes],
        multiple: remaining > 1,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return [];
      return collect(result.assets, rules, remaining);
    }

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        toast.error("L'accès à la caméra est refusé. Autorisez-le dans les réglages de l'iPhone.");
        return [];
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled) return [];
      return collect(
        result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName,
          mimeType: a.mimeType,
          size: a.fileSize,
        })),
        rules,
        remaining,
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      quality: 0.8,
      // Les photos HEIC de l'iPhone sont converties : le back n'accepte que JPEG, PNG, GIF et WebP.
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled) return [];
    return collect(
      result.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName,
        mimeType: a.mimeType,
        size: a.fileSize,
      })),
      rules,
      remaining,
    );
  } catch {
    toast.error("Impossible d'ouvrir la sélection de fichiers.");
    return [];
  }
}

/** Propose « Photo », « Caméra » et « Document » dans une feuille d'actions native. */
export async function pickAttachment(
  rules: AttachmentRules,
  remaining: number,
): Promise<PickedFile[]> {
  const source = await chooseAction<AttachmentSource>('Ajouter une pièce jointe', [
    { label: 'Photo', value: 'photo' },
    { label: 'Caméra', value: 'camera' },
    { label: 'Document', value: 'document' },
  ]);
  return source ? pickFromSource(source, rules, remaining) : [];
}

/**
 * Corps multipart d'un envoi : sur React Native, un fichier local se décrit par
 * `{ uri, name, type }` ; `fields` ajoute des champs texte (ex. `permanent`).
 */
export function buildFileFormData(file: PickedFile, fields?: Record<string, string>): FormData {
  const formData = new FormData();
  formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  for (const [key, value] of Object.entries(fields ?? {})) formData.append(key, value);
  return formData;
}
