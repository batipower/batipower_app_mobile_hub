import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button } from '@/components/ui';
import { ChoiceField } from '@/features/pricing/components/FilterControls';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { fontSize, makeStyles, spacing } from '@/theme';

import {
  categorizeSelection,
  describeExclusions,
  runBulkLaunch,
  type BulkLaunchMode,
} from '../bulkActions';
import { useDistributors } from '../hooks/useDistributors';
import { getSelectedItems, useSelection } from '../selectionStore';

/**
 * Lancement groupé : « Lancer » (fiche catalogue) ou « Lancer + déployer » (offres marketplace),
 * avec la DEP planifiée d'un fournisseur posée avant le lancement si besoin.
 */
export function BulkLaunchSheet({ initialMode = 'launch' }: { initialMode?: BulkLaunchMode }) {
  const styles = useStyles();
  const selection = useSelection();
  const { distributors } = useDistributors();
  const [mode, setMode] = useState<BulkLaunchMode>(initialMode);
  const [dep, setDep] = useState('');

  const cat = categorizeSelection([...selection.values()]);
  const exclusions = describeExclusions(cat);
  const n = cat.launchable.length;

  const run = () => {
    const snapshot = categorizeSelection(getSelectedItems());
    router.back();
    setTimeout(() => void runBulkLaunch(mode, snapshot, dep || null), 350);
  };

  return (
    <SheetScreen
      title="Lancer la sélection"
      closeLabel="Annuler"
      footer={
        <Button
          label={
            n === 0
              ? 'Aucun produit lançable'
              : `${mode === 'deploy' ? 'Lancer et déployer' : 'Lancer'} ${n} produit${n > 1 ? 's' : ''}`
          }
          disabled={n === 0}
          onPress={run}
        />
      }
    >
      <SheetSection title="Mode">
        <SegmentedControl
          segments={[
            { key: 'launch', label: 'Lancer' },
            { key: 'deploy', label: 'Lancer + déployer' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <Text style={styles.hint}>
          {mode === 'deploy'
            ? 'Crée la fiche catalogue puis les offres Amazon, ManoMano et Leroy Merlin. Un produit à la fois pour ne pas saturer les marketplaces.'
            : 'Crée la fiche catalogue du produit (sans déployer les offres marketplace).'}
        </Text>
      </SheetSection>

      <SheetSection title="DEP planifiée (facultatif)">
        <ChoiceField
          label="Poser la DEP de ce fournisseur avant le lancement"
          options={[{ value: '', label: 'Aucune' }, ...distributors.map((d) => ({ value: d.id, label: d.name }))]}
          value={dep}
          onChange={setDep}
        />
      </SheetSection>

      {exclusions.length > 0 ? (
        <SheetSection title="Exclus du lancement">
          <View style={styles.list}>
            {exclusions.map((line) => (
              <Text key={line} style={styles.hint}>
                • {line}
              </Text>
            ))}
          </View>
        </SheetSection>
      ) : null}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hint: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  list: { gap: spacing.xs },
}));
