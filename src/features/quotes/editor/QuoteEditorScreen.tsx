import { useLayoutEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  FileText,
  GitBranch,
  History,
  Lock,
  Mail,
  Plus,
  Send,
  ShoppingCart,
  Sparkles,
  Undo2,
  UserPlus,
} from 'lucide-react-native';
import { toast } from 'sonner-native';

import { archiveQuote } from '@/api/hubCustomerQuotes';
import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCustomerQuotes } from '@/auth/permissions';
import { Badge, Button, DetailSection } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { ErrorBanner, ListSkeleton, errorMessage } from '@/features/preparation/components/ListState';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { QuotesBackButton } from '../components/QuotesBackButton';
import { AmountRow, NavRow, QuoteTextArea } from '../components/QuoteFields';
import { quoteStatusMeta } from '../pipeline';
import { formatWeight } from '../lib/quote-math';
import { QuoteLineCard } from './components/QuoteLineCard';
import { canStartRevision, openEditorSheet, openLineSheet, quoteCustomerEmail, quoteCustomerName } from './helpers';
import { useQuoteEditor } from './QuoteEditorProvider';
import { useQuotePdfPreview } from './useQuotePdfPreview';

/** Éditeur de devis (SUPERADMIN) : client, lignes, transport, remise, notes, totaux et actions de statut. */
export function QuoteEditorScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubCustomerQuotes(user.role) ? (
    <Editor />
  ) : (
    <AccessDenied title="Accès réservé" text="Les devis clients sont réservés aux comptes Super Admin." />
  );
}

function Editor() {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const editor = useQuoteEditor();
  const { state, derived, patch, saveQuote, reload, markQuoteStatus } = editor;
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { preview, generating } = useQuotePdfPreview();

  // Garde-fou de sortie : toute modification en attente est enregistrée avant de quitter ; si
  // l'enregistrement est impossible (devis incomplet, réseau), l'utilisateur choisit.
  const disableRef = useRef<() => void>(() => undefined);
  const disablePrevention = usePreventRemove(state.dirty && !derived.readOnly, ({ repeat }) => {
    void (async () => {
      const saved = await saveQuote();
      if (saved) {
        disableRef.current();
        repeat();
        return;
      }
      Alert.alert(
        'Modifications non enregistrées',
        "Le devis n'a pas pu être enregistré. Quitter maintenant fera perdre les dernières modifications.",
        [
          { text: "Continuer l'édition", style: 'cancel' },
          {
            text: 'Quitter sans enregistrer',
            style: 'destructive',
            onPress: () => {
              disableRef.current();
              repeat();
            },
          },
        ],
      );
    })();
  });
  useLayoutEffect(() => {
    disableRef.current = disablePrevention;
  });

  const status = state.quoteStatus;
  const meta = quoteStatusMeta(status);
  const isDraft = status === 'BROUILLON';
  const editable = !derived.readOnly;
  const name = quoteCustomerName(state);
  const email = quoteCustomerEmail(state);
  const isNew = !state.quoteId;
  const hasUnresolved = state.lines.some(
    (l) => (l.lineType ?? 'product') === 'product' && !l.prestashopProductId && l.reference.trim() !== '',
  );
  const nextVersion = Math.max(state.currentRevision, 1) + 1;
  const currentVersion = Math.max(state.currentRevision, 1);

  const glsKeys = useMemo(
    () => new Set(derived.glsOutOfScopeLines.map((l) => l.key)),
    [derived.glsOutOfScopeLines],
  );
  const productLines = state.lines.filter((l) => (l.lineType ?? 'product') === 'product');

  const lineWarning = (key: string, price: number, type?: string) => {
    if ((type ?? 'product') !== 'product') return undefined;
    if (price <= 0) return 'Prix à 0 €';
    if (glsKeys.has(key)) return 'Hors périmètre GLS';
    return undefined;
  };

  // ─── Actions ───────────────────────────────────────────────────────────────

  const canSendNow = isDraft || state.revisionDraftOpen;
  const confirmMarkSent = () =>
    Alert.alert(
      'Marquer comme envoyé ?',
      "Le devis passe au statut « Envoyé » sans e-mail ni PDF envoyé par l'application (par exemple si vous l'avez transmis vous-même).",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Marquer envoyé', onPress: () => void markQuoteStatus('ENVOYE') },
      ],
    );

  const confirmAccept = () =>
    Alert.alert(
      'Marquer comme accepté ?',
      'Le client a accepté ce devis. Vous pourrez ensuite le convertir en commande PrestaShop.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Accepté', onPress: () => void markQuoteStatus('ACCEPTE') },
      ],
    );

  const confirmRevertSent = () =>
    Alert.alert(
      'Repasser en « Envoyé » ?',
      "Le devis redevient en attente de validation : l'acceptation actuelle est annulée. Aucune commande n'est créée ni supprimée.",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Repasser en envoyé', onPress: () => void markQuoteStatus('ENVOYE') },
      ],
    );

  const confirmRevertDraft = () =>
    Alert.alert('Repasser en brouillon ?', 'Le devis redevient modifiable.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Repasser en brouillon', onPress: () => void markQuoteStatus('BROUILLON') },
    ]);

  const confirmArchive = () =>
    Alert.alert('Archiver ce devis ?', 'Il sera déplacé dans le segment « Archivés » du pipeline.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Archiver',
        style: 'destructive',
        onPress: () => {
          if (!state.quoteId) return;
          patch({ busy: true });
          archiveQuote(state.quoteId)
            .then(() => {
              patch({ dirty: false });
              toast.success('Devis archivé.');
              router.back();
            })
            .catch((e) => toast.error(errorMessage(e, "Impossible d'archiver")))
            .finally(() => patch({ busy: false }));
        },
      },
    ]);

  const confirmCancelRevision = () =>
    Alert.alert(
      `Abandonner la version ${nextVersion} ?`,
      `Le contenu revient à la version ${currentVersion} publiée.`,
      [
        { text: 'Continuer', style: 'cancel' },
        { text: 'Abandonner', style: 'destructive', onPress: () => void editor.cancelRevision() },
      ],
    );

  const openClient = () => openEditorSheet('client', routeId);

  const convertDisabledReason =
    state.clientMode !== 'prestashop' || !state.selectedCustomer
      ? 'Rattachez un client PrestaShop avant de convertir.'
      : state.revisionDraftOpen
        ? 'Une version est en préparation : envoyez-la ou abandonnez-la avant de convertir.'
        : hasUnresolved
          ? 'Certaines lignes ne sont pas liées à un produit PrestaShop.'
          : null;

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
      <QuotesBackButton />
      <View style={styles.headerText}>
        <Text style={styles.title} numberOfLines={1}>
          {state.quoteReference ?? 'Nouveau devis'}
        </Text>
        <Text style={styles.saveState} numberOfLines={1}>
          {state.busy
            ? 'Enregistrement…'
            : state.dirty
              ? 'Modifications non enregistrées'
              : state.savedAt
                ? 'Enregistré'
                : name || ' '}
        </Text>
      </View>
      {!isNew ? <Badge label={meta.label} tone={meta.tone} /> : null}
    </View>
  );

  if (state.isInitialLoading) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.pad}>
          <ListSkeleton rows={4} height={110} />
        </View>
      </View>
    );
  }

  if (state.loadError && !state.quoteId) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.pad}>
          <ErrorBanner error={state.loadError} fallback="Impossible de charger le devis" onRetry={() => void reload()} />
        </View>
      </View>
    );
  }

  const footerBusy = state.busy || generating;
  const primary = (() => {
    if (isNew) {
      return (
        <Button
          label="Créer le devis"
          loading={state.busy}
          onPress={() => void saveQuote()}
          style={styles.footerPrimary}
        />
      );
    }
    if (canSendNow) {
      return (
        <>
          <Button
            variant="outline"
            label={derived.pricingActive ? 'IA' : 'Proposition IA'}
            leadingIcon={<Sparkles size={16} color={t.accentText} />}
            disabled={footerBusy || !editable}
            onPress={() => openEditorSheet('ia', routeId)}
            style={styles.footerSecondary}
          />
          <Button
            label={state.revisionDraftOpen ? `Envoyer v${nextVersion}` : 'Envoyer'}
            leadingIcon={<Send size={16} color={t.onAccent} />}
            disabled={footerBusy}
            onPress={() => openEditorSheet('envoyer', routeId)}
            style={styles.footerPrimary}
          />
        </>
      );
    }
    if (status === 'ENVOYE') {
      return (
        <Button
          label="Marquer comme accepté"
          leadingIcon={<CheckCircle2 size={16} color={t.onAccent} />}
          disabled={footerBusy || !derived.pricingActive || state.revisionDraftOpen}
          onPress={confirmAccept}
          style={styles.footerPrimary}
        />
      );
    }
    if (status === 'ACCEPTE') {
      return (
        <Button
          label="Convertir en commande"
          leadingIcon={<ShoppingCart size={16} color={t.onAccent} />}
          disabled={footerBusy || !!convertDisabledReason}
          onPress={() => openEditorSheet('commande', routeId)}
          style={styles.footerPrimary}
        />
      );
    }
    return null;
  })();

  return (
    <View style={styles.root}>
      {header}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: spacing['3xl'] }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {state.loadError ? (
          <ErrorBanner error={state.loadError} fallback="Impossible de recharger le devis" onRetry={() => void reload()} />
        ) : null}

        {state.revisionDraftOpen ? (
          <View style={[styles.banner, { backgroundColor: withAlpha(t.info, 0.12) }]}>
            <GitBranch size={16} color={t.info} />
            <View style={styles.bannerBody}>
              <Text style={[styles.bannerTitle, { color: t.info }]}>
                Version {nextVersion} en préparation
              </Text>
              <Text style={styles.bannerText}>
                Le client voit toujours la version {currentVersion}.
                {status === 'ACCEPTE' ? ' Une fois envoyée, il devra la valider à nouveau.' : ''}
              </Text>
              <Button variant="outline" label="Abandonner cette version" onPress={confirmCancelRevision} destructive />
            </View>
          </View>
        ) : derived.readOnly && !isNew ? (
          <View style={[styles.banner, { backgroundColor: withAlpha(t.warning, 0.12) }]}>
            <Lock size={16} color={t.warning} />
            <View style={styles.bannerBody}>
              <Text style={[styles.bannerTitle, { color: t.warning }]}>Devis en lecture seule</Text>
              <Text style={styles.bannerText}>
                {state.revisionsEnforced
                  ? `Version ${currentVersion} publiée.`
                  : `Statut « ${meta.label} ».`}
                {state.prestashopOrderId
                  ? ' Une commande est liée : le devis ne peut plus être modifié.'
                  : canStartRevision(state)
                    ? ' Pour le modifier, créez la version suivante.'
                    : ''}
              </Text>
              {canStartRevision(state) ? (
                <Button
                  label={`Créer la version ${nextVersion}`}
                  leadingIcon={<GitBranch size={16} color={t.onAccent} />}
                  onPress={() => openEditorSheet('version', routeId)}
                />
              ) : status === 'ENVOYE' && !state.revisionsEnforced ? (
                <Button variant="outline" label="Repasser en brouillon" onPress={confirmRevertDraft} />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Client */}
        <DetailSection title="Client">
          <NavRow
            label={state.clientMode === 'prestashop' ? 'Client PrestaShop' : 'Prospect'}
            value={name ? `${name}${email && name !== email ? `\n${email}` : ''}` : 'Choisir un client'}
            hint={state.quoteAddressDisplay ?? undefined}
            onPress={openClient}
            disabled={!editable && !isNew}
          />
          {state.customerMissingPs ? (
            <Text style={styles.warnText}>Ce client n’existe plus sur PrestaShop.</Text>
          ) : null}
          {state.clientMode === 'prospect' && state.quoteId && email && editable ? (
            <Button
              variant="outline"
              label="Créer le client PrestaShop"
              leadingIcon={<UserPlus size={16} color={t.accentText} />}
              loading={state.busy}
              onPress={() =>
                Alert.alert(
                  'Créer le client sur PrestaShop ?',
                  'Un compte est créé avec les informations du prospect et rattaché à ce devis.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Créer', onPress: () => void editor.createPsCustomer() },
                  ],
                )
              }
            />
          ) : null}
        </DetailSection>

        {/* Lignes */}
        <DetailSection
          title={`Lignes (${productLines.length})`}
          trailing={
            editable ? (
              <Text style={styles.link} onPress={() => openEditorSheet('produit', routeId)}>
                Ajouter
              </Text>
            ) : undefined
          }
        >
          {state.lines.length === 0 ? (
            <Text style={styles.empty}>Aucune ligne : ajoutez un produit par nom ou par référence.</Text>
          ) : (
            state.lines.map((line, index) => (
              <View key={line.key} style={index > 0 ? styles.lineSeparator : undefined}>
                <QuoteLineCard
                  line={line}
                  onPress={(key) => openLineSheet(routeId, key)}
                  warning={lineWarning(line.key, line.unitPriceHT, line.lineType)}
                />
              </View>
            ))
          )}
          {editable ? (
            <Button
              variant="outline"
              label="Ajouter un produit"
              leadingIcon={<Plus size={16} color={t.accentText} />}
              onPress={() => openEditorSheet('produit', routeId)}
            />
          ) : null}
          {derived.missingCatalogLines.length > 0 ? (
            <Text style={styles.warnText}>
              {derived.missingCatalogLines.length} ligne(s) sans prix catalogue : vérifiez les prix avant l’envoi.
            </Text>
          ) : null}
        </DetailSection>

        {/* Transport + remise */}
        <DetailSection title="Transport et remise">
          <NavRow
            label="Transport"
            value={
              state.shippingFeeOffered
                ? 'Offert au client'
                : state.shippingFeeHT > 0
                  ? `${formatEuro(state.shippingFeeHT)} HT`
                  : 'Aucun frais de port'
            }
            hint={`${state.nbColis} colis · ${
              derived.weightSummary.totalWeightGrams > 0
                ? formatWeight(derived.weightSummary.totalWeightGrams)
                : 'poids inconnu'
            }${state.transportChecked ? ' · ✓ confirmé' : isDraft ? ' · à confirmer' : ''}`}
            onPress={() => openEditorSheet('transport', routeId)}
          />
          <NavRow
            label="Remise globale"
            value={
              state.globalDiscountValue > 0
                ? `${state.globalDiscountLabel ? `${state.globalDiscountLabel} · ` : ''}${
                    state.globalDiscountType === 'PERCENT'
                      ? `${state.globalDiscountValue} %`
                      : `${formatEuro(state.globalDiscountValue)} HT`
                  }`
                : 'Aucune'
            }
            onPress={() => openEditorSheet('remise', routeId)}
            disabled={!editable}
          />
        </DetailSection>

        {/* Notes */}
        <DetailSection title="Notes">
          <QuoteTextArea
            label="Message au client (visible sur le devis)"
            value={state.customerNotes}
            onChangeText={(v) => patch({ customerNotes: v })}
            editable={editable}
            placeholder="Conditions, délais, précisions…"
          />
          <QuoteTextArea
            label="Note interne (jamais envoyée)"
            value={state.internalNotes}
            onChangeText={(v) => patch({ internalNotes: v })}
            editable={editable}
            placeholder="Contexte, négociation, rappel…"
          />
        </DetailSection>

        {/* Totaux */}
        <DetailSection title="Récapitulatif">
          <AmountRow label="Sous-total HT" value={formatEuro(derived.totals.subtotalHT)} />
          {derived.totals.promoAmount > 0 ? (
            <AmountRow label="Remise globale" value={`− ${formatEuro(derived.totals.promoAmount)}`} tone="success" />
          ) : null}
          <AmountRow
            label="Transport HT"
            value={state.shippingFeeOffered ? 'Offert' : formatEuro(derived.totals.shippingBilledHT)}
          />
          <AmountRow label="Total HT" value={formatEuro(derived.totals.totalHT)} />
          <AmountRow label="TVA" value={formatEuro(derived.totals.totalTVA)} tone="muted" />
          <AmountRow label="Total TTC" value={formatEuro(derived.totals.totalTTC)} strong />
          {state.persistedTotals?.totalMarginHT != null ? (
            <View style={styles.margin}>
              <AmountRow
                label="Marge brute"
                value={`${formatEuro(state.persistedTotals.totalMarginHT)}${
                  state.persistedTotals.totalMarginPct != null
                    ? ` · ${state.persistedTotals.totalMarginPct.toFixed(1)} %`
                    : ''
                }`}
                tone={state.persistedTotals.totalMarginHT < 0 ? 'danger' : 'success'}
              />
            </View>
          ) : null}
        </DetailSection>

        {/* Alertes d'envoi */}
        {isDraft && !isNew && derived.sendBlockers.length > 0 ? (
          <View style={[styles.banner, { backgroundColor: withAlpha(t.warning, 0.12) }]}>
            <AlertTriangle size={16} color={t.warning} />
            <View style={styles.bannerBody}>
              <Text style={[styles.bannerTitle, { color: t.warning }]}>Avant d’envoyer</Text>
              {derived.sendBlockers.map((b) => (
                <Text key={b} style={styles.bannerText}>
                  • {b}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* Autres actions */}
        {!isNew ? (
          <DetailSection title="Autres actions">
            <NavRow
              label="Aperçu du PDF"
              hint="Génère le PDF du devis et l'ouvre pour le consulter ou le partager."
              icon={generating ? <ActivityIndicator size="small" color={t.accentText} /> : <FileText size={18} color={t.accentText} />}
              onPress={() => void preview()}
              disabled={footerBusy}
            />
            <NavRow
              label="Historique des envois"
              icon={<History size={18} color={t.accentText} />}
              onPress={() => openEditorSheet('emails', routeId)}
            />
            {isDraft && derived.sendBlockers.length === 0 ? (
              <NavRow
                label="Marquer comme envoyé (sans e-mail)"
                icon={<Mail size={18} color={t.accentText} />}
                onPress={confirmMarkSent}
                disabled={footerBusy}
              />
            ) : null}
            {status === 'ENVOYE' && !state.revisionsEnforced ? (
              <NavRow
                label="Repasser en brouillon"
                icon={<Undo2 size={18} color={t.accentText} />}
                onPress={confirmRevertDraft}
                disabled={footerBusy}
              />
            ) : null}
            {status === 'ACCEPTE' ? (
              <NavRow
                label="Repasser en envoyé"
                icon={<Undo2 size={18} color={t.accentText} />}
                onPress={confirmRevertSent}
                disabled={footerBusy}
              />
            ) : null}
            {canStartRevision(state) ? (
              <NavRow
                label={`Créer la version ${nextVersion}`}
                icon={<GitBranch size={18} color={t.accentText} />}
                onPress={() => openEditorSheet('version', routeId)}
              />
            ) : null}
            {status === 'ACCEPTE' && convertDisabledReason ? (
              <Text style={styles.warnText}>{convertDisabledReason}</Text>
            ) : null}
            {['BROUILLON', 'ENVOYE', 'ACCEPTE'].includes(status) ? (
              <NavRow
                label="Refuser (avec motif par e-mail)"
                icon={<Ban size={18} color={t.danger} />}
                onPress={() => openEditorSheet('refus', routeId)}
                disabled={footerBusy}
              />
            ) : null}
            {['BROUILLON', 'ENVOYE', 'ACCEPTE'].includes(status) ? (
              <NavRow
                label="Archiver (sans e-mail)"
                icon={<Archive size={18} color={t.danger} />}
                onPress={confirmArchive}
                disabled={footerBusy}
              />
            ) : null}
            {['ENVOYE', 'ACCEPTE', 'CONVERTED'].includes(status) ? (
              <NavRow
                label="Annuler le devis"
                icon={<Ban size={18} color={t.danger} />}
                onPress={() => openEditorSheet('annuler', routeId)}
                disabled={footerBusy}
              />
            ) : null}
          </DetailSection>
        ) : null}
      </ScrollView>

      {primary || !isNew ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerLabel}>Total TTC</Text>
            <Text style={styles.footerAmount}>{formatEuro(derived.totals.totalTTC)}</Text>
          </View>
          <View style={styles.footerActions}>{primary}</View>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, gap: 1 },
  title: { fontSize: fontSize.base, fontWeight: '800', color: t.text },
  saveState: { fontSize: fontSize.xs, color: t.textMuted },
  pad: { padding: spacing.lg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  bannerBody: { flex: 1, gap: spacing.sm },
  bannerTitle: { fontSize: fontSize.sm, fontWeight: '700' },
  bannerText: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  warnText: { fontSize: fontSize.xs, color: t.warning, fontWeight: '600' },
  link: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  empty: { fontSize: fontSize.sm, color: t.textMuted, paddingVertical: spacing.sm },
  lineSeparator: { borderTopWidth: 1, borderTopColor: t.border },
  margin: { borderTopWidth: 1, borderTopColor: t.border, paddingTop: spacing.md },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.bgElevated,
  },
  footerTotal: { gap: 1 },
  footerLabel: { fontSize: 10, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  footerAmount: { fontSize: fontSize.base, fontWeight: '800', color: t.text },
  footerActions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  footerPrimary: { flex: 1 },
  footerSecondary: { flexShrink: 0 },
}));
