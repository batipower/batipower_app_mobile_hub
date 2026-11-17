import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing } from '@/theme';

import { useStudio } from './StudioContext';

/** Confirmation d'une action irréversible du Studio (déployer, annuler une écriture, quitter). */
export function StudioConfirm() {
  const styles = useStyles();
  const { confirm: current, confirming, cancelConfirm, runConfirm } = useStudio();
  // Garde le dernier contenu pendant l'animation de fermeture.
  const [last, setLast] = useState(current);
  if (current && current !== last) setLast(current);
  const confirm = current ?? last;

  return (
    <Modal
      visible={Boolean(current)}
      transparent
      animationType="fade"
      onRequestClose={cancelConfirm}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={cancelConfirm} accessibilityLabel="Fermer" />
        <View style={styles.card}>
          <Text style={styles.title}>{confirm?.title}</Text>
          {confirm?.message ? <Text style={styles.message}>{confirm.message}</Text> : null}
          {confirm && confirm.details.length > 0 ? (
            <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent}>
              {confirm.details.map((line) => (
                <Text key={line} style={styles.detail}>
                  {`•  ${line}`}
                </Text>
              ))}
            </ScrollView>
          ) : null}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                label="Annuler"
                variant="outline"
                disabled={confirming}
                onPress={cancelConfirm}
              />
            </View>
            <View style={styles.action}>
              <Button
                label={confirm?.confirmLabel ?? 'Confirmer'}
                loading={confirming}
                onPress={() => void runConfirm()}
                style={confirm?.tone === 'danger' ? styles.danger : undefined}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dismiss: { ...{ position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 } },
  card: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: t.bgElevated,
    maxHeight: '85%',
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: t.text },
  message: { fontSize: fontSize.sm, color: t.textMuted, lineHeight: 20 },
  details: {
    maxHeight: 260,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  detailsContent: { gap: spacing.xs, padding: spacing.md },
  detail: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  danger: { backgroundColor: t.danger },
}));
