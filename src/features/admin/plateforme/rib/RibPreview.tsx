import { Text, View } from 'react-native';

import { fontSize, makeStyles, radius, spacing } from '@/theme';

import { buildRibDetails, parseFrenchIban } from '../../shared/iban';

type RibPreviewProps = { holder: string; iban: string; bic: string; domiciliation: string };

/** Aperçu du bloc « Coordonnées bancaires » tel qu'il apparaîtra sur le PDF et dans l'e-mail de virement. */
export function RibPreview({ holder, iban, bic, domiciliation }: RibPreviewProps) {
  const styles = useStyles();
  const details = buildRibDetails(parseFrenchIban(iban));
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Coordonnées bancaires</Text>
      <Text style={styles.line}>{holder || '—'}</Text>
      <Text style={[styles.line, styles.strong]} selectable>
        IBAN : {iban || '—'}
      </Text>
      <Text style={[styles.line, styles.strong]} selectable>
        BIC : {bic || '—'}
      </Text>
      <Text style={styles.muted}>Domiciliation : {domiciliation || '—'}</Text>
      {details ? <Text style={styles.muted}>{details}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    gap: 3,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: t.border,
    borderLeftColor: t.accent,
    backgroundColor: t.surface,
  },
  title: { fontSize: fontSize.sm, fontWeight: '800', color: t.text, marginBottom: 2 },
  line: { fontSize: fontSize.xs, color: t.text },
  strong: { fontWeight: '700' },
  muted: { fontSize: 11, color: t.textMuted },
}));
