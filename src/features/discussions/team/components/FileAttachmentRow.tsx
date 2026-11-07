import { memo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FileText, Lock, LockOpen } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { discussionsApi } from '@/api/discussions';
import { errorMessage } from '@/features/preparation/components/ListState';
import { openLocalFile } from '@/lib/openAttachment';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { GroupMessageFileAttachment } from '@/types/discussions';

import { fileAvailability, formatFileSize } from '../teamHelpers';

type FileAttachmentRowProps = {
  file: GroupMessageFileAttachment;
  conversationId: string;
  /** L'auteur du message ou un SUPERADMIN peut basculer « Conserver définitivement ». */
  canTogglePermanent: boolean;
};

/**
 * Pièce jointe fichier d'un message : un appui la télécharge (avec le jeton de l'app) puis
 * l'ouvre dans l'aperçu natif. Mention « 30 j » ou « Permanent » ; un fichier expiré ou
 * supprimé n'est plus cliquable.
 */
export const FileAttachmentRow = memo(function FileAttachmentRow({
  file,
  conversationId,
  canTogglePermanent,
}: FileAttachmentRowProps) {
  const styles = useStyles();
  const t = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [toggling, setToggling] = useState(false);
  // Valeur choisie ici, tant que le prochain rafraîchissement du fil ne l'a pas rattrapée.
  const [permanentOverride, setPermanentOverride] = useState<boolean | null>(null);

  const permanent = permanentOverride ?? file.permanent;
  const availability = fileAvailability({ ...file, permanent });
  const available = availability === 'available';
  const size = formatFileSize(file.fileSize);

  const open = async () => {
    if (!available || downloading) return;
    setDownloading(true);
    try {
      const local = await discussionsApi.downloadFile(conversationId, file.id, file.fileName);
      await openLocalFile(local, file.fileName);
    } catch (error) {
      toast.error(errorMessage(error, 'Impossible de télécharger ce fichier.'));
    } finally {
      setDownloading(false);
    }
  };

  const togglePermanent = async () => {
    if (toggling) return;
    const next = !permanent;
    setToggling(true);
    try {
      await discussionsApi.toggleFilePermanent(conversationId, file.id, next);
      setPermanentOverride(next);
      void Haptics.selectionAsync().catch(() => undefined);
      toast.success(next ? 'Fichier conservé définitivement.' : 'Fichier conservé 30 jours.');
    } catch (error) {
      toast.error(errorMessage(error, 'Impossible de modifier la conservation du fichier.'));
    } finally {
      setToggling(false);
    }
  };

  const retention =
    availability === 'expired'
      ? 'Expiré'
      : availability === 'deleted'
        ? 'Supprimé'
        : permanent
          ? 'Permanent'
          : '30 j';

  return (
    <View style={[styles.row, !available && styles.rowDisabled]}>
      <Pressable
        onPress={() => void open()}
        disabled={!available || downloading}
        accessibilityRole="button"
        accessibilityLabel={`${file.fileName}, ${size}, ${retention}${available ? '. Ouvrir le fichier' : ''}`}
        accessibilityState={{ disabled: !available, busy: downloading }}
        style={styles.main}
      >
        {downloading ? (
          <ActivityIndicator size="small" color={t.accentText} />
        ) : (
          <FileText size={18} color={available ? t.info : t.textFaint} />
        )}
        <View style={styles.texts}>
          <Text style={[styles.name, !available && styles.nameDisabled]} numberOfLines={1}>
            {file.fileName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[size, retention].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Pressable>
      {canTogglePermanent && available ? (
        <Pressable
          onPress={() => void togglePermanent()}
          disabled={toggling}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            permanent
              ? 'Fichier conservé définitivement. Repasser à 30 jours'
              : 'Fichier conservé 30 jours. Conserver définitivement'
          }
          style={styles.lock}
        >
          {toggling ? (
            <ActivityIndicator size="small" color={t.warning} />
          ) : permanent ? (
            <Lock size={16} color={t.warning} />
          ) : (
            <LockOpen size={16} color={t.textSubtle} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  rowDisabled: { opacity: 0.7 },
  main: {
    flex: 1,
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  texts: { flex: 1 },
  name: { fontSize: fontSize.xs, fontWeight: '600', color: t.text },
  nameDisabled: { textDecorationLine: 'line-through', color: t.textMuted },
  meta: { fontSize: 11, color: t.textMuted },
  lock: {
    width: hitTarget,
    minHeight: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
