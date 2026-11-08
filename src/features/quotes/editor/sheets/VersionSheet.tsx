import { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { GitBranch } from 'lucide-react-native';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { fontSize, makeStyles, useTheme } from '@/theme';

import { QuoteTextArea } from '../../components/QuoteFields';
import { useQuoteEditor } from '../QuoteEditorProvider';

/** Ouverture de la version suivante d'un devis publié (le client voit toujours la version en cours). */
export function VersionSheet() {
  const { state, startRevision } = useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const current = Math.max(state.currentRevision, 1);
  const next = current + 1;

  const start = async () => {
    setBusy(true);
    await startRevision(reason.trim() || undefined);
    setBusy(false);
    router.back();
  };

  return (
    <SheetScreen
      title={`Créer la version ${next}`}
      closeLabel="Fermer"
      closeDisabled={busy}
      footer={
        <Button
          label={`Créer la version ${next}`}
          leadingIcon={<GitBranch size={16} color={t.onAccent} />}
          loading={busy}
          onPress={() => void start()}
          style={{ marginBottom: 12 }}
        />
      }
    >
      <Text style={styles.text}>
        La version {current} reste figée (PDF et montants conservés). Le client continue de la voir et ne pourra ni la
        payer ni l’accepter tant que la version {next} n’est pas envoyée.
        {state.quoteStatus === 'ACCEPTE' ? ' Le devis étant accepté, le client devra valider la nouvelle version.' : ''}
      </Text>
      <QuoteTextArea
        label="Motif (facultatif, visible dans l'historique et sur le PDF)"
        value={reason}
        onChangeText={setReason}
        maxLength={300}
        placeholder="Ex. quantités revues suite à l'appel du client"
      />
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  text: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
}));
