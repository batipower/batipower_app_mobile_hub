import { Text, View } from 'react-native';
import { Printer, Radar, ShoppingCart } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { formatInteger, formatPercent } from '@/lib/format';
import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { formatMonthLabel } from '../dates';
import { useOrdersMonthTrend, usePrintServers, useScrapingAgents } from '../hooks/useCockpitData';

/** En dessous de ce nombre de scrapers en route (libres + actifs), la pastille passe en alerte. */
const SCRAPING_AGENTS_LOW_THRESHOLD = 2;

/** Sous ce seuil (en valeur absolue, en %), la variation des commandes est jugée stable. */
const ORDERS_FLAT_THRESHOLD = 0.5;

type Tone = 'ok' | 'warning' | 'alert' | 'unknown';

type PillProps = {
  Icon: LucideIcon;
  /** Valeur courte affichée à côté de l'icône ; « — » quand l'état est indisponible. */
  value: string;
  tone: Tone;
  accessibilityLabel: string;
};

function StatusPill({ Icon, value, tone, accessibilityLabel }: PillProps) {
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

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.pill,
        { borderColor: withAlpha(color, 0.35), backgroundColor: withAlpha(color, 0.1) },
      ]}
    >
      <Icon size={13} color={color} />
      <Text style={[styles.value, { color }]}>{value}</Text>
      <View style={[styles.dot, { backgroundColor: color }]} />
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
 * Trois petites pastilles visuelles (sans action) : scrapers connectés, serveurs d'impression
 * en ligne, et commandes du mois avec leur évolution face à la même période du mois précédent.
 * Rouge = alerte (ou baisse), vert = hausse, orange = aucun scraper libre, gris = état
 * indisponible (ou variation stable). Chaque pastille apparaît dès que ses propres données sont
 * arrivées.
 */
export function SystemStatusPills() {
  const styles = useStyles();
  const agents = useScrapingAgents();
  const printers = usePrintServers();
  const orders = useOrdersMonthTrend();

  const agentsData = agents.isError || agents.data?.status === 'error' ? null : agents.data;
  const printersData = printers.isError || printers.data?.status === 'error' ? null : printers.data;

  // Pas de pastille grise pendant le premier chargement : on attend la réponse de chacune.
  let scraperPill: PillProps | null = null;
  if (!agents.isPending) {
    if (agentsData) {
      const idle = agentsData.idleAgents;
      const busy = agentsData.busyAgents;
      const running = idle + busy;
      scraperPill = {
        Icon: Radar,
        value: String(running),
        tone: running < SCRAPING_AGENTS_LOW_THRESHOLD ? 'alert' : idle === 0 ? 'warning' : 'ok',
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
      };
    } else {
      printerPill = {
        Icon: Printer,
        value: '—',
        tone: 'unknown',
        accessibilityLabel: 'Imprimantes : état indisponible',
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

  if (!scraperPill && !printerPill && !ordersPill) return null;

  return (
    <View style={styles.row}>
      {scraperPill ? <StatusPill {...scraperPill} /> : null}
      {printerPill ? <StatusPill {...printerPill} /> : null}
      {ordersPill ? <StatusPill {...ordersPill} /> : null}
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
}));
