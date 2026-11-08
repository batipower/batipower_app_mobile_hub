import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  Folder,
  Handshake,
  MessageSquare,
  Package,
  RefreshCcw,
  Tag,
  type LucideIcon,
} from 'lucide-react-native';
import { toast } from 'sonner-native';

import { discussionsApi } from '@/api/discussions';
import { useAuth } from '@/auth/AuthProvider';
import { canAttachRenegotiations } from '@/auth/permissions';
import { Button, Card, Chip, TextField } from '@/components/ui';
import { openFromMenu } from '@/features/menu/navigation';
import { SheetScreen } from '@/components/sheet/SheetScreen';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { errorMessage } from '@/features/preparation/components/ListState';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';
import {
  CATEGORY_TYPE_VALUES,
  type CategoryTypeEnum,
  type CreateConversationPayload,
  type DiscussionEligibleUser,
  type DiscussionProductSearchResult,
  type GroupDiscussionScope,
} from '@/types/discussions';
import type { AppUserRole } from '@/types/user';

import { openTeamThread } from '../navigation';
import { TEAM_LIST_KEY } from '../queryKeys';
import { categoryTypeLabel } from '../shared/format';
import { BrandPicker } from './components/BrandPicker';
import { ProductPicker } from './components/ProductPicker';
import { UserPicker } from './components/UserPicker';
import { OpportunityPickerSheet } from './OpportunityPickerSheet';
import { RenegotiationPickerSheet } from './RenegotiationPickerSheet';

type Mode = 'group' | 'direct';
type Step = 'scope' | 'members';

/**
 * Sujet affiché : « Opportunité » et « Renégociation » ne sont pas de vrais scopes du back,
 * mais une discussion libre (`FREE`) créée avec une carte initiale (comme le web).
 */
type VisualScope = GroupDiscussionScope | 'OPPORTUNITY' | 'RENEGOTIATION';

/** Rôles autorisés à ouvrir une discussion à partir d'une carte (`ATTACHMENT_ROLES` du web). */
const ATTACHMENT_ROLES: readonly AppUserRole[] = [
  'SUPERADMIN',
  'RESPONSABLE_ACHAT',
  'RESPONSABLE_ACHAT_REFERENT',
];

interface InitialCard {
  type: 'OPPORTUNITY' | 'RENEGOTIATION';
  uuid: string;
  label: string;
}

const MODES = [
  { key: 'group', label: 'Discussion' },
  { key: 'direct', label: 'Message direct' },
] as const;

const TITLE_PLACEHOLDERS: Record<VisualScope, string> = {
  CATEGORY: 'ex. Réapprovisionnement Plomberie semaine 22',
  BRAND: 'ex. Négociation marque Vaillant T3 2026',
  PRODUCT_SET: 'ex. Sélection chauffe-eau gamme premium',
  OPPORTUNITY: 'ex. Suivi opportunité Schneider',
  RENEGOTIATION: 'ex. Renégo prix Legrand',
  FREE: 'ex. Coordination équipe achat — divers',
  DIRECT: '',
};

interface ScopeTileMeta {
  scope: VisualScope;
  title: string;
  description: string;
  icon: LucideIcon;
}

const BASE_TILES: readonly ScopeTileMeta[] = [
  { scope: 'CATEGORY', title: 'Service entier', description: 'Une famille produit', icon: Folder },
  { scope: 'BRAND', title: 'Marque', description: "Toutes les réfs d'une marque", icon: Tag },
  {
    scope: 'PRODUCT_SET',
    title: 'Sélection produits',
    description: 'Plusieurs produits regroupés',
    icon: Package,
  },
  { scope: 'FREE', title: 'Discussion libre', description: 'Aucun rattachement', icon: MessageSquare },
];

/**
 * Feuille de création : discussion de groupe (sujet puis invités, comme `NewDiscussionDialog`
 * du web) ou message direct 1-à-1. Après création, la feuille se ferme puis le fil s'ouvre.
 */
export function NewDiscussionSheet() {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canAttachSubject = !!user && ATTACHMENT_ROLES.includes(user.role);
  const canAttachReneg = canAttachSubject && canAttachRenegotiations(user);

  const [mode, setMode] = useState<Mode>('group');
  const [step, setStep] = useState<Step>('scope');
  const [visualScope, setVisualScope] = useState<VisualScope>('CATEGORY');
  const [title, setTitle] = useState('');
  const [categoryType, setCategoryType] = useState<CategoryTypeEnum | null>(null);
  const [brand, setBrand] = useState('');
  const [products, setProducts] = useState<DiscussionProductSearchResult[]>([]);
  const [initialCard, setInitialCard] = useState<InitialCard | null>(null);
  const [invited, setInvited] = useState<DiscussionEligibleUser[]>([]);
  const [directUser, setDirectUser] = useState<DiscussionEligibleUser[]>([]);
  const [picker, setPicker] = useState<'OPPORTUNITY' | 'RENEGOTIATION' | null>(null);

  const tiles: ScopeTileMeta[] = [
    ...BASE_TILES,
    ...(canAttachSubject
      ? [
          {
            scope: 'OPPORTUNITY' as const,
            title: 'Opportunité',
            description: "Discuter d'une négo en cours",
            icon: Handshake,
          },
        ]
      : []),
    ...(canAttachReneg
      ? [
          {
            scope: 'RENEGOTIATION' as const,
            title: 'Renégociation',
            description: "Discuter d'une renégo",
            icon: RefreshCcw,
          },
        ]
      : []),
  ];

  const backendScope: GroupDiscussionScope =
    visualScope === 'OPPORTUNITY' || visualScope === 'RENEGOTIATION' ? 'FREE' : visualScope;

  const canValidateScope =
    title.trim().length > 0 &&
    (visualScope === 'CATEGORY'
      ? !!categoryType
      : visualScope === 'BRAND'
        ? brand.trim().length > 0
        : visualScope === 'PRODUCT_SET'
          ? products.length > 0
          : visualScope === 'OPPORTUNITY' || visualScope === 'RENEGOTIATION'
            ? !!initialCard
            : true);

  const scopeSummary =
    visualScope === 'CATEGORY'
      ? `Service ${categoryTypeLabel(categoryType)}`
      : visualScope === 'BRAND'
        ? `Marque ${brand || '—'}`
        : visualScope === 'PRODUCT_SET'
          ? `${products.length} produit${products.length > 1 ? 's' : ''}`
          : visualScope === 'OPPORTUNITY'
            ? `Opportunité — ${initialCard?.label ?? '—'}`
            : visualScope === 'RENEGOTIATION'
              ? `Renégociation — ${initialCard?.label ?? '—'}`
              : 'Discussion libre';

  /** Ferme la feuille puis ouvre le fil : il ne doit pas s'empiler au-dessus de la feuille. */
  const openCreated = (conversationId: string) => {
    void queryClient.invalidateQueries({ queryKey: TEAM_LIST_KEY });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    openFromMenu(() => openTeamThread(conversationId));
  };

  const create = useMutation({
    mutationFn: () => {
      const payload: CreateConversationPayload = {
        title: title.trim(),
        scope: backendScope,
        categoryType: backendScope === 'CATEGORY' ? categoryType : null,
        brand: backendScope === 'BRAND' ? brand.trim() : null,
        productReferences: backendScope === 'PRODUCT_SET' ? products.map((p) => p.reference) : [],
        invitedUserIds: invited.map((u) => u.id),
        initialAttachment: initialCard ? { type: initialCard.type, uuid: initialCard.uuid } : null,
      };
      return discussionsApi.create(payload);
    },
    onSuccess: (conversation) => {
      toast.success('Discussion créée.');
      openCreated(conversation.id);
    },
    onError: (error) => toast.error(errorMessage(error, 'Erreur lors de la création.')),
  });

  const openDirect = useMutation({
    mutationFn: (userId: string) => discussionsApi.openDirect(userId),
    onSuccess: (conversation) => openCreated(conversation.id),
    onError: (error) => toast.error(errorMessage(error, "Impossible d'ouvrir la conversation.")),
  });

  const chooseScope = (scope: VisualScope) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setVisualScope(scope);
    setInitialCard(null);
    // Comme le web : choisir « Opportunité » ou « Renégociation » ouvre aussitôt le sélecteur.
    if (scope === 'OPPORTUNITY' || scope === 'RENEGOTIATION') setPicker(scope);
  };

  const onMembersStep = mode === 'group' && step === 'members';

  const footer =
    mode === 'direct' ? (
      <Button
        label="Ouvrir la conversation"
        disabled={directUser.length === 0}
        loading={openDirect.isPending}
        onPress={() => {
          const target = directUser[0];
          if (target) openDirect.mutate(target.id);
        }}
      />
    ) : step === 'scope' ? (
      <Button label="Suivant" disabled={!canValidateScope} onPress={() => setStep('members')} />
    ) : (
      <Button
        label="Créer la discussion"
        loading={create.isPending}
        onPress={() => create.mutate()}
      />
    );

  return (
    <SheetScreen
      title="Nouvelle discussion"
      closeLabel="Annuler"
      leading={
        onMembersStep
          ? { label: 'Retour', onPress: () => setStep('scope'), disabled: create.isPending }
          : undefined
      }
      footer={footer}
    >
      {!onMembersStep ? (
        <SegmentedControl
          segments={MODES}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setStep('scope');
          }}
        />
      ) : null}

      {mode === 'direct' ? (
        <View style={styles.section}>
          <Text style={styles.help}>
            Choisissez la personne avec qui échanger. Si une conversation existe déjà avec elle,
            elle s&apos;ouvre telle quelle.
          </Text>
          <UserPicker selected={directUser} onChange={setDirectUser} single />
        </View>
      ) : step === 'scope' ? (
        <>
          <View style={styles.section}>
            <Text style={styles.help}>Choisissez le sujet de cette discussion.</Text>
            <View style={styles.tiles}>
              {tiles.map((tile) => (
                <ScopeTile
                  key={tile.scope}
                  meta={tile}
                  active={visualScope === tile.scope}
                  onPress={() => chooseScope(tile.scope)}
                />
              ))}
            </View>
          </View>

          {visualScope === 'OPPORTUNITY' || visualScope === 'RENEGOTIATION' ? (
            <View style={styles.section}>
              <Text style={styles.label}>
                {visualScope === 'OPPORTUNITY'
                  ? 'Opportunité sélectionnée'
                  : 'Renégociation sélectionnée'}
              </Text>
              <Pressable
                onPress={() => setPicker(visualScope === 'OPPORTUNITY' ? 'OPPORTUNITY' : 'RENEGOTIATION')}
                accessibilityRole="button"
                accessibilityLabel={
                  initialCard
                    ? `${initialCard.label}. Changer`
                    : visualScope === 'OPPORTUNITY'
                      ? 'Sélectionner une opportunité'
                      : 'Sélectionner une renégociation'
                }
                style={[styles.cardChoice, !initialCard && styles.cardChoiceEmpty]}
              >
                <Text
                  style={[styles.cardChoiceText, !initialCard && { color: t.textMuted }]}
                  numberOfLines={2}
                >
                  {initialCard
                    ? initialCard.label
                    : visualScope === 'OPPORTUNITY'
                      ? 'Sélectionner une opportunité…'
                      : 'Sélectionner une renégociation…'}
                </Text>
                {initialCard ? <Text style={styles.cardChoiceAction}>Changer</Text> : null}
              </Pressable>
            </View>
          ) : null}

          <TextField
            label="Titre de la discussion"
            value={title}
            onChangeText={setTitle}
            placeholder={TITLE_PLACEHOLDERS[visualScope]}
            maxLength={200}
            returnKeyType="done"
          />

          {visualScope === 'CATEGORY' ? (
            <View style={styles.section}>
              <Text style={styles.label}>Service</Text>
              <View style={styles.chips}>
                {CATEGORY_TYPE_VALUES.map((value) => (
                  <Chip
                    key={value}
                    label={categoryTypeLabel(value)}
                    active={categoryType === value}
                    onPress={() => setCategoryType(value)}
                  />
                ))}
              </View>
            </View>
          ) : visualScope === 'BRAND' ? (
            <View style={styles.section}>
              <Text style={styles.label}>Marque</Text>
              <BrandPicker value={brand} onChange={setBrand} />
            </View>
          ) : visualScope === 'PRODUCT_SET' ? (
            <View style={styles.section}>
              <Text style={styles.label}>
                Produits ({products.length} sélectionné{products.length > 1 ? 's' : ''})
              </Text>
              <ProductPicker selected={products} onChange={setProducts} />
            </View>
          ) : null}
        </>
      ) : (
        <>
          <Card>
            <Text style={styles.summaryLabel}>Sujet</Text>
            <Text style={styles.summaryTitle}>{title.trim()}</Text>
            <Text style={styles.summaryScope}>{scopeSummary}</Text>
          </Card>
          <View style={styles.section}>
            <Text style={styles.label}>
              Inviter des membres ({invited.length} sélectionné{invited.length > 1 ? 's' : ''})
            </Text>
            <UserPicker selected={invited} onChange={setInvited} />
            <Text style={styles.help}>Vous pourrez inviter d&apos;autres personnes plus tard.</Text>
          </View>
        </>
      )}

      <OpportunityPickerSheet
        visible={picker === 'OPPORTUNITY'}
        onClose={() => setPicker(null)}
        remainingSlots={1}
        single
        onConfirm={(items) => {
          const opportunity = items[0];
          if (opportunity) {
            setInitialCard({
              type: 'OPPORTUNITY',
              uuid: opportunity.uuid,
              label: opportunity.designation ?? opportunity.ean ?? opportunity.uuid,
            });
          }
        }}
      />
      <RenegotiationPickerSheet
        visible={picker === 'RENEGOTIATION'}
        onClose={() => setPicker(null)}
        remainingSlots={1}
        single
        onConfirm={(items) => {
          const renegotiation = items[0];
          if (renegotiation) {
            setInitialCard({
              type: 'RENEGOTIATION',
              uuid: renegotiation.uuid,
              label: renegotiation.designation ?? renegotiation.reference ?? renegotiation.uuid,
            });
          }
        }}
      />
    </SheetScreen>
  );
}

type ScopeTileProps = {
  meta: ScopeTileMeta;
  active: boolean;
  onPress: () => void;
};

/** Tuile de choix du sujet (icône, titre, description). */
function ScopeTile({ meta, active, onPress }: ScopeTileProps) {
  const styles = useStyles();
  const t = useTheme();
  const Icon = meta.icon;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`${meta.title}. ${meta.description}`}
      style={[styles.tile, active && styles.tileActive]}
    >
      <View style={[styles.tileIcon, active && { backgroundColor: t.accent }]}>
        <Icon size={16} color={active ? t.onAccent : t.textMuted} />
      </View>
      <Text style={styles.tileTitle}>{meta.title}</Text>
      <Text style={styles.tileDescription}>{meta.description}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: spacing.md },
  help: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: t.textMuted,
  },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48.5%',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  tileActive: { borderColor: t.accent, backgroundColor: withAlpha(t.accent, 0.08) },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surfaceStrong,
  },
  tileTitle: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  tileDescription: { fontSize: 11, color: t.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cardChoice: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  cardChoiceEmpty: { borderStyle: 'dashed', borderColor: withAlpha(t.accent, 0.6) },
  cardChoiceText: { flex: 1, fontSize: fontSize.sm, color: t.text },
  cardChoiceAction: { fontSize: fontSize.xs, fontWeight: '700', color: t.accentText },
  summaryLabel: { fontSize: 11, color: t.textMuted },
  summaryTitle: { marginTop: 2, fontSize: fontSize.base, fontWeight: '700', color: t.text },
  summaryScope: { marginTop: spacing.xs, fontSize: fontSize.xs, color: t.textMuted },
}));
