import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ExternalLink,
  Handshake,
  Layers,
  MoreHorizontal,
  Plus,
  Rocket,
  Tag,
  Truck,
 PackageSearch } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatDateTime, formatEuro } from '@/lib/format';
import { openWebPage } from '@/lib/openWeb';
import { fontSize, hitTarget, makeStyles, monoFontFamily, radius, spacing, useTheme, withAlpha } from '@/theme';

import { StatusBadge } from '../components/StatusBadge';
import { AnalysisBanner } from '../components/AnalysisBanner';
import { MarketplacesSection, NegoRequestsSection, ProductSections, SuppliersSection } from '../components/fiche/CommerceSections';
import { SalesSection, StockSection, SynthesisSection, ViabilitySection } from '../components/fiche/AnalysisSections';
import {
  confirmDialog,
  ficheLaunchState,
  launchSingle,
  toggleFlag,
} from '../ficheActions';
import { useMarketplaceViability, useStagingDetail, useStagingNegoRequests } from '../hooks/useStagingDetail';
import { negoScopeOf, useNegoInfo } from '../hooks/useNegoInfo';
import { getViab, plannedDepDistributorIds, resolveCatalogueRef } from '../lib/helpers';
import { snapshotOf, str } from '../lib/snapshot';
import { openPaAffaire, openPaEdit, openPaNego, openPaPicker } from '../navigation';
import { PA_ROOT, paViabilityKey } from '../queryKeys';

/**
 * Fiche d'un produit analysé : identité et état en tête, sections de résultats repliables,
 * barre d'actions fixe en bas (lancer, négocier, menu « … »). Lecture seule pour les produits
 * déjà au catalogue (ligne de trace).
 */
export function FicheScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { uuid, opportunityUuid } = useLocalSearchParams<{ uuid: string; opportunityUuid?: string }>();

  const detail = useStagingDetail(uuid);
  const item = detail.data;
  const requests = useStagingNegoRequests(uuid);
  const nego = useNegoInfo(uuid ? [uuid] : [], negoScopeOf({ affaire: false, affaireId: '', distributorId: '' }));
  const mpViability = useMarketplaceViability(uuid, !!item);
  const [acting, setActing] = useState<'launch' | 'deploy' | null>(null);

  const refetchAll = useCallback(async () => {
    await Promise.all([detail.refetch(), requests.refetch(), mpViability.refetch()]);
  }, [detail, requests, mpViability]);
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  const openMenu = useCallback(() => {
    if (uuid) openPaPicker('item-actions', { uuid });
  }, [uuid]);

  const menuButton = (
    <Pressable
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Autres actions"
      onPress={openMenu}
      style={styles.headerButton}
    >
      <MoreHorizontal size={22} color={t.accentText} />
    </Pressable>
  );

  if (!uuid) return null;

  if (!item) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Fiche produit' }} />
        {detail.error ? (
          <View style={styles.padded}>
            <ErrorBanner error={detail.error} fallback="Impossible de charger la fiche" onRetry={() => void detail.refetch()} />
            <EmptyState
              icon={<PackageSearch size={28} color={t.textFaint} />}
              title="Fiche introuvable"
              text="Le produit a peut-être été supprimé."
            />
          </View>
        ) : (
          <View style={styles.padded}>
            <ListSkeleton rows={4} height={110} />
          </View>
        )}
      </View>
    );
  }

  const snapshot = snapshotOf(item);
  const locked = !!item.forcedFromCatalogue;
  const editable = !locked;
  const launched = item.status === 'LAUNCHED';
  const primary = ficheLaunchState(item);
  const designation = str(snapshot.eb?.designation) ?? item.designation ?? item.codeEbat ?? item.ean ?? 'Produit';
  const viab = item.marginPercent != null || item.viabilityStatus ? getViab(item.marginPercent, item.viabilityStatus) : null;
  const catalogueRef = resolveCatalogueRef(item);
  const openNego = nego.open[uuid] ?? null;
  const canNegotiate = editable && !launched && item.status !== 'EBAT_NOT_FOUND';
  const plannedDeps = plannedDepDistributorIds(item);
  const depNames = (item.distributorOffers ?? []).filter((o) => o.plannedDep).map((o) => o.distributor?.name ?? o.warehouse ?? 'DEP');
  const affaires = item.affaireLinks ?? [];

  const doLaunch = async (mode: 'launch' | 'deploy') => {
    const ok = await confirmDialog(
      mode === 'launch' ? 'Lancer ce produit ?' : 'Lancer et déployer ?',
      mode === 'launch'
        ? `${designation}\n\nLa fiche catalogue sera créée (ou liée si elle existe déjà).`
        : `${designation}\n\nLa fiche est créée puis les offres France sont déployées sur les marketplaces.`,
      mode === 'launch' ? 'Lancer' : 'Lancer + déployer',
    );
    if (!ok) return;
    setActing(mode);
    await launchSingle(item, mode, opportunityUuid);
    setActing(null);
  };

  const onPrimary = () => {
    switch (primary.kind) {
      case 'launch':
        return void doLaunch('launch');
      case 'link-deploy':
        return void doLaunch('deploy');
      case 'create-from-analysis':
        return openPaEdit('launch-from-staging', { uuid, ...(opportunityUuid ? { opportunityUuid } : {}) });
      case 'attach-ean':
        return openPaEdit('ean', { uuid, mode: 'attach' });
      case 'marketplaces':
        return openPaEdit('marketplaces', { uuid });
      default:
        return undefined;
    }
  };

  const primaryLabel =
    primary.kind === 'launch'
      ? 'Lancer'
      : primary.kind === 'link-deploy'
        ? 'Lier + déployer FR'
        : primary.kind === 'create-from-analysis'
          ? "Créer depuis l'analyse"
          : primary.kind === 'attach-ean'
            ? 'Attacher un EAN'
            : primary.kind === 'marketplaces'
              ? 'Marketplaces'
              : null;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Fiche produit', headerRight: () => menuButton }} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + 96 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.accentText} />}
        showsVerticalScrollIndicator={false}
      >
        {detail.error ? (
          <ErrorBanner error={detail.error} fallback="Actualisation impossible" onRetry={() => void detail.refetch()} />
        ) : null}
        <AnalysisBannerSlot />

        <View style={[styles.hero, !item.ean && !str(snapshot.eb?.ean) && { borderLeftColor: t.danger }]}>
          <Text style={styles.designation} numberOfLines={3} selectable>
            {designation}
          </Text>
          <View style={styles.chips}>
            <StatusBadge status={item.status} />
            {viab ? (
              <View style={[styles.pill, { backgroundColor: withAlpha(viab.color, 0.14), borderColor: withAlpha(viab.color, 0.4) }]}>
                <Text style={[styles.pillText, { color: viab.color }]}>
                  {viab.label}
                  {item.marginPercent != null ? ` · ${item.marginPercent.toFixed(1)} %` : ''}
                </Text>
              </View>
            ) : null}
            {item.sourceMode === 'EAN_DIRECT' ? <Tiny label="EAN direct" color="#7C3AED" /> : null}
            {item.batipowerId ? <Tiny label={`ID ${item.batipowerId}`} color={t.success} /> : null}
            {item.tooFragile ? <Tiny label="Fragile" color={t.danger} /> : null}
            {item.tooVoluminous ? <Tiny label="Volumineux" color={t.danger} /> : null}
          </View>
          <Text style={styles.meta}>
            {[item.codeEbat, item.warehouse, item.ean ? `EAN ${item.ean}` : null].filter(Boolean).join(' · ') || '—'}
          </Text>
          <Text style={styles.metaFaint}>
            Analysé le {formatDateTime(item.lastAnalyzedAt ?? item.createdAt) ?? '—'}
            {openNego ? ` · négo ouverte ${formatEuro(openNego.requestedMinPriceHT)}` : ''}
          </Text>

          <View style={styles.chips}>
            {affaires.map((link) => (
              <Pressable
                key={link.uuid}
                accessibilityRole="button"
                accessibilityLabel={`Affaire ${link.affaireName}`}
                onPress={() => openPaAffaire(link.affaireId)}
                style={[styles.linkChip, { borderColor: withAlpha(link.warehouse === 'FLEVY' ? t.info : t.purple, 0.5) }]}
              >
                <Layers size={12} color={link.warehouse === 'FLEVY' ? t.info : t.purple} />
                <Text style={styles.linkChipText} numberOfLines={1}>
                  {link.affaireName}
                </Text>
              </Pressable>
            ))}
            {editable && !launched ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajouter à une affaire"
                onPress={() => openPaEdit('affaire', { uuid })}
                style={[styles.linkChip, styles.addChip]}
              >
                <Plus size={12} color={t.accentText} />
                <Text style={[styles.linkChipText, { color: t.accentText }]}>Affaire</Text>
              </Pressable>
            ) : null}
            {depNames.length > 0 || (editable && !launched) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="DEP planifiée"
                disabled={!editable || launched}
                onPress={() => openPaEdit('dep', { uuid })}
                style={[styles.linkChip, plannedDeps.length === 0 && styles.addChip]}
              >
                <Truck size={12} color={plannedDeps.length > 0 ? '#6366F1' : t.accentText} />
                <Text style={[styles.linkChipText, plannedDeps.length === 0 && { color: t.accentText }]} numberOfLines={1}>
                  {plannedDeps.length > 0 ? `DEP ${depNames.join(', ')}` : 'DEP'}
                </Text>
              </Pressable>
            ) : null}
            {(item.tags ?? []).map((tag) => (
              <View key={tag} style={styles.linkChip}>
                <Tag size={11} color={t.textMuted} />
                <Text style={styles.linkChipText}>{tag}</Text>
              </View>
            ))}
            {editable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Modifier les tags"
                onPress={() => openPaPicker('edit-tags', { uuid })}
                style={[styles.linkChip, styles.addChip]}
              >
                <Plus size={12} color={t.accentText} />
                <Text style={[styles.linkChipText, { color: t.accentText }]}>Tag</Text>
              </Pressable>
            ) : null}
          </View>

          {editable && !launched ? (
            <View style={styles.flags}>
              <FlagToggle label="Fragile" active={item.tooFragile} onPress={() => void toggleFlag(item, 'tooFragile')} />
              <FlagToggle
                label="Volumineux"
                active={item.tooVoluminous}
                onPress={() => void toggleFlag(item, 'tooVoluminous')}
              />
            </View>
          ) : null}
        </View>

        {locked ? (
          <Banner tone={t.danger}>
            <Text style={[styles.bannerText, { color: t.danger }]}>
              <Text style={{ fontWeight: '800' }}>Ligne de trace</Text> — produit déjà au catalogue
              {catalogueRef ? ` (réf. ${catalogueRef})` : ''}. Aucun lancement, déploiement ni modification n’est possible.
            </Text>
          </Banner>
        ) : item.inCatalogue && !launched ? (
          <Banner tone={t.info}>
            <Text style={[styles.bannerText, { color: t.info }]}>
              Ce produit est <Text style={{ fontWeight: '800' }}>déjà au catalogue</Text>
              {catalogueRef ? ` sous la référence ${catalogueRef}` : ''} — aucune création ne sera faite.
            </Text>
          </Banner>
        ) : null}

        {!snapshot.hasSnapshot && item.status !== 'EBAT_NOT_FOUND' ? (
          <Banner tone={t.textMuted}>
            <Text style={[styles.bannerText, { color: t.textMuted }]}>
              Détail de l’analyse en cours de chargement… Tirez pour actualiser.
            </Text>
          </Banner>
        ) : null}
        {item.status === 'EBAT_NOT_FOUND' ? (
          <Banner tone={t.warning}>
            <Text style={[styles.bannerText, { color: t.warning }]}>
              Référence introuvable dans EbatPro. Attachez un EAN pour relancer l’analyse sans EbatPro.
            </Text>
          </Banner>
        ) : null}

        <SynthesisSection item={item} />
        <ViabilitySection item={item} />
        <SuppliersSection item={item} editable={editable} />
        <NegoRequestsSection uuid={uuid} requests={requests.data} editable={editable && !launched} />
        <MarketplacesSection
          item={item}
          viability={mpViability.data}
          loading={mpViability.isFetching}
          onRefresh={() => {
            void queryClient.invalidateQueries({ queryKey: paViabilityKey(uuid) });
            void queryClient.invalidateQueries({ queryKey: [...PA_ROOT, 'nego-requests'] });
          }}
        />
        <SalesSection item={item} />
        <StockSection item={item} />
        <ProductSections item={item} editable={editable} />

        {(launched || locked) && catalogueRef ? (
          <Button
            label="Ouvrir la fiche catalogue sur le web"
            variant="outline"
            leadingIcon={<ExternalLink size={16} color={t.text} />}
            onPress={() => void openWebPage(`/hub/produits/${encodeURIComponent(catalogueRef)}`)}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {primary.kind === 'none' && primary.reason ? (
          <Text style={styles.barNote}>{primary.reason}</Text>
        ) : null}
        <View style={styles.barRow}>
          {canNegotiate ? (
            <Button
              label={openNego ? 'Négo en cours' : 'Négocier'}
              variant="outline"
              leadingIcon={<Handshake size={16} color={t.text} />}
              onPress={() => openPaNego('item', uuid)}
              style={styles.barButton}
            />
          ) : null}
          {primaryLabel ? (
            <Button
              label={primaryLabel}
              leadingIcon={primary.kind === 'launch' ? <Rocket size={16} color={t.onAccent} /> : undefined}
              loading={acting !== null}
              onPress={onPrimary}
              style={styles.barButton}
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Autres actions"
            onPress={openMenu}
            style={({ pressed }) => [styles.moreButton, pressed && { backgroundColor: t.cardPressed }]}
          >
            <MoreHorizontal size={22} color={t.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Bandeau d'analyse en cours, recalé sur la marge de la fiche (le bandeau porte déjà sa propre marge). */
function AnalysisBannerSlot() {
  return (
    <View style={{ marginHorizontal: -spacing.xl }}>
      <AnalysisBanner />
    </View>
  );
}

function Tiny({ label, color }: { label: string; color: string }) {
  const styles = useStyles();
  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.4) }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function Banner({ tone, children }: { tone: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={[styles.banner, { borderColor: withAlpha(tone, 0.4), backgroundColor: withAlpha(tone, 0.08) }]}>
      {children}
    </View>
  );
}

function FlagToggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.flag, active && { backgroundColor: withAlpha(t.danger, 0.14), borderColor: t.danger }]}
    >
      <Text style={[styles.flagText, active && { color: t.danger }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.bg },
  padded: { padding: spacing.xl, gap: spacing.lg },
  content: { gap: spacing.md, padding: spacing.lg },
  headerButton: { padding: spacing.xs },
  hero: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: t.border,
    borderLeftColor: t.accent,
    backgroundColor: t.card,
  },
  designation: { fontSize: fontSize.lg, fontWeight: '800', color: t.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '800' },
  meta: { fontFamily: monoFontFamily, fontSize: 12, color: t.textMuted },
  metaFaint: { fontSize: 11, color: t.textSubtle },
  linkChip: {
    maxWidth: '100%',
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  addChip: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  linkChipText: { flexShrink: 1, fontSize: 11, fontWeight: '700', color: t.textMuted },
  flags: { flexDirection: 'row', gap: spacing.sm },
  flag: {
    minHeight: 36,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  flagText: { fontSize: fontSize.xs, fontWeight: '800', color: t.textMuted },
  banner: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  bannerText: { fontSize: fontSize.xs, lineHeight: 17 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.bg,
  },
  barNote: { fontSize: fontSize.xs, fontWeight: '700', color: t.warning, textAlign: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barButton: { flex: 1 },
  moreButton: {
    width: hitTarget + 4,
    height: hitTarget + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
  },
}));
