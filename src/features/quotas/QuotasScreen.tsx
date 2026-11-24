import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Gauge } from 'lucide-react-native';

import type { QuotaGroup, QuotaItem, QuotaStatus } from '@/api/hubQuotas';
import { useAuth } from '@/auth/AuthProvider';
import { canViewHubQuotas } from '@/auth/permissions';
import { Card } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatDateTime, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, typography, useTheme, withAlpha } from '@/theme';

import { useQuotasSummary } from './hooks/useQuotasSummary';

const GROUPS: { id: QuotaGroup; title: string }[] = [
  { id: 'email', title: 'Emails' },
  { id: 'api', title: 'API & scraping' },
];

const STATUS_LABEL: Record<QuotaStatus, string> = {
  ok: 'OK',
  warn: 'À surveiller',
  critical: 'Critique',
  unknown: 'Inconnu',
};

/** Couleur d'un statut de quota (thème clair et sombre). */
export function useQuotaColor() {
  const t = useTheme();
  return (status: QuotaStatus) =>
    ({ ok: t.success, warn: t.warning, critical: t.danger, unknown: t.neutral })[status];
}

/** « reset le 03/12 » ; null sans date de remise à zéro valide. */
function formatReset(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `reset le ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
}

function amount(item: QuotaItem): string | null {
  if (item.used === null && item.limit === null) return null;
  const used = item.used === null ? '—' : formatInteger(item.used);
  return item.limit === null ? used : `${used} / ${formatInteger(item.limit)}`;
}

function QuotaRow({ item }: { item: QuotaItem }) {
  const styles = useStyles();
  const colorOf = useQuotaColor();
  const color = colorOf(item.status);
  const value = amount(item);
  const reset = formatReset(item.resetAt);
  const percent = item.percent === null ? null : Math.min(Math.max(item.percent, 0), 100);

  return (
    <View
      accessible
      accessibilityLabel={`${item.label} : ${STATUS_LABEL[item.status]}${item.percent !== null ? `, ${item.percent} %` : ''}${value ? `, ${value}` : ''}`}
      style={styles.quota}
    >
      <View style={styles.quotaHeader}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.quotaLabel} numberOfLines={2}>
          {item.label}
        </Text>
        {item.percent !== null ? (
          <Text style={[styles.percent, { color }]}>{item.percent} %</Text>
        ) : (
          <Text style={[styles.percent, { color }]}>{STATUS_LABEL[item.status]}</Text>
        )}
      </View>
      {percent !== null ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%`, backgroundColor: color }]} />
        </View>
      ) : null}
      {value || reset ? (
        <Text style={styles.meta}>{[value, reset].filter(Boolean).join(' · ')}</Text>
      ) : null}
      {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
    </View>
  );
}

/** Quotas surveillés du HUB (SUPERADMIN) : emails, API et scraping, avec leur niveau de consommation. */
export function QuotasScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canViewHubQuotas(user.role) ? (
    <Quotas />
  ) : (
    <AccessDenied title="Accès réservé" text="Les quotas sont réservés au compte Super Admin." />
  );
}

function Quotas() {
  const styles = useStyles();
  const t = useTheme();
  const query = useQuotasSummary();
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);
  const data = query.data;

  return (
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
      {query.isError ? (
        <ErrorBanner
          error={query.error}
          fallback="Impossible de charger les quotas"
          onRetry={() => void onRefresh()}
        />
      ) : null}

      {query.isPending ? <ListSkeleton rows={4} height={90} /> : null}

      {data ? (
        <>
          <Text style={styles.intro}>
            {`Actualisation automatique toutes les 5 minutes${formatDateTime(data.generatedAt) ? ` · relevé du ${formatDateTime(data.generatedAt)}` : ''}.`}
          </Text>
          {data.items.length === 0 ? (
            <EmptyState icon={<Gauge size={24} color={t.textMuted} />} title="Aucun quota suivi" />
          ) : (
            GROUPS.map((group) => {
              const items = data.items.filter((item) => item.group === group.id);
              if (items.length === 0) return null;
              return (
                <View key={group.id} style={styles.section}>
                  <Text style={styles.sectionTitle} accessibilityRole="header">
                    {group.title}
                  </Text>
                  <Card contentStyle={styles.card}>
                    {items.map((item) => (
                      <QuotaRow key={item.key} item={item} />
                    ))}
                  </Card>
                </View>
              );
            })
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  intro: { fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: t.textSubtle, paddingHorizontal: spacing.xs },
  card: { padding: spacing.lg, gap: spacing.xl },
  quota: { gap: spacing.xs },
  quotaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  quotaLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  percent: { fontSize: fontSize.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: withAlpha(t.neutral, 0.2),
  },
  fill: { height: '100%', borderRadius: radius.full },
  meta: { fontSize: fontSize.xs, color: t.textMuted, fontVariant: ['tabular-nums'] },
  detail: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
}));
