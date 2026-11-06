import { Text, View } from 'react-native';
import { Printer, Radar } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { fontSize, makeStyles, radius, spacing, useTheme, withAlpha } from '@/theme';

import { usePrintServers, useScrapingAgents } from '../hooks/useCockpitData';

/** En dessous de ce nombre de scrapers en route (libres + actifs), la pastille passe en alerte. */
const SCRAPING_AGENTS_LOW_THRESHOLD = 2;

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

/**
 * Deux petites pastilles visuelles (sans action) : scrapers connectés et serveurs d'impression
 * en ligne. Rouge = alerte, orange = aucun scraper libre, gris = état indisponible.
 */
export function SystemStatusPills() {
  const styles = useStyles();
  const agents = useScrapingAgents();
  const printers = usePrintServers();

  // Rien à afficher tant que les deux premières réponses ne sont pas arrivées.
  if (agents.isPending && printers.isPending) return null;

  const agentsData = agents.isError || agents.data?.status === 'error' ? null : agents.data;
  const printersData = printers.isError || printers.data?.status === 'error' ? null : printers.data;

  let scraperPill: PillProps;
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

  let printerPill: PillProps;
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

  return (
    <View style={styles.row}>
      <StatusPill {...scraperPill} />
      <StatusPill {...printerPill} />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
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
