import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { PackageX } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPricing } from '@/auth/permissions';
import { Badge, DetailSection, Divider, InfoRow } from '@/components/ui';
import { MarginToggle } from '@/features/cockpit/components/CockpitPrimitives';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { MARKETPLACE_LABELS } from '@/features/pricing/options';
import { formatDate, formatDateTime, formatEuro, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, spacing, useTheme } from '@/theme';
import type {
  HubDeployment,
  HubDeploymentNegotiation,
} from '@/types/hubDeployment';
import type { HubPricingRow } from '@/types/hubPricing';

import {
  DEPLOYMENT_CHANNELS,
  DEPLOYMENT_CHANNEL_LABELS,
  channelMargin,
  type DeployedPrices,
  type DeploymentChannelKey,
} from './channels';
import { useDeployment } from './useDeployment';

const HIDDEN_MARGIN = '•••• €';

const NEGOTIATION_STATUS_LABELS: Record<string, string> = {
  WON: 'Acceptée',
  AWAITING_LAUNCH: 'Acceptée, lancement en attente',
  PRE_LAUNCH: 'Pré-lancement',
  LAUNCHED: 'Lancée',
  REFUSED: 'Refusée',
  ABANDONED: 'Abandonnée',
  OPEN: 'Ouverte',
  IN_NEGOTIATION: 'En négociation',
  STANDBY: 'En pause',
};

function numberParam(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw != null ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Page « Déploiement » d'un produit, réservée au SUPERADMIN : marges par canal et négociation. */
export function DeploymentScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubPricing(user.role) ? (
    <Deployment />
  ) : (
    <AccessDenied
      title="Accès réservé"
      text="La page Déploiement est réservée aux comptes Super Admin."
    />
  );
}

function Deployment() {
  const styles = useStyles();
  const t = useTheme();
  const params = useLocalSearchParams<{
    reference: string;
    amazon?: string;
    manoMano?: string;
    leroyMerlin?: string;
  }>();
  const { reference } = params;
  const { data, loading, error, notFound, refetch } = useDeployment(reference);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const pushedPrices: DeployedPrices = {
    amazon: numberParam(params.amazon),
    manoMano: numberParam(params.manoMano),
    leroyMerlin: numberParam(params.leroyMerlin),
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Déploiement' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={t.accentText}
          />
        }
      >
        {loading ? <ListSkeleton rows={3} height={150} /> : null}
        {error && !data && !notFound ? (
          <ErrorBanner
            error={error}
            fallback="Impossible de charger le déploiement"
            onRetry={() => void onRefresh()}
          />
        ) : null}
        {notFound ? (
          <EmptyState
            icon={<PackageX size={24} color={t.textMuted} />}
            title="Produit introuvable"
            text="Cette référence n'est pas (ou plus) dans le catalogue."
          />
        ) : null}
        {data ? <DeploymentBody data={data} pushedPrices={pushedPrices} /> : null}
      </ScrollView>
    </>
  );
}

function DeploymentBody({
  data,
  pushedPrices,
}: {
  data: HubDeployment;
  pushedPrices: DeployedPrices;
}) {
  const styles = useStyles();
  const { pricingRow: row, deployment, negotiations } = data;
  // Les marges restent masquées par défaut (écran regardé par un tiers), comme dans le Cockpit.
  const [showMargin, setShowMargin] = useState(false);

  return (
    <>
      <DetailSection title="Produit">
        <Text style={styles.reference}>{row.reference}</Text>
        <Text style={styles.designation}>{row.designation?.trim() || 'Sans désignation'}</Text>
        {row.brand ? <Text style={styles.brand}>{row.brand}</Text> : null}
        <Divider />
        <InfoRow label="Prix d'achat HT" value={formatEuro(row.fixPriceHT)} />
        <InfoRow label="Lancé le" value={formatDateTime(deployment.launchedAt) ?? '—'} />
        <InfoRow
          label="Premier déploiement"
          value={
            deployment.firstDeployedAt
              ? `${formatDateTime(deployment.firstDeployedAt)}${deployment.firstDeployedMarketplace ? ` · ${deployment.firstDeployedMarketplace}` : ''}`
              : '—'
          }
        />
        <InfoRow label="Mis en ligne sur le site" value={formatDateTime(deployment.websiteDeployedAt) ?? '—'} />
      </DetailSection>

      <DetailSection
        title="Marge par canal"
        trailing={<MarginToggle visible={showMargin} onToggle={() => setShowMargin((v) => !v)} />}
      >
        {DEPLOYMENT_CHANNELS.map((channel, index) => (
          <ChannelBlock
            key={channel}
            channel={channel}
            row={row}
            data={data}
            pushedPrices={pushedPrices}
            showMargin={showMargin}
            first={index === 0}
          />
        ))}
      </DetailSection>

      <DetailSection title={`Négociation${negotiations.length > 1 ? ` · ${negotiations.length} lignes` : ''}`}>
        {negotiations.length === 0 ? (
          <Text style={styles.muted}>Aucune négociation liée à ce produit.</Text>
        ) : (
          negotiations.map((negotiation, index) => (
            <NegotiationBlock key={negotiation.opportunityUuid} negotiation={negotiation} first={index === 0} />
          ))
        )}
      </DetailSection>
    </>
  );
}

function channelStatus(
  channel: DeploymentChannelKey,
  row: HubPricingRow,
  data: HubDeployment,
): { label: string; tone: 'green' | 'amber' | 'neutral' } {
  if (channel === 'site') {
    return row.websiteActive
      ? { label: 'En ligne', tone: 'green' }
      : { label: 'Hors site', tone: 'amber' };
  }
  const info = data.deployment.channels[channel];
  if (info.sku) return { label: 'En ligne', tone: 'green' };
  if (info.creationRequested) return { label: 'Création demandée', tone: 'amber' };
  return { label: 'Non déployé', tone: 'neutral' };
}

function ChannelBlock({
  channel,
  row,
  data,
  pushedPrices,
  showMargin,
  first,
}: {
  channel: DeploymentChannelKey;
  row: HubPricingRow;
  data: HubDeployment;
  pushedPrices: DeployedPrices;
  showMargin: boolean;
  first: boolean;
}) {
  const styles = useStyles();
  const { priceTTC, priceIsActual, margin } = channelMargin(row, channel, pushedPrices);
  const status = channelStatus(channel, row, data);
  const mp = channel === 'site' ? null : row.marketplaces[channel];

  return (
    <View style={styles.channel}>
      {!first ? <Divider /> : null}
      <View style={styles.channelHeader}>
        <Text style={styles.channelName}>
          {channel === 'site' ? DEPLOYMENT_CHANNEL_LABELS.site : MARKETPLACE_LABELS[channel].label}
        </Text>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <InfoRow
        label={channel === 'site' ? 'Prix site TTC' : priceIsActual ? 'Prix de mise en ligne TTC' : 'Prix de mise en ligne TTC (estimé)'}
        value={formatEuro(priceTTC)}
      />
      <InfoRow
        label="Marge"
        value={
          !margin
            ? '—'
            : showMargin
              ? `${formatEuro(margin.marginEur)} (${formatPercent(margin.marginPercent)})`
              : HIDDEN_MARGIN
        }
      />
      {mp ? (
        <>
          <InfoRow label="Prix d'équilibre HT" value={formatEuro(mp.equilibriumPrice)} />
          {mp.rentabilityRate != null ? (
            <InfoRow label="Commission" value={formatPercent(mp.rentabilityRate)} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function NegotiationBlock({
  negotiation,
  first,
}: {
  negotiation: HubDeploymentNegotiation;
  first: boolean;
}) {
  const styles = useStyles();
  const origin = [negotiation.distributorName, negotiation.subsidiaryName]
    .filter((v, i, all): v is string => !!v && all.indexOf(v) === i)
    .join(' · ');
  const proposedBy = [negotiation.proposedByName, formatDate(negotiation.proposedAt)]
    .filter(Boolean)
    .join(' · ');
  const gap =
    negotiation.gapHT != null
      ? `${negotiation.gapHT > 0 ? '+' : ''}${formatEuro(negotiation.gapHT)}${negotiation.gapPercent != null ? ` (${negotiation.gapPercent > 0 ? '+' : ''}${formatPercent(negotiation.gapPercent)})` : ''}`
      : '—';

  return (
    <View style={styles.channel}>
      {!first ? <Divider /> : null}
      <View style={styles.channelHeader}>
        <Text style={styles.channelName}>{origin || 'Distributeur'}</Text>
        <Badge
          label={NEGOTIATION_STATUS_LABELS[negotiation.status] ?? negotiation.status}
          tone={negotiation.status === 'REFUSED' || negotiation.status === 'ABANDONED' ? 'red' : 'green'}
        />
      </View>
      <InfoRow label="Prix attendu HT" value={formatEuro(negotiation.requestedPriceHT)} />
      <InfoRow label="Prix proposé HT" value={formatEuro(negotiation.proposedPriceHT)} />
      <InfoRow label="Proposé par" value={proposedBy || '—'} />
      <InfoRow label="Prix obtenu HT" value={formatEuro(negotiation.obtainedPriceHT)} />
      <InfoRow label="Écart proposé / attendu" value={gap} />
      {negotiation.attachedOnly ? (
        <Text style={styles.muted}>
          Rattachement seul : le produit n&apos;a pas été redéployé pour cette ligne.
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing['2xl'], paddingBottom: spacing['4xl'] },
  reference: {
    fontFamily: monoFontFamily,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: t.text,
  },
  designation: { fontSize: fontSize.sm, color: t.text },
  brand: { fontSize: fontSize.xs, fontWeight: '600', color: t.textMuted },
  muted: { fontSize: fontSize.sm, color: t.textSubtle },
  channel: { gap: spacing.md },
  channelHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  channelName: { fontSize: fontSize.base, fontWeight: '700', color: t.text, flexShrink: 1 },
}));
