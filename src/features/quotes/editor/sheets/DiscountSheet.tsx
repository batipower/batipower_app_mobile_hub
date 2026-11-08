import { Text, View } from 'react-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Chip, TextField } from '@/components/ui';
import { formatEuro } from '@/lib/format';
import { fontSize, makeStyles, spacing } from '@/theme';

import { NumberField } from '../components/NumberField';
import { useQuoteEditor } from '../QuoteEditorProvider';

/** Remise globale du devis : pourcentage ou montant HT, avec un libellé affiché au client. */
export function DiscountSheet() {
  const { state, derived, patch } = useQuoteEditor();
  const styles = useStyles();
  const percent = state.globalDiscountType === 'PERCENT';

  return (
    <SheetScreen
      title="Remise globale"
      closeLabel="OK"
      leading={
        state.globalDiscountValue > 0
          ? {
              label: 'Retirer',
              onPress: () => patch({ globalDiscountValue: 0, globalDiscountLabel: '' }),
            }
          : undefined
      }
    >
      <SheetSection title="Type">
        <View style={styles.row}>
          <Chip label="Pourcentage" active={percent} onPress={() => patch({ globalDiscountType: 'PERCENT' })} />
          <Chip label="Montant HT" active={!percent} onPress={() => patch({ globalDiscountType: 'AMOUNT' })} />
        </View>
        <NumberField
          label="Valeur"
          suffix={percent ? '%' : '€ HT'}
          value={state.globalDiscountValue}
          min={0}
          max={percent ? 100 : undefined}
          onValueChange={(v) => patch({ globalDiscountValue: v })}
        />
        <TextField
          label="Libellé (visible sur le devis)"
          value={state.globalDiscountLabel}
          onChangeText={(v) => patch({ globalDiscountLabel: v })}
          placeholder="Ex. Remise de fidélité"
          maxLength={80}
        />
      </SheetSection>
      <Text style={styles.hint}>
        Remise appliquée : {formatEuro(derived.totals.promoAmount)} HT · Total TTC {formatEuro(derived.totals.totalTTC)}
      </Text>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  hint: { fontSize: fontSize.sm, color: t.textMuted },
}));
