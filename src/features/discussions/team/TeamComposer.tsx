import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ArrowUp, FileText, Plus, TriangleAlert, X } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { discussionsApi } from '@/api/discussions';
import { useAuth } from '@/auth/AuthProvider';
import { canAttachOpportunities, canAttachRenegotiations } from '@/auth/permissions';
import { errorMessage } from '@/features/preparation/components/ListState';
import { chooseAction } from '@/lib/actionSheet';
import {
  formatFileSize,
  pickFromSource,
  TEAM_ATTACHMENT_RULES,
  type AttachmentSource,
  type PickedFile,
} from '@/lib/pickAttachment';
import {
  fontSize,
  hitTarget,
  makeStyles,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from '@/theme';
import {
  MAX_MESSAGE_ATTACHMENTS,
  type GroupMessageAttachment,
} from '@/types/discussions';

import { TEAM_LIST_KEY, teamMessagesKey } from '../queryKeys';
import { OpportunityCard } from './components/OpportunityCard';
import { RenegotiationCard } from './components/RenegotiationCard';
import { OpportunityPickerSheet } from './OpportunityPickerSheet';
import { RenegotiationPickerSheet } from './RenegotiationPickerSheet';
import {
  cardKey,
  opportunityCardFromResult,
  renegotiationCardFromResult,
  TEAM_MESSAGE_MAX_LENGTH,
  toOutgoingCard,
} from './teamHelpers';

/** Compteur de caractères affiché dès 90 % de la limite. */
const COUNTER_THRESHOLD = Math.floor(TEAM_MESSAGE_MAX_LENGTH * 0.9);

type ComposerFileStatus = 'uploading' | 'done' | 'error';

interface ComposerFile {
  localId: string;
  picked: PickedFile;
  status: ComposerFileStatus;
  /** Identifiant renvoyé par le back une fois le fichier téléversé. */
  fileId: string | null;
  /** « Conserver définitivement » : valeur affichée (et voulue) pour ce fichier. */
  permanent: boolean;
}

type PickerKind = 'opportunities' | 'renegotiations';

type TeamComposerProps = {
  conversationId: string;
  /** Discussion archivée : lecture seule, saisie et pièces jointes désactivées. */
  archived: boolean;
  /** Appelé après un envoi réussi (le fil se replace sur le dernier message). */
  onSent?: () => void;
};

let localCounter = 0;
const nextLocalId = () => `local-${Date.now()}-${localCounter++}`;

/**
 * Zone de saisie du fil Équipe : texte (4000 caractères), pièces jointes fichier (envoyées
 * dès la sélection, avec bascule « Conserver définitivement ») et cartes opportunité ou
 * renégociation (10 au plus). Le brouillon n'est vidé qu'après un envoi réussi.
 */
export function TeamComposer({ conversationId, archived, onSent }: TeamComposerProps) {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [text, setText] = useState('');
  const [files, setFiles] = useState<ComposerFile[]>([]);
  const [cards, setCards] = useState<GroupMessageAttachment[]>([]);
  const [picker, setPicker] = useState<PickerKind | null>(null);
  // Choix « Conserver définitivement » fait pendant le téléversement, appliqué à son terme.
  const wantedPermanent = useRef(new Map<string, boolean>());

  const allowOpportunities = !!user && canAttachOpportunities(user.role);
  const allowRenegotiations = canAttachRenegotiations(user);

  const trimmed = text.trim();
  const uploading = files.some((f) => f.status === 'uploading');
  const failedFiles = files.some((f) => f.status === 'error');
  const hasContent = trimmed.length > 0 || cards.length > 0 || files.length > 0;

  const send = useMutation({
    mutationFn: () =>
      discussionsApi.postMessage(
        conversationId,
        trimmed,
        cards.length > 0 ? cards.map(toOutgoingCard) : null,
        files.length > 0
          ? files.flatMap((f) => (f.fileId ? [f.fileId] : []))
          : undefined,
      ),
    onSuccess: () => {
      setText('');
      setFiles([]);
      setCards([]);
      wantedPermanent.current.clear();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      void queryClient.invalidateQueries({ queryKey: teamMessagesKey(conversationId) });
      void queryClient.invalidateQueries({ queryKey: TEAM_LIST_KEY });
      onSent?.();
    },
    onError: (error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => undefined,
      );
      toast.error(errorMessage(error, "Impossible d'envoyer le message."));
    },
  });

  const canSend =
    hasContent &&
    trimmed.length <= TEAM_MESSAGE_MAX_LENGTH &&
    !send.isPending &&
    !uploading &&
    !failedFiles &&
    !archived;

  const patchFile = (localId: string, patch: Partial<ComposerFile>) =>
    setFiles((previous) => previous.map((f) => (f.localId === localId ? { ...f, ...patch } : f)));

  const upload = async (localId: string, picked: PickedFile) => {
    patchFile(localId, { status: 'uploading' });
    try {
      const result = await discussionsApi.uploadFile(conversationId, picked, false);
      patchFile(localId, { status: 'done', fileId: result.id });
      // Bascule demandée pendant le téléversement : on l'applique maintenant que le fichier existe.
      const wanted = wantedPermanent.current.get(localId);
      if (wanted !== undefined && wanted !== result.permanent) {
        try {
          await discussionsApi.toggleFilePermanent(conversationId, result.id, wanted);
        } catch (error) {
          patchFile(localId, { permanent: result.permanent });
          toast.error(errorMessage(error, 'Impossible de modifier la conservation du fichier.'));
        }
      }
    } catch (error) {
      patchFile(localId, { status: 'error' });
      toast.error(errorMessage(error, `Échec de l'envoi de « ${picked.name} ».`));
    }
  };

  const addFiles = (picked: PickedFile[]) => {
    const entries: ComposerFile[] = picked.map((file) => ({
      localId: nextLocalId(),
      picked: file,
      status: 'uploading',
      fileId: null,
      permanent: false,
    }));
    if (entries.length === 0) return;
    setFiles((previous) => [...previous, ...entries]);
    for (const entry of entries) void upload(entry.localId, entry.picked);
  };

  const removeFile = (localId: string) => {
    wantedPermanent.current.delete(localId);
    setFiles((previous) => previous.filter((f) => f.localId !== localId));
  };

  const togglePermanent = async (file: ComposerFile, next: boolean) => {
    void Haptics.selectionAsync().catch(() => undefined);
    patchFile(file.localId, { permanent: next });
    if (file.status !== 'done' || !file.fileId) {
      // Pas encore téléversé : la valeur sera appliquée à la fin du téléversement.
      wantedPermanent.current.set(file.localId, next);
      return;
    }
    try {
      await discussionsApi.toggleFilePermanent(conversationId, file.fileId, next);
    } catch (error) {
      patchFile(file.localId, { permanent: !next });
      toast.error(errorMessage(error, 'Impossible de modifier la conservation du fichier.'));
    }
  };

  const remainingCardSlots = MAX_MESSAGE_ATTACHMENTS - cards.length;

  const addCards = (incoming: GroupMessageAttachment[]) => {
    setCards((previous) => {
      const known = new Set(previous.map(cardKey));
      const additions: GroupMessageAttachment[] = [];
      for (const card of incoming) {
        if (known.has(cardKey(card))) continue;
        if (previous.length + additions.length >= MAX_MESSAGE_ATTACHMENTS) break;
        additions.push(card);
      }
      return [...previous, ...additions];
    });
  };

  const openAddMenu = async () => {
    if (archived || send.isPending) return;
    const choice = await chooseAction<AttachmentSource | PickerKind>('Ajouter à ce message', [
      { label: 'Photo', value: 'photo' },
      { label: 'Caméra', value: 'camera' },
      { label: 'Document', value: 'document' },
      ...(allowOpportunities ? [{ label: 'Opportunité', value: 'opportunities' as const }] : []),
      ...(allowRenegotiations ? [{ label: 'Renégociation', value: 'renegotiations' as const }] : []),
    ]);
    if (!choice) return;

    if (choice === 'opportunities' || choice === 'renegotiations') {
      if (remainingCardSlots <= 0) {
        toast.error(`Limite atteinte (${MAX_MESSAGE_ATTACHMENTS} cartes au maximum par message).`);
        return;
      }
      setPicker(choice);
      return;
    }

    const remaining = TEAM_ATTACHMENT_RULES.maxFiles - files.length;
    addFiles(await pickFromSource(choice, TEAM_ATTACHMENT_RULES, remaining));
  };

  const hasAttachments = cards.length > 0 || files.length > 0;

  return (
    <SafeAreaView edges={['bottom']} style={styles.bar}>
      {hasAttachments ? (
        <View style={styles.attachments}>
          {cards.length > 0 ? (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>
                  {cards.length} carte{cards.length > 1 ? 's' : ''} jointe
                  {cards.length > 1 ? 's' : ''} ({cards.length}/{MAX_MESSAGE_ATTACHMENTS})
                </Text>
                <Pressable
                  onPress={() => setCards([])}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Retirer toutes les cartes"
                >
                  <Text style={styles.groupAction}>Tout retirer</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardsRow}
                keyboardShouldPersistTaps="handled"
              >
                {cards.map((card) => (
                  <View key={cardKey(card)} style={styles.cardSlot}>
                    {card.type === 'OPPORTUNITY' ? (
                      <OpportunityCard
                        attachment={card}
                        onRemove={() =>
                          setCards((previous) => previous.filter((c) => cardKey(c) !== cardKey(card)))
                        }
                      />
                    ) : (
                      <RenegotiationCard
                        attachment={card}
                        onRemove={() =>
                          setCards((previous) => previous.filter((c) => cardKey(c) !== cardKey(card)))
                        }
                      />
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {files.length > 0 ? (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>
                {files.length} fichier{files.length > 1 ? 's' : ''} ({files.length}/
                {TEAM_ATTACHMENT_RULES.maxFiles})
              </Text>
              {files.map((file) => (
                <FileChip
                  key={file.localId}
                  file={file}
                  onRemove={() => removeFile(file.localId)}
                  onRetry={() => void upload(file.localId, file.picked)}
                  onTogglePermanent={(next) => void togglePermanent(file, next)}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable
          onPress={() => void openAddMenu()}
          disabled={archived || send.isPending}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une pièce jointe"
          accessibilityState={{ disabled: archived || send.isPending }}
          style={[styles.roundButton, styles.addButton, (archived || send.isPending) && styles.dim]}
        >
          <Plus size={22} color={t.accentText} />
        </Pressable>

        <View style={styles.inputWrap}>
          <TextInput
            value={text}
            onChangeText={setText}
            editable={!archived && !send.isPending}
            multiline
            maxLength={TEAM_MESSAGE_MAX_LENGTH}
            placeholder={
              archived
                ? 'Discussion archivée : restaurez-la pour écrire.'
                : 'Écrire un message…'
            }
            placeholderTextColor={t.textFaint}
            selectionColor={t.accentText}
            keyboardAppearance={t.scheme}
            accessibilityLabel="Message"
            textAlignVertical="center"
            style={styles.input}
          />
          {text.length >= COUNTER_THRESHOLD ? (
            <Text
              style={[
                styles.counter,
                text.length >= TEAM_MESSAGE_MAX_LENGTH && { color: t.danger },
              ]}
              accessibilityLabel={`${text.length} caractères sur ${TEAM_MESSAGE_MAX_LENGTH}`}
            >
              {text.length}/{TEAM_MESSAGE_MAX_LENGTH}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => send.mutate()}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
          accessibilityState={{ disabled: !canSend, busy: send.isPending }}
          style={[styles.roundButton, styles.sendButton, !canSend && styles.sendDisabled]}
        >
          {send.isPending ? (
            <ActivityIndicator size="small" color={t.onAccent} />
          ) : (
            <ArrowUp size={20} color={canSend ? t.onAccent : t.textFaint} strokeWidth={2.5} />
          )}
        </Pressable>
      </View>

      <OpportunityPickerSheet
        visible={picker === 'opportunities'}
        onClose={() => setPicker(null)}
        remainingSlots={remainingCardSlots}
        alreadyAttachedUuids={cards.flatMap((c) => (c.type === 'OPPORTUNITY' ? [c.opportunityUuid] : []))}
        onConfirm={(items) => addCards(items.map(opportunityCardFromResult))}
      />
      <RenegotiationPickerSheet
        visible={picker === 'renegotiations'}
        onClose={() => setPicker(null)}
        remainingSlots={remainingCardSlots}
        alreadyAttachedUuids={cards.flatMap((c) =>
          c.type === 'RENEGOTIATION' ? [c.renegotiationUuid] : [],
        )}
        onConfirm={(items) => addCards(items.map(renegotiationCardFromResult))}
      />
    </SafeAreaView>
  );
}

type FileChipProps = {
  file: ComposerFile;
  onRemove: () => void;
  onRetry: () => void;
  onTogglePermanent: (next: boolean) => void;
};

/** Puce d'un fichier à joindre : nom, taille, état du téléversement, bascule de conservation. */
function FileChip({ file, onRemove, onRetry, onTogglePermanent }: FileChipProps) {
  const styles = useStyles();
  const t = useTheme();
  const failed = file.status === 'error';
  const size = formatFileSize(file.picked.size);

  return (
    <View style={[styles.chip, failed && { borderColor: withAlpha(t.danger, 0.6) }]}>
      <View style={styles.chipIcon}>
        {file.status === 'uploading' ? (
          <ActivityIndicator size="small" color={t.accentText} />
        ) : failed ? (
          <TriangleAlert size={18} color={t.danger} />
        ) : (
          <FileText size={18} color={t.info} />
        )}
      </View>
      <View style={styles.chipTexts}>
        <Text style={styles.chipName} numberOfLines={1}>
          {file.picked.name}
        </Text>
        {failed ? (
          <Pressable
            onPress={onRetry}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Échec de l'envoi de ${file.picked.name}. Réessayer`}
          >
            <Text style={[styles.chipMeta, { color: t.danger }]}>Échec de l&apos;envoi · Réessayer</Text>
          </Pressable>
        ) : (
          <Text style={styles.chipMeta} numberOfLines={1}>
            {[size, file.status === 'uploading' ? 'Envoi en cours…' : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </View>
      {!failed ? (
        <View style={styles.permanent}>
          <Text style={styles.permanentLabel}>Définitif</Text>
          <Switch
            value={file.permanent}
            onValueChange={onTogglePermanent}
            trackColor={{ true: t.accent, false: t.surfaceStrong }}
            accessibilityLabel={`Conserver définitivement ${file.picked.name}`}
            accessibilityHint="Sans cette option, le fichier est conservé 30 jours"
          />
        </View>
      ) : null}
      <Pressable
        onPress={onRemove}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Retirer ${file.picked.name}`}
        style={styles.chipRemove}
      >
        <X size={16} color={t.textMuted} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.bgElevated,
  },
  attachments: { gap: spacing.sm },
  group: { gap: spacing.xs + 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  groupAction: { fontSize: 12, fontWeight: '600', color: t.accentText },
  cardsRow: { gap: spacing.sm, paddingRight: spacing.md },
  cardSlot: { width: 300 },
  chip: {
    minHeight: hitTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  chipIcon: { width: 24, alignItems: 'center' },
  chipTexts: { flex: 1, gap: 1 },
  chipName: { fontSize: fontSize.xs, fontWeight: '600', color: t.text },
  chipMeta: { fontSize: 11, color: t.textMuted },
  permanent: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  permanentLabel: { fontSize: 11, fontWeight: '600', color: t.textMuted },
  chipRemove: { width: hitTarget - 8, height: hitTarget, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingBottom: spacing.sm },
  roundButton: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: { backgroundColor: t.surfaceStrong },
  sendButton: { backgroundColor: t.accent },
  sendDisabled: { backgroundColor: t.surfaceStrong },
  dim: { opacity: 0.4 },
  inputWrap: {
    flex: 1,
    minHeight: hitTarget,
    maxHeight: 140,
    justifyContent: 'center',
    borderRadius: radius.xl + 4,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  input: {
    minHeight: hitTarget - 2,
    maxHeight: 130,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    fontSize: fontSize.sm,
    color: t.text,
  },
  counter: {
    position: 'absolute',
    right: spacing.md,
    bottom: 2,
    fontSize: 10,
    fontWeight: '700',
    color: t.textMuted,
  },
}));
