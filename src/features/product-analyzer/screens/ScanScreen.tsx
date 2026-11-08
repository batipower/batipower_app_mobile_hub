import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ScanBarcode, X, Zap, ZapOff } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { colors, fontSize, radius, spacing } from '@/theme';

import { patchLauncherDraft } from '../launcherStore';

/** EAN-8, UPC-A (12), EAN-13 ou GTIN-14 : uniquement des chiffres. */
const EAN_PATTERN = /^\d{8}$|^\d{12,14}$/;

/**
 * Scan d'un code-barres produit : le premier EAN valide lu est transmis à la feuille « Analyser »
 * puis l'écran se ferme (un scan, une analyse : pas d'enchaînement comme en préparation).
 */
export function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const handled = useRef(false);

  const onScan = (data: string) => {
    const code = data.trim();
    if (handled.current || !EAN_PATTERN.test(code)) return;
    handled.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    patchLauncherDraft({ scannedEan: code });
    router.back();
  };

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
          La caméra sert uniquement à lire le code-barres (EAN) du produit à analyser.
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

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => onScan(data)}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fermer le scan"
          hitSlop={8}
          style={styles.iconButton}
        >
          <X size={24} color={colors.white} />
        </Pressable>
        <Pressable
          onPress={() => setTorch((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Éteindre la lampe' : 'Allumer la lampe'}
          hitSlop={8}
          style={styles.iconButton}
        >
          {torch ? <Zap size={22} color={colors.green} /> : <ZapOff size={22} color={colors.white} />}
        </Pressable>
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Cadrez le code-barres (EAN) du produit</Text>
      </View>
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
  frameWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  frame: {
    width: '82%',
    height: 150,
    borderRadius: radius.md,
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
});
