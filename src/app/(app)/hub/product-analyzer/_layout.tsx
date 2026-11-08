import type { ComponentProps } from 'react';
import { Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessHubProductAnalyzer } from '@/auth/permissions';
import { AccessDenied } from '@/features/preparation/components/AccessDenied';
import { AnalyzerSocketProvider } from '@/features/product-analyzer/socket/AnalyzerSocketProvider';
import { PricingBackButton } from '@/features/pricing/components/PricingBackButton';
import { useTheme } from '@/theme';

type SheetOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;

/**
 * Pile Product Analyzer, ouverte depuis le menu : l'historique, la fiche d'un produit, l'analyse
 * live, la file d'analyses et la fiche d'une affaire sont poussés ; les saisies (lancer, filtres,
 * tri, choix, négociation, éditions) sont des feuilles natives (`formSheet`) ; le scan est un
 * plein écran modal.
 */
export default function ProductAnalyzerLayout() {
  const t = useTheme();
  const { user } = useAuth();

  const sheet = (detents: number[]): SheetOptions => ({
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: 16,
    contentStyle: { backgroundColor: t.bgElevated },
    headerShown: false,
  });

  if (!user) return null;
  if (!canAccessHubProductAnalyzer(user.role)) {
    return (
      <AccessDenied
        title="Accès réservé"
        text="Le Product Analyzer est réservé aux comptes Super Admin."
      />
    );
  }

  return (
    <AnalyzerSocketProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: t.bg },
          headerStyle: { backgroundColor: t.bg },
          headerTintColor: t.accentText,
          headerTitleStyle: { color: t.text },
          headerShadowVisible: false,
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'Product Analyzer', headerLeft: () => <PricingBackButton /> }}
        />
        <Stack.Screen name="fiche/[uuid]" options={{ title: 'Produit' }} />
        <Stack.Screen name="live" options={{ title: 'Analyse en cours', gestureEnabled: false }} />
        <Stack.Screen name="file" options={{ title: "File d'analyses" }} />
        <Stack.Screen name="affaire/[id]" options={{ title: 'Affaire' }} />
        <Stack.Screen name="lancer" options={sheet([0.75, 1])} />
        <Stack.Screen name="filtres" options={sheet([0.9, 1])} />
        <Stack.Screen name="tri" options={sheet([0.7, 1])} />
        <Stack.Screen name="choix/[kind]" options={sheet([0.7, 1])} />
        <Stack.Screen name="negociation" options={sheet([0.95, 1])} />
        <Stack.Screen name="editer/[kind]" options={sheet([0.5, 0.9])} />
        <Stack.Screen
          name="scan"
          options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack>
    </AnalyzerSocketProvider>
  );
}
