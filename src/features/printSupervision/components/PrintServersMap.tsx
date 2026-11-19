import { useMemo } from 'react';
import { Platform, Text, View } from 'react-native';
import { MapPinOff } from 'lucide-react-native';

import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { PrintServerItem } from '@/types/hubSupervision';

import { STATUS_META, toneColor } from '../display';

type ExpoMaps = typeof import('expo-maps');

/**
 * Charge `expo-maps` à la demande : un binaire de développement construit avant l'ajout du
 * module n'a pas le code natif, et un import statique ferait planter toute la route.
 */
function loadMaps(): ExpoMaps | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-maps') as ExpoMaps;
  } catch {
    return null;
  }
}

/** Apple Maps (via `expo-maps`) demande iOS 17 ; les rappels de toucher d'un marqueur, iOS 18. */
const iosMajor = Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) : 0;
const MAP_SUPPORTED = iosMajor >= 17;
const MARKER_TAP_SUPPORTED = iosMajor >= 18;

const FOCUS_ZOOM = 12;
const DEFAULT_CENTER = { latitude: 46.6, longitude: 2.4 };

type Located = PrintServerItem & { location: NonNullable<PrintServerItem['location']> };

/** Centre et zoom (échelle Google, 0 à 20) qui englobent tous les postes avec une adresse. */
function fitCamera(servers: Located[]) {
  if (servers.length === 0) return { coordinates: DEFAULT_CENTER, zoom: 5 };
  const lats = servers.map((s) => s.location.latitude);
  const lngs = servers.map((s) => s.location.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  // Marge de 60 % autour des points ; un poste isolé reprend le zoom de focalisation.
  const zoom = span < 0.01 ? FOCUS_ZOOM : Math.min(FOCUS_ZOOM, Math.max(3, Math.log2(360 / (span * 1.6))));
  return {
    coordinates: { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2 },
    zoom,
  };
}

type Props = {
  servers: PrintServerItem[];
  /** Poste déplié dans la liste : la caméra se recentre sur lui. */
  expandedId: string | null;
  /** Toucher un marqueur (iOS 18+) : déplie le poste dans la liste. */
  onSelectServer: (serverId: string) => void;
};

/**
 * Carte des postes d'impression : un marqueur par poste qui a une adresse, teinté selon son
 * statut. Sous iOS 17, ou si le module natif est absent du binaire, un encart remplace la carte.
 */
export function PrintServersMap({ servers, expandedId, onSelectServer }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const located = useMemo(
    () => servers.filter((server): server is Located => !!server.location),
    [servers],
  );
  const maps = useMemo(() => (MAP_SUPPORTED ? loadMaps() : null), []);

  // Signature des positions : la caméra ne bouge pas quand seule la santé d'un poste change.
  const positionsKey = located
    .map((s) => `${s.serverId}:${s.location.latitude},${s.location.longitude}`)
    .join('|');
  const camera = useMemo(() => {
    const focused = expandedId ? located.find((s) => s.serverId === expandedId) : undefined;
    if (focused) {
      return {
        coordinates: { latitude: focused.location.latitude, longitude: focused.location.longitude },
        zoom: FOCUS_ZOOM,
      };
    }
    return fitCamera(located);
    // `located` n'est pertinent que par ses positions (voir `positionsKey`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsKey, expandedId]);

  if (!maps) {
    return (
      <View style={styles.placeholder}>
        <MapPinOff size={20} color={t.textMuted} />
        <Text style={styles.placeholderText}>
          {MAP_SUPPORTED
            ? 'Carte indisponible dans cette version de l’app.'
            : 'La carte demande iOS 17 ou plus récent.'}
        </Text>
      </View>
    );
  }

  const markers = located.map((server) => ({
    id: server.serverId,
    coordinates: {
      latitude: server.location.latitude,
      longitude: server.location.longitude,
    },
    title: `${server.warehouse} · ${STATUS_META[server.status].label}`,
    systemImage: 'printer.fill',
    tintColor: toneColor(t, STATUS_META[server.status].tone),
  }));

  const { AppleMaps } = maps;

  return (
    <View style={styles.wrap}>
      <AppleMaps.View
        style={styles.map}
        colorScheme={
          t.scheme === 'dark' ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT
        }
        cameraPosition={camera}
        markers={markers}
        uiSettings={{ compassEnabled: true, scaleBarEnabled: false }}
        onMarkerClick={
          MARKER_TAP_SUPPORTED
            ? (marker) => {
                if (marker.id) onSelectServer(marker.id);
              }
            : undefined
        }
      />
      {located.length === 0 ? (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.placeholderText}>Aucun poste n’a encore d’adresse.</Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    height: 260,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
    backgroundColor: t.card,
  },
  map: { flex: 1 },
  overlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: t.card,
    alignItems: 'center',
  },
  placeholder: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.borderStrong,
    backgroundColor: t.card,
  },
  placeholderText: { fontSize: fontSize.xs, color: t.textMuted, textAlign: 'center' },
}));
