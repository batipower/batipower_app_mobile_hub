import { Pressable, Text, View } from 'react-native';
import { Activity, Gauge, Printer, Radar, ShoppingCart } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canViewHubAnalysesLive, canViewHubQuotas } from '@/auth/permissions';
import { useAnalysesLive } from '@/features/analysesLive/hooks/useAnalysesLive';
import { openAnalysesEnCours } from '@/features/analysesLive/navigation';
import { posteHealth } from '@/features/analysesLive/liveFormat';
import { useQuotasSummary } from '@/features/quotas/hooks/useQuotasSummary';
import { openQuotas } from '@/features/quotas/navigation';
import { openPrintSupervision } from '@/features/printSupervision/navigation';
import { formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { formatMonthLabel } from '../dates';
import {
  useOrdersMonthTrend,
  usePrintServers,
  useScrapingAgents,
  useScrapingFleetTarget,
} from '../hooks/useCockpitData';
import {
  formatScrapingFleetDetail,
  openScrapingFleet,
  scrapingFleetTone,
} from '../scrapingFleet';

/** Sous ce seuil (en valeur absolue, en %), la variation des commandes est jugée stable. */
const ORDERS_FLAT_THRESHOLD = 0.5;

type Tone = 'ok' | 'warning' | 'alert' | 'unknown';

type PillProps = {
  Icon: LucideIcon;
  /** Valeur courte affichée à côté de l'icône ; « — » quand l'état est indisponible. */
  value: string;
  tone: Tone;
  accessibilityLabel: string;
  /** Rend la pastille cliquable (ex. détail par pays des scrapers). */
  onPress?: () => void;
  /** Annonce VoiceOver de l'action quand la pastille est cliquable. */
  accessibilityHint?: string;
};

function StatusPill({ Icon, value, tone, accessibilityLabel, onPress, accessibilityHint }: PillProps) {
  const styles = useStyles();
  const t = useTheme();
  const color =
    tone === 'ok'
      ? t.success
      : tone === 'warning'
        ? t.warning
        : tone === 'alert'
          ? t.danger
          : t.neutral; // hexadécimal dans les deux thèmes, contrairement aux textes translucides

  const pillStyle = [
    styles.pill,
    { borderColor: withAlpha(color, 0.35), backgroundColor: withAlpha(color, 0.1) },
  ];
  const content = (
    <>
      <Icon size={13} color={color} />
      <Text style={[styles.value, { color }]}>{value}</Text>
      <View style={[styles.dot, { backgroundColor: color }]} />
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        hitSlop={6}
        onPress={onPress}
        style={({ pressed }) => [pillStyle, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={pillStyle}>
      {content}
    </View>
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

/** « 1er–7 octobre » (ou « 1er octobre » quand la période se limite au premier jour). */
function formatComparisonPeriod(month: string, lastDay: number): string {
  const monthName = formatMonthLabel(month).split(' ')[0] ?? '';
  return `${lastDay <= 1 ? '1er' : `1er–${lastDay}`} ${monthName}`;
}

/**
 * Trois petites pastilles visuelles : scrapers en route face au nombre nécessaire (touchable :
 * ouvre le détail par pays), serveurs d'impression en ligne, et commandes du mois avec leur
 * évolution face à la même période du mois précédent. Rouge = alerte (ou baisse), vert = hausse
 * ou optimal atteint, orange = sous l'optimal, gris = état indisponible (ou variation stable).
 * Si la cible de flotte est indisponible, la pastille des scrapers n'affiche que le nombre connecté. Chaque pastille apparaît dès que ses propres données sont
 * arrivées.
 */
export function SystemStatusPills() {
  const styles = useStyles();
  const agents = useScrapingAgents();
  const fleet = useScrapingFleetTarget();
  const printers = usePrintServers();
  const orders = useOrdersMonthTrend();
  const { user } = useAuth();
  const quotasAllowed = user ? canViewHubQuotas(user.role) : false;
  const analysesAllowed = user ? canViewHubAnalysesLive(user.role) : false;
  const quotas = useQuotasSummary({ enabled: quotasAllowed });
  const analyses = useAnalysesLive({ watching: false, enabled: analysesAllowed });

  const agentsData = agents.isError || agents.data?.status === 'error' ? null : agents.data;
  const fleetData = fleet.isError || fleet.data?.status === 'error' ? null : fleet.data;
  const printersData = printers.isError || printers.data?.status === 'error' ? null : printers.data;

  // Pas de pastille grise pendant le premier chargement : on attend la réponse de chacune.
  let scraperPill: PillProps | null = null;
  if (!agents.isPending && !fleet.isPending) {
    if (fleetData) {
      const { totalRunning: running, totalOptimal: optimal } = fleetData;
      const idle = agentsData?.idleAgents ?? running;
      const detail = formatScrapingFleetDetail(fleetData.pools);
      scraperPill = {
        Icon: Radar,
        value: `${running}/${optimal}`,
        tone: scrapingFleetTone(running, optimal, idle),
        accessibilityLabel: `Scrapers : ${plural(running, 'bot')} en route sur ${optimal} nécessaire${optimal > 1 ? 's' : ''}${detail ? `, ${detail}` : ''}`,
        onPress: openScrapingFleet,
        accessibilityHint: 'Ouvre le détail par pays',
      };
    } else if (agentsData) {
      const idle = agentsData.idleAgents;
      const busy = agentsData.busyAgents;
      const running = idle + busy;
      scraperPill = {
        Icon: Radar,
        value: String(running),
        tone: scrapingFleetTone(running, null, idle),
        accessibilityLabel: `Scrapers : ${running} en route, ${plural(idle, 'disponible')}, ${plural(busy, 'actif')}`,
      };
    } else {
      scraperPill = {
        Icon: Radar,
        value: '—',
        tone: 'unknown',
        accessibilityLabel: 'Scrapers : état indisponible',
      };
    }
  }

  let printerPill: PillProps | null = null;
  if (!printers.isPending) {
    if (printersData) {
      const { total, online, problems } = printersData.summary;
      printerPill = {
        Icon: Printer,
        value: `${online}/${total}`,
        tone: problems > 0 ? 'alert' : total === 0 ? 'unknown' : 'ok',
        accessibilityLabel:
          total === 0 && problems === 0
            ? "Imprimantes : aucun serveur d'impression enregistré"
            : `Imprimantes : ${online} sur ${total} en ligne${problems > 0 ? `, ${plural(problems, 'problème')}` : ''}`,
        onPress: openPrintSupervision,
        accessibilityHint: 'Ouvre la supervision impression',
      };
    } else {
      printerPill = {
        Icon: Printer,
        value: '—',
        tone: 'unknown',
        accessibilityLabel: 'Imprimantes : état indisponible',
        onPress: openPrintSupervision,
        accessibilityHint: 'Ouvre la supervision impression',
      };
    }
  }

  let ordersPill: PillProps | null = null;
  if (!orders.loading) {
    const { current, delta, comparison } = orders;
    if (current === null) {
      ordersPill = {
        Icon: ShoppingCart,
        value: '—',
        tone: 'unknown',
        accessibilityLabel: 'Commandes du mois : indisponible',
      };
    } else if (delta === null) {
      // Mois précédent indisponible ou sans commande : pas de base de comparaison.
      ordersPill = {
        Icon: ShoppingCart,
        value: formatInteger(current),
        tone: 'unknown',
        accessibilityLabel: `Commandes du mois : ${formatInteger(current)}`,
      };
    } else {
      const flat = Math.abs(delta) < ORDERS_FLAT_THRESHOLD;
      const trend = `${!flat && delta > 0 ? '+' : ''}${formatPercent(flat ? 0 : delta, 0)}`;
      ordersPill = {
        Icon: ShoppingCart,
        value: `${formatInteger(current)} · ${trend}`,
        tone: flat ? 'unknown' : delta > 0 ? 'ok' : 'alert',
        accessibilityLabel: `Commandes du mois : ${formatInteger(current)}, ${trend} par rapport au ${formatComparisonPeriod(comparison.month, comparison.lastDay)}`,
      };
    }
  }

  let quotasPill: PillProps | null = null;
  if (quotasAllowed && !quotas.isPending) {
    const summary = quotas.isError ? null : quotas.data;
    if (summary) {
      const attention = summary.items.filter(
        (item) => item.status === 'warn' || item.status === 'critical',
      ).length;
      quotasPill = {
        Icon: Gauge,
        value: attention > 0 ? String(attention) : 'OK',
        tone:
          summary.overall === 'critical'
            ? 'alert'
            : summary.overall === 'warn'
              ? 'warning'
              : summary.overall === 'ok'
                ? 'ok'
                : 'unknown',
        accessibilityLabel:
          attention > 0
            ? `Quotas : ${plural(attention, 'quota')} à surveiller`
            : 'Quotas : tous dans les limites',
        onPress: openQuotas,
        accessibilityHint: 'Ouvre le détail des quotas',
      };
    } else {
      quotasPill = {
        Icon: Gauge,
        value: '—',
        tone: 'unknown',
        accessibilityLabel: 'Quotas : état indisponible',
        onPress: openQuotas,
      };
    }
  }

  let analysesPill: PillProps | null = null;
  if (analysesAllowed && !analyses.isPending) {
    const snapshot = analyses.isError ? null : analyses.data;
    if (snapshot) {
      // Horloge du serveur : pure, et cohérente avec les battements du snapshot.
      const now = new Date(snapshot.generatedAt).getTime();
      const busy = snapshot.postes.filter(
        (poste) =>
          poste.control === 'PAUSED' ||
          poste.enCours > 0 ||
          snapshot.analyses.some((analysis) => analysis.posteKey === poste.key),
      );
      const paused = busy.filter((poste) => poste.control === 'PAUSED').length;
      const unhealthy = busy.filter((poste) => posteHealth(poste, now) !== 'ok').length;
      analysesPill = {
        Icon: Activity,
        value: String(busy.length),
        tone: paused > 0 || unhealthy > 0 ? 'warning' : busy.length > 0 ? 'ok' : 'unknown',
        accessibilityLabel: `Analyses en cours : ${plural(busy.length, 'poste')} actif${busy.length > 1 ? 's' : ''}${paused > 0 ? `, ${plural(paused, 'poste')} en pause` : ''}${unhealthy > 0 ? `, ${plural(unhealthy, 'poste')} au signal faible` : ''}`,
        onPress: openAnalysesEnCours,
        accessibilityHint: 'Ouvre les analyses en cours',
      };
    } else {
      analysesPill = {
        Icon: Activity,
        value: '—',
        tone: 'unknown',
        accessibilityLabel: 'Analyses en cours : état indisponible',
        onPress: openAnalysesEnCours,
      };
    }
  }

  if (!scraperPill && !printerPill && !ordersPill && !quotasPill && !analysesPill) return null;

  return (
    <View style={styles.row}>
      {scraperPill ? <StatusPill {...scraperPill} /> : null}
      {printerPill ? <StatusPill {...printerPill} /> : null}
      {ordersPill ? <StatusPill {...ordersPill} /> : null}
      {quotasPill ? <StatusPill {...quotasPill} /> : null}
      {analysesPill ? <StatusPill {...analysesPill} /> : null}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    // Dans la rangée parente (`status`), permet à la rangée de rétrécir et donc de passer à la ligne.
    flexShrink: 1,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  value: { fontSize: fontSize.xs, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pressed: { opacity: 0.6 },
}));
