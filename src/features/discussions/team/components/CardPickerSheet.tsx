import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Search, type LucideIcon } from 'lucide-react-native';

import { useSheetKeyboard } from '@/components/sheet/useSheetKeyboard';
import { Badge, type BadgeTone } from '@/components/ui';
import { EmptyState, ErrorBanner } from '@/features/preparation/components/ListState';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { fontSize, hitTarget, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { teamPickerKey } from '../../queryKeys';
import { thumbnailSource } from '../teamHelpers';
import { SearchField } from './SearchField';
import { SelectableRow } from './SelectableRow';

export interface PickerResultView {
  thumbnailBase64?: string | null;
  brand: string | null;
  statusLabel: string;
  statusTone: BadgeTone;
  badge?: ReactNode;
  designation: string | null;
  meta: readonly string[];
  /** Lignes de prix déjà formatées (« Demandé HT : 12,00 € »). */
  priceLines: readonly string[];
}

type CardPickerSheetProps<T extends { uuid: string }> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  searchPlaceholder: string;
  kind: 'opportunities' | 'renegotiations';
  /** Couleur d'accent du type de carte. */
  accent: string;
  icon: LucideIcon;
  fetchResults: (term: string, signal: AbortSignal) => Promise<T[]>;
  /** Uuids déjà joints au message (cochés et non modifiables). */
  alreadyAttachedUuids: readonly string[];
  /** Nombre de cartes encore ajoutables au message. */
  remainingSlots: number;
  /** Sélection unique (carte initiale d'une discussion) : la dernière coche remplace la précédente. */
  single?: boolean;
  /**
   * Rend le sélecteur dans la page courante, sans `Modal` : à utiliser depuis une feuille native
   * (`formSheet`), où un `Modal` imbriqué se présente mal sur iOS.
   */
  inline?: boolean;
  confirmLabel?: string;
  describe: (item: T) => PickerResultView;
  /** Libellé lu par les lecteurs d'écran pour une ligne. */
  itemLabel: (item: T) => string;
  onConfirm: (items: T[]) => void;
};

/**
 * Feuille de sélection de cartes (opportunités ou renégociations) : recherche avec délai,
 * multi-sélection jusqu'à la limite restante, confirmation par « Ajouter ». Présentée en
 * `Modal` natif (`pageSheet`) depuis le composer, sans nouvelle route, pour conserver le brouillon.
 * Depuis une feuille native (`formSheet`), `inline` le rend dans la page au lieu d'un `Modal`.
 */
export function CardPickerSheet<T extends { uuid: string }>(props: CardPickerSheetProps<T>) {
  if (props.inline) {
    return props.visible ? (
      <PickerRoot inline>
        <PickerBody {...props} />
      </PickerRoot>
    ) : null;
  }
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      <PickerRoot>
        <PickerBody {...props} />
      </PickerRoot>
    </Modal>
  );
}

/** Fond du sélecteur : le clavier réduit la liste au lieu de la recouvrir. */
function PickerRoot({ children, inline = false }: { children: ReactNode; inline?: boolean }) {
  const styles = useStyles();
  const { rootStyle } = useSheetKeyboard();
  return (
    <Animated.View style={[styles.root, inline && styles.rootInline, rootStyle]}>
      {children}
    </Animated.View>
  );
}

function PickerBody<T extends { uuid: string }>({
  onClose,
  title,
  description,
  searchPlaceholder,
  kind,
  accent,
  icon: Icon,
  fetchResults,
  alreadyAttachedUuids,
  remainingSlots,
  single = false,
  confirmLabel = 'Ajouter',
  describe,
  itemLabel,
  onConfirm,
}: CardPickerSheetProps<T>) {
  const styles = useStyles();
  const t = useTheme();
  const [text, setText] = useState('');
  const term = useDebouncedTerm(text);
  // Éléments cochés dans cette session (ordre d'ajout = ordre dans le message).
  const [picked, setPicked] = useState<T[]>([]);

  const query = useQuery({
    queryKey: teamPickerKey(kind, term),
    queryFn: ({ signal }) => fetchResults(term, signal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const already = useMemo(() => new Set(alreadyAttachedUuids), [alreadyAttachedUuids]);
  const pickedUuids = useMemo(() => new Set(picked.map((p) => p.uuid)), [picked]);
  const capacity = single ? 1 : remainingSlots;
  const full = picked.length >= capacity;

  const toggle = useCallback(
    (item: T) => {
      setPicked((previous) => {
        if (previous.some((p) => p.uuid === item.uuid)) {
          return previous.filter((p) => p.uuid !== item.uuid);
        }
        if (single) return [item];
        return previous.length >= capacity ? previous : [...previous, item];
      });
    },
    [single, capacity],
  );

  const confirm = () => {
    if (picked.length > 0) onConfirm(picked);
    onClose();
  };

  const renderItem = useCallback(
    ({ item }: { item: T }) => {
      const view = describe(item);
      const isAlready = already.has(item.uuid);
      const isPicked = pickedUuids.has(item.uuid);
      const accessibilityLabel = `${itemLabel(item)}${isAlready ? ', déjà jointe' : ''}`;
      return (
        <SelectableRow
          selected={isPicked || isAlready}
          disabled={isAlready || (!isPicked && full && !single)}
          onPress={() => toggle(item)}
          accessibilityLabel={accessibilityLabel}
          mode={single ? 'radio' : 'checkbox'}
        >
          <ResultContent view={view} accent={accent} icon={Icon} already={isAlready} />
        </SelectableRow>
      );
    },
    [describe, already, pickedUuids, itemLabel, full, single, toggle, accent, Icon],
  );

  return (
    <>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Annuler"
          style={styles.side}
        >
          <Text style={styles.cancel}>Annuler</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          onPress={confirm}
          disabled={picked.length === 0}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`${confirmLabel}, ${picked.length} sélectionné${picked.length > 1 ? 's' : ''}`}
          accessibilityState={{ disabled: picked.length === 0 }}
          style={[styles.side, styles.sideEnd]}
        >
          <Text style={[styles.confirm, picked.length === 0 && { color: t.textFaint }]}>
            {confirmLabel}
            {picked.length > 0 && !single ? ` (${picked.length})` : ''}
          </Text>
        </Pressable>
      </View>

      <View style={styles.toolbar}>
        <SearchField value={text} onChangeText={setText} placeholder={searchPlaceholder} />
        <Text style={styles.hint}>
          {single
            ? description
            : `${description} ${picked.length}/${capacity} sélectionné${picked.length > 1 ? 's' : ''}${
                full ? ' (limite atteinte)' : ''
              }.`}
        </Text>
      </View>

      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.uuid}
        renderItem={renderItem}
        extraData={picked}
        ItemSeparatorComponent={Separator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        windowSize={7}
        ListEmptyComponent={
          query.isPending ? (
            <View style={styles.center}>
              <ActivityIndicator color={t.accentText} />
            </View>
          ) : query.error ? (
            <View style={styles.banner}>
              <ErrorBanner
                error={query.error}
                fallback="Impossible de lancer la recherche."
                onRetry={() => void query.refetch()}
              />
            </View>
          ) : (
            <EmptyState
              icon={<Search size={24} color={t.textMuted} />}
              title={term ? 'Aucun résultat' : 'Rien à afficher'}
              text={
                term
                  ? 'Essayez une autre référence ou un autre mot-clé.'
                  : 'Saisissez une référence, un EAN, une désignation ou une marque.'
              }
            />
          )
        }
      />
    </>
  );
}

function Separator() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border }} />;
}

type ResultContentProps = {
  view: PickerResultView;
  accent: string;
  icon: LucideIcon;
  already: boolean;
};

function ResultContent({ view, accent, icon: Icon, already }: ResultContentProps) {
  const styles = useStyles();
  const source = thumbnailSource(view.thumbnailBase64);
  return (
    <View style={styles.result}>
      {source ? (
        <Image source={{ uri: source }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View
          style={[styles.thumb, styles.thumbFallback, { backgroundColor: withAlpha(accent, 0.16) }]}
        >
          <Icon size={18} color={accent} />
        </View>
      )}
      <View style={styles.resultBody}>
        <View style={styles.titleRow}>
          {view.brand ? (
            <Text style={styles.brand} numberOfLines={1}>
              {view.brand}
            </Text>
          ) : null}
          <Badge label={view.statusLabel} tone={view.statusTone} />
          {view.badge}
          {already ? <Badge label="Déjà jointe" /> : null}
        </View>
        <Text style={styles.designation} numberOfLines={2}>
          {view.designation ?? '—'}
        </Text>
        {view.meta.length > 0 ? (
          <Text style={styles.meta} numberOfLines={1}>
            {view.meta.join(' · ')}
          </Text>
        ) : null}
        {view.priceLines.length > 0 ? (
          <Text style={styles.prices} numberOfLines={2}>
            {view.priceLines.join('   ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bgElevated },
  // Laisse la place du grabber d'une feuille native au-dessus de l'en-tête.
  rootInline: { paddingTop: spacing.md },
  header: {
    minHeight: hitTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  side: { minWidth: 88, minHeight: hitTarget, justifyContent: 'center' },
  sideEnd: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  cancel: { fontSize: fontSize.sm, fontWeight: '600', color: t.textMuted },
  confirm: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  toolbar: { gap: spacing.sm, padding: spacing.lg },
  hint: { fontSize: 11, color: t.textMuted },
  listContent: { paddingBottom: spacing['4xl'] },
  center: { padding: spacing['4xl'], alignItems: 'center' },
  banner: { paddingHorizontal: spacing.lg },
  result: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  thumb: { width: 44, height: 44, borderRadius: radius.md },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  resultBody: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs + 2 },
  brand: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: t.text,
  },
  designation: { fontSize: fontSize.sm, fontWeight: '500', color: t.text },
  meta: { fontSize: 11, color: t.textMuted },
  prices: { fontSize: 11, fontWeight: '700', color: t.textMuted },
}));
