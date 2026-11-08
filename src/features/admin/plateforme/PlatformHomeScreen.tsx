import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Banknote, ChevronRight, Clock, KeyRound, Wrench, type LucideIcon } from 'lucide-react-native';

import { Badge, Card } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { fontSize, makeStyles, spacing, useTheme, withAlpha } from '@/theme';

import { useApiKeyRequestsPendingCount } from '../hooks/useAdminPendingCounts';
import { todaySummary } from './supportHours';
import { useApiKeyConfigs, useBankAccounts, useMaintenanceConfig, useSupportHoursConfig } from './hooks';

type PlatformCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: { label: string; tone: BadgeTone } | null;
  loading?: boolean;
  onPress: () => void;
};

function PlatformCard({ icon: Icon, title, description, badge, loading, onPress }: PlatformCardProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card contentStyle={styles.cardContent}>
        <View style={[styles.icon, { backgroundColor: withAlpha(t.accentText, 0.12) }]}>
          <Icon size={20} color={t.accentText} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc} numberOfLines={2}>
            {loading ? 'Chargement…' : description}
          </Text>
          {badge && !loading ? <Badge label={badge.label} tone={badge.tone} /> : null}
        </View>
        <ChevronRight size={18} color={t.textSubtle} />
      </Card>
    </Pressable>
  );
}

/** Accueil Plateforme : une carte par réglage avec son état courant. */
export function PlatformHomeScreen() {
  const styles = useStyles();
  const t = useTheme();
  const maintenance = useMaintenanceConfig();
  const hours = useSupportHoursConfig();
  const banks = useBankAccounts();
  const keys = useApiKeyConfigs();
  const pending = useApiKeyRequestsPendingCount();

  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([maintenance.refetch(), hours.refetch(), banks.refetch(), keys.refetch(), pending.refetch()]);
  });

  const activeBank = banks.data?.find((b) => b.isActive);
  const pendingCount = pending.data?.total ?? 0;
  const activeKeys = keys.data?.filter((k) => k.isActive).length ?? 0;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.accentText} />}
    >
      <PlatformCard
        icon={Wrench}
        title="Mode maintenance"
        description="Bloque l'accès à l'application pour tous sauf le super admin."
        loading={maintenance.isLoading}
        badge={
          maintenance.data
            ? maintenance.data.enabled
              ? { label: 'Maintenance active', tone: 'red' }
              : { label: 'Application ouverte', tone: 'green' }
            : null
        }
        onPress={() => router.push('/admin/plateforme/maintenance')}
      />
      <PlatformCard
        icon={Clock}
        title="Horaires du support"
        description={hours.data ? todaySummary(hours.data) : 'Planning d\u2019ouverture du support client.'}
        loading={hours.isLoading}
        badge={hours.data?.forceClosed ? { label: 'Fermeture forcée', tone: 'amber' } : null}
        onPress={() => router.push('/admin/plateforme/horaires')}
      />
      <PlatformCard
        icon={Banknote}
        title="RIB des devis"
        description={activeBank ? `${activeBank.label} · ${activeBank.holder}` : 'RIB affiché sur les devis réglés par virement.'}
        loading={banks.isLoading}
        badge={banks.data && !activeBank ? { label: 'Aucun RIB actif', tone: 'red' } : null}
        onPress={() => router.push('/admin/plateforme/rib')}
      />
      <PlatformCard
        icon={KeyRound}
        title="Clés API"
        description={keys.data ? `${activeKeys} clé${activeKeys > 1 ? 's' : ''} active${activeKeys > 1 ? 's' : ''} sur ${keys.data.length}` : 'Scrapers et extension HUB.'}
        loading={keys.isLoading}
        badge={pendingCount > 0 ? { label: `${pendingCount} demande${pendingCount > 1 ? 's' : ''} en attente`, tone: 'amber' } : null}
        onPress={() => router.push('/admin/plateforme/cles-api')}
      />
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, paddingBottom: 160, gap: spacing.md },
  pressed: { opacity: 0.85 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 4, alignItems: 'flex-start' },
  title: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  desc: { fontSize: fontSize.sm, color: t.textMuted },
}));
