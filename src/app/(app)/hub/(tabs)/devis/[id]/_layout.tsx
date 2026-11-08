import { Stack, useLocalSearchParams } from 'expo-router';

import { SHEET_DETENTS, sheetOptions } from '@/components/sheet/sheetOptions';
import { QuoteEditorProvider } from '@/features/quotes/editor/QuoteEditorProvider';
import { useTheme } from '@/theme';

/**
 * Pile de l'éditeur d'un devis (`/hub/devis/nouveau` ou `/hub/devis/<id>`). Le fournisseur
 * enveloppe la pile : l'écran et chacune de ses feuilles (client, produit, ligne, transport,
 * remise, IA, envoi, commande, refus, e-mails, version, annulation) partagent le même devis en
 * cours d'édition.
 */
export default function QuoteEditorLayout() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <QuoteEditorProvider routeId={id}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: t.bg },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="client" options={sheetOptions(t, SHEET_DETENTS.tall)} />
        <Stack.Screen name="produit" options={sheetOptions(t, SHEET_DETENTS.tall)} />
        <Stack.Screen name="ligne" options={sheetOptions(t, SHEET_DETENTS.tall)} />
        <Stack.Screen name="transport" options={sheetOptions(t, SHEET_DETENTS.tall)} />
        <Stack.Screen name="remise" options={sheetOptions(t, SHEET_DETENTS.editor)} />
        <Stack.Screen name="ia" options={sheetOptions(t, SHEET_DETENTS.tall)} />
        <Stack.Screen name="envoyer" options={sheetOptions(t, SHEET_DETENTS.tall)} />
        <Stack.Screen name="commande" options={sheetOptions(t, SHEET_DETENTS.editor)} />
        <Stack.Screen name="refus" options={sheetOptions(t, SHEET_DETENTS.tall)} />
        <Stack.Screen name="emails" options={sheetOptions(t, SHEET_DETENTS.tall)} />
        <Stack.Screen name="version" options={sheetOptions(t, SHEET_DETENTS.editor)} />
        <Stack.Screen name="annuler" options={sheetOptions(t, SHEET_DETENTS.editor)} />
      </Stack>
    </QuoteEditorProvider>
  );
}
