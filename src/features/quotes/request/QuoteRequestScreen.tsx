import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, FilePlus2, FileText, UserPlus, X } from 'lucide-react-native';
import { toast } from 'sonner-native';

import {
  checkQuoteRequestCustomers,
  convertQuoteRequestToQuote,
  createDevisCustomer,
  getQuoteRequest,
  updateQuoteRequestStatus,
} from '@/api/hubCustomerQuotes';
import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubCustomerQuotes } from '@/auth/permissions';
import { Badge, Button, DetailSection, InfoRow } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { errorMessage, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { callPhone, composeEmail } from '@/lib/contact';
import { formatDateTime } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';

import { QuotesBackButton } from '../components/QuotesBackButton';
import { openQuote, openRequestRefusal } from '../navigation';
import { requestStatusMeta } from '../pipeline';
import { QUOTES_ROOT_KEY, quoteRequestKey } from '../queryKeys';

/** Détail d'une demande de devis du site et actions de traitement (SUPERADMIN). */
export function QuoteRequestScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubCustomerQuotes(user.role) ? (
    <RequestDetail />
  ) : (
    <AccessDenied title="Accès réservé" text="Les devis clients sont réservés aux comptes Super Admin." />
  );
}

function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const request = useQuery({
    queryKey: quoteRequestKey(id),
    queryFn: () => getQuoteRequest(id),
  });
  const data = request.data;
  const customer = useQuery({
    queryKey: ['hub-customer-quotes', 'request', id, 'customer', data?.email ?? ''],
    queryFn: async () => (await checkQuoteRequestCustomers([data!.email]))[data!.email],
    enabled: !!data?.email,
  });
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([request.refetch(), customer.refetch()]);
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUOTES_ROOT_KEY });

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      toast.error(errorMessage(e, 'Action impossible'));
    } finally {
      setBusy(null);
    }
  };

  const convert = () =>
    run('convert', async () => {
      const { id: quoteId } = await convertQuoteRequestToQuote(id);
      await invalidate();
      toast.success('Demande convertie en devis.');
      openQuote(quoteId);
    });

  const createCustomer = () =>
    run('customer', async () => {
      const result = await createDevisCustomer(id);
      toast.success(`Client PrestaShop créé : ${result.firstname} ${result.lastname} (ID ${result.prestashopId})`);
      await invalidate();
    });

  const archive = () =>
    Alert.alert('Archiver la demande ?', "Elle sera rangée sans prévenir le prospect.", [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Archiver',
        style: 'destructive',
        onPress: () =>
          void run('archive', async () => {
            await updateQuoteRequestStatus(id, 'ARCHIVEE');
            await invalidate();
            toast.success('Demande archivée.');
          }),
      },
    ]);

  const status = data ? requestStatusMeta(data.status) : null;
  const closed = data ? data.status === 'ARCHIVEE' || data.status === 'REFUSEE' : false;
  const converted = data?.convertedQuote;
  const address = data
    ? [data.address1, data.address2, [data.postcode, data.city].filter(Boolean).join(' '), data.countryIso]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <>
      <Stack.Screen
        options={{
          title: data?.reference ?? 'Demande de devis',
          headerLeft: () => <QuotesBackButton />,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.accentText} />
        }
      >
        {request.isPending ? (
          <ListSkeleton rows={3} height={110} />
        ) : request.error || !data ? (
          <ErrorBanner error={request.error} fallback="Demande introuvable" onRetry={() => void onRefresh()} />
        ) : (
          <>
            <View style={styles.titleRow}>
              <View style={styles.titleText}>
                <Text style={styles.title}>{data.company || data.name || data.email}</Text>
                <Text style={styles.subtitle}>{formatDateTime(data.createdAt) ?? ''}</Text>
              </View>
              {status ? <Badge label={status.label} tone={status.tone} /> : null}
            </View>

            <DetailSection title="Contact">
              {data.name ? <InfoRow label="Nom" value={data.name} /> : null}
              {data.company ? <InfoRow label="Société" value={data.company} /> : null}
              <InfoRow
                label="E-mail"
                value={data.email}
                onPress={() => void composeEmail(data.email)}
                actionHint="Écrire"
              />
              {data.phone ? (
                <InfoRow
                  label="Téléphone"
                  value={data.phone}
                  onPress={() => void callPhone(data.phone!)}
                  actionHint="Appeler"
                />
              ) : null}
              {address ? <InfoRow label="Adresse" value={address} copyLabel="Adresse" /> : null}
              <InfoRow
                label="Compte PrestaShop"
                value={
                  customer.data?.found
                    ? `Client #${customer.data.prestashopId ?? ''}`
                    : data.prestashopCustomerId
                      ? `Client #${data.prestashopCustomerId}`
                      : customer.isPending
                        ? 'Vérification…'
                        : 'Aucun compte'
                }
              />
            </DetailSection>

            <DetailSection title={`Produits demandés (${data.products.length})`}>
              {data.products.length === 0 ? (
                <Text style={styles.muted}>Aucun produit renseigné.</Text>
              ) : (
                data.products.map((p, index) => (
                  <InfoRow
                    key={`${p.reference}-${index}`}
                    label={`${p.quantity} ×`}
                    value={p.label ? `${p.reference} · ${p.label}` : p.reference}
                    copyLabel="Référence"
                  />
                ))
              )}
            </DetailSection>

            {data.message || data.projectReference || data.desiredDelay ? (
              <DetailSection title="Projet">
                {data.projectReference ? <InfoRow label="Référence projet" value={data.projectReference} /> : null}
                {data.desiredDelay ? <InfoRow label="Délai souhaité" value={data.desiredDelay} /> : null}
                {data.message ? <Text style={styles.message} selectable>{data.message}</Text> : null}
              </DetailSection>
            ) : null}

            {data.status === 'REFUSEE' ? (
              <DetailSection title="Refus">
                <InfoRow label="Refusée le" value={formatDateTime(data.refusedAt) ?? '—'} />
                {data.refusalReason ? <Text style={styles.message}>{data.refusalReason}</Text> : null}
              </DetailSection>
            ) : null}

            <View style={styles.actions}>
              {converted ? (
                <Button
                  label={`Ouvrir le devis ${converted.quoteNumber ?? ''}`.trim()}
                  leadingIcon={<FileText size={18} color={t.onAccent} />}
                  onPress={() => openQuote(converted.id)}
                />
              ) : !closed ? (
                <Button
                  label="Créer le devis"
                  leadingIcon={<FilePlus2 size={18} color={t.onAccent} />}
                  loading={busy === 'convert'}
                  disabled={busy !== null}
                  onPress={() => void convert()}
                />
              ) : null}
              {!customer.data?.found && !data.prestashopCustomerId && !closed ? (
                <Button
                  label="Créer le client PrestaShop"
                  variant="outline"
                  leadingIcon={<UserPlus size={18} color={t.text} />}
                  loading={busy === 'customer'}
                  disabled={busy !== null}
                  onPress={() => void createCustomer()}
                />
              ) : null}
              {!closed ? (
                <>
                  <Button
                    label="Refuser avec un e-mail"
                    variant="outline"
                    destructive
                    leadingIcon={<X size={18} color={t.danger} />}
                    disabled={busy !== null}
                    onPress={() => openRequestRefusal(id)}
                  />
                  <Button
                    label="Archiver"
                    variant="ghost"
                    leadingIcon={<Archive size={18} color={t.textMuted} />}
                    loading={busy === 'archive'}
                    disabled={busy !== null}
                    onPress={archive}
                  />
                </>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleText: { flex: 1, gap: 2 },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  subtitle: { fontSize: fontSize.xs, color: t.textMuted },
  muted: { fontSize: fontSize.sm, color: t.textMuted },
  message: { fontSize: fontSize.sm, lineHeight: 21, color: t.text },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
}));
