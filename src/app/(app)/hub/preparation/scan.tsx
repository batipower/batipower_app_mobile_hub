import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  CircleAlert,
  CircleCheck,
  Printer,
  RotateCcw,
  ScanBarcode,
  X,
  Zap,
  ZapOff,
} from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubPreparation } from '@/auth/permissions';
import { Button } from '@/components/ui';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import {
  usePreparationOrders,
  PREPARATION_ORDERS_KEY,
} from '@/features/preparation/hooks/usePreparationOrders';
import { useScanPrintQueue, type ScanJob } from '@/features/preparation/hooks/useScanPrintQueue';
import { colors, fontSize, radius, spacing } from '@/theme';

/**
 * Scan caméra de la préparation : chaque code-barres de référence commande lu envoie
 * aussitôt l'étiquette à l'impression, la caméra reste ouverte pour enchaîner les colis.
 */
export default function PreparationScanScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return canAccessHubPreparation(user.role) ? <ScanContent /> : <AccessDenied />;
}

function ScanContent() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);

  const { orders } = usePreparationOrders('all', '');
  const { jobs, sentCount, onScan, reprint } = useScanPrintQueue(orders);

  // À la fermeture, la liste « À préparer » est rafraîchie : les commandes traitées en sortent.
  useEffect(() => {
    return () => {
      void queryClient.invalidateQueries({ queryKey: PREPARATION_ORDERS_KEY });
    };
  }, [queryClient]);

  if (!permission) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.white} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ScanBarcode size={40} color={colors.white} />
        <Text style={styles.permTitle}>Accès à la caméra requis</Text>
        <Text style={styles.permText}>
          La caméra sert uniquement à lire les codes-barres des références de commande.
        </Text>
        {permission.canAskAgain ? (
          <Button label="Autoriser la caméra" onPress={() => void requestPermission()} />
        ) : (
          <Button label="Ouvrir les réglages" onPress={() => void Linking.openSettings()} />
        )}
        <Button label="Fermer" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const latest = jobs[0];

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['code128', 'code39', 'qr'] }}
        onBarcodeScanned={({ data }) => onScan(data)}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton label="Fermer le scan" onPress={() => router.back()}>
          <X size={24} color={colors.white} />
        </IconButton>
        <View style={styles.counter} accessibilityLiveRegion="polite">
          <Printer size={16} color={colors.white} />
          <Text style={styles.counterText}>
            {sentCount} étiquette{sentCount > 1 ? 's' : ''} envoyée{sentCount > 1 ? 's' : ''}
          </Text>
        </View>
        <IconButton
          label={torch ? 'Éteindre la lampe' : 'Allumer la lampe'}
          onPress={() => setTorch((value) => !value)}
        >
          {torch ? (
            <Zap size={22} color={colors.green} />
          ) : (
            <ZapOff size={22} color={colors.white} />
          )}
        </IconButton>
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Cadrez le code-barres de la commande</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        {latest ? <ResultBanner job={latest} /> : null}
        {jobs.slice(1).map((job) => (
          <HistoryRow key={job.id} job={job} onReprint={reprint} />
        ))}
        {latest?.canReprint ? (
          <Pressable
            style={styles.reprint}
            accessibilityRole="button"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              reprint(latest.reference);
            }}
          >
            <RotateCcw size={16} color={colors.white} />
            <Text style={styles.reprintText}>
              {latest.status === 'error' ? 'Réessayer' : 'Réimprimer'} {latest.reference}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={styles.iconButton}
    >
      {children}
    </Pressable>
  );
}

function statusColor(status: ScanJob['status']): string {
  if (status === 'success') return '#16A34A';
  if (status === 'error') return '#DC2626';
  return '#1D4ED8';
}

function ResultBanner({ job }: { job: ScanJob }) {
  return (
    <View
      style={[styles.banner, { backgroundColor: statusColor(job.status) }]}
      accessibilityLiveRegion="polite"
    >
      {job.status === 'processing' ? (
        <ActivityIndicator color={colors.white} />
      ) : job.status === 'success' ? (
        <CircleCheck size={28} color={colors.white} />
      ) : (
        <CircleAlert size={28} color={colors.white} />
      )}
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle} numberOfLines={2}>
          {job.message}
        </Text>
        {job.detail ? (
          <Text style={styles.bannerDetail} numberOfLines={2}>
            {job.detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function HistoryRow({ job, onReprint }: { job: ScanJob; onReprint: (reference: string) => void }) {
  return (
    <View style={styles.historyRow}>
      <View style={[styles.dot, { backgroundColor: statusColor(job.status) }]} />
      <Text style={styles.historyText} numberOfLines={1}>
        {job.message}
      </Text>
      {job.canReprint ? (
        <Pressable
          onPress={() => onReprint(job.reference)}
          accessibilityRole="button"
          accessibilityLabel={`Réimprimer ${job.reference}`}
          hitSlop={8}
        >
          <RotateCcw size={16} color={colors.white} />
        </Pressable>
      ) : null}
    </View>
  );
}

const OVERLAY = 'rgba(0,0,0,0.55)';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  permTitle: { color: colors.white, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center' },
  permText: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.base, textAlign: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: OVERLAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: OVERLAY,
  },
  counterText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
  frameWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  frame: {
    width: '82%',
    height: 150,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  hint: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: OVERLAY,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { color: colors.white, fontSize: fontSize.lg, fontWeight: '800' },
  bannerDetail: { color: 'rgba(255,255,255,0.9)', fontSize: fontSize.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: OVERLAY,
  },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  historyText: { flex: 1, color: colors.white, fontSize: fontSize.sm },
  reprint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: OVERLAY,
  },
  reprintText: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700' },
});
