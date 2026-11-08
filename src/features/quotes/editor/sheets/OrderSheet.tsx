import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Truck, Zap } from 'lucide-react-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button, Chip } from '@/components/ui';
import type { QuoteFulfillment, QuoteWarehouse } from '@/types/hubCustomerQuotes';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

import { useQuoteEditor } from '../QuoteEditorProvider';

/**
 * Conversion du devis accepté en commande PrestaShop : flux classique (préparation eBatPro vers
 * Dombasle ou Flevy) ou commande déjà livrée (QG direct). L'envoi par l'entrepôt (drive Dombasle
 * avec eBAT) reste sur le web.
 */
export function OrderSheet() {
  const { state, convertToOrder } = useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const [warehouse, setWarehouse] = useState<QuoteWarehouse>('DOMBASLE');
  const [busy, setBusy] = useState(false);

  const run = async (fulfillment: QuoteFulfillment, wh?: QuoteWarehouse) => {
    setBusy(true);
    const ok = await convertToOrder(fulfillment, wh);
    setBusy(false);
    if (ok) router.back();
  };

  const confirm = (fulfillment: QuoteFulfillment, message: string, wh?: QuoteWarehouse) =>
    Alert.alert('Convertir en commande ?', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Convertir', onPress: () => void run(fulfillment, wh) },
    ]);

  const unresolved = state.lines.filter(
    (l) => (l.lineType ?? 'product') === 'product' && !l.prestashopProductId && l.reference.trim() !== '',
  );

  return (
    <SheetScreen title="Convertir en commande" closeLabel="Fermer" closeDisabled={busy}>
      <Text style={styles.muted}>Choisissez comment cette commande doit être préparée et livrée.</Text>
      {unresolved.length > 0 ? (
        <Text style={styles.warn}>
          Références non liées à PrestaShop : {unresolved.map((l) => l.reference).join(', ')}.
        </Text>
      ) : null}

      <SheetSection title="Flux classique — préparation eBatPro">
        <Text style={styles.muted}>
          La commande part dans le flux eBatPro automatique (livraison au centre de préparation), comme les commandes du site.
        </Text>
        <View style={styles.row}>
          <Chip label="Dombasle" active={warehouse === 'DOMBASLE'} onPress={() => setWarehouse('DOMBASLE')} />
          <Chip label="Flevy" active={warehouse === 'FLEVY'} onPress={() => setWarehouse('FLEVY')} />
        </View>
        <Button
          label={`Convertir — ${warehouse === 'DOMBASLE' ? 'Dombasle' : 'Flevy'}`}
          leadingIcon={<Truck size={16} color={t.onAccent} />}
          loading={busy}
          disabled={unresolved.length > 0}
          onPress={() =>
            confirm(
              'classic',
              `La commande PrestaShop sera créée et préparée via ${warehouse === 'DOMBASLE' ? 'Dombasle' : 'Flevy'}.`,
              warehouse,
            )
          }
        />
      </SheetSection>

      <SheetSection title="Commande déjà livrée — QG direct">
        <Pressable
          accessibilityRole="button"
          disabled={busy || unresolved.length > 0}
          onPress={() =>
            confirm(
              'qg_direct',
              'La commande est enregistrée directement en « Paiement accepté - QG BATIPOWER » (virement déjà encaissé). Aucune préparation ne sera lancée.',
            )
          }
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.6 }, (busy || unresolved.length > 0) && { opacity: 0.5 }]}
        >
          <Zap size={18} color={t.purple} />
          <Text style={styles.cardText}>
            Enregistre la commande directement en Paiement accepté (règlement par virement déjà encaissé). Aucune
            préparation ni commande eBAT.
          </Text>
        </Pressable>
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  muted: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  warn: { fontSize: fontSize.xs, fontWeight: '600', color: t.danger },
  row: { flexDirection: 'row', gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    alignItems: 'flex-start',
  },
  cardText: { flex: 1, fontSize: fontSize.xs, lineHeight: 17, color: t.textMuted },
}));
