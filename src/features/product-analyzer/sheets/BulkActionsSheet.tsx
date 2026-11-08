import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Database,
  ExternalLink,
  Handshake,
  Layers,
  RefreshCw,
  Trash2,
  Truck,
} from 'lucide-react-native';
import { toast } from 'sonner-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { openWebPage } from '@/lib/openWeb';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

import {
  cancelNegotiationsFor,
  deleteStagingItems,
  refreshEbatproForItems,
  rerunSeeds,
} from '../bulkActions';
import { getPaFilters } from '../filtersStore';
import { negoScopeOf, useNegoInfo } from '../hooks/useNegoInfo';
import { canDeleteStaging } from '../lib/helpers';
import { openPaQueue, replacePaPicker } from '../navigation';
import { clearSelection, getSelectedItems, useSelection } from '../selectionStore';
import { useAnalyzerEngine } from '../socket/AnalyzerSocketProvider';

type RowProps = {
  icon: ReactNode;
  label: string;
  detail?: string;
  disabled?: boolean;
  destructive?: boolean;
  onPress: () => void;
};

export function ActionRow({ icon, label, detail, disabled, destructive, onPress }: RowProps) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surface }, disabled && { opacity: 0.4 }]}
    >
      {icon}
      <View style={styles.text}>
        <Text style={[styles.label, destructive && { color: t.danger }]}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Dismisse la feuille puis exécute l'action (une alerte ne peut pas s'ouvrir pendant la fermeture). */
function closeThen(action: () => void) {
  router.back();
  setTimeout(action, 400);
}

/** Actions groupées de la sélection, par famille : analyse, organisation, négociation, suppression. */
export function BulkActionsSheet() {
  const t = useTheme();
  const engine = useAnalyzerEngine();
  const selection = useSelection();
  const items = [...selection.values()];
  const nego = useNegoInfo(
    items.map((i) => i.uuid),
    negoScopeOf(getPaFilters()),
  );

  const rerun = rerunSeeds(items);
  const withNego = items.filter((i) => !!nego.open[i.uuid]);
  const deletable = items.filter(canDeleteStaging);
  const withCode = items.filter(
    (i) =>
      i.status !== 'LAUNCHED' &&
      !i.forcedFromCatalogue &&
      (!!i.codeEbat || (i.distributorOffers ?? []).some((o) => !!o.distributorCode)),
  );
  const editable = items.filter((i) => !i.forcedFromCatalogue);
  const plural = (n: number) => (n > 1 ? 's' : '');

  return (
    <SheetScreen title={`${items.length} produit${plural(items.length)}`} closeLabel="Fermer">
      <SheetSection title="Analyse">
        <ActionRow
          icon={<RefreshCw size={20} color={t.accentText} />}
          label="Relancer l'analyse"
          detail={
            rerun.seeds.length > 0
              ? `${rerun.seeds.length} relançable${plural(rerun.seeds.length)}${
                  rerun.skipped > 0 ? ` · ${rerun.skipped} ignoré${plural(rerun.skipped)}` : ''
                } · poids ignoré`
              : 'Aucun produit relançable (lancé, trace catalogue ou sans code)'
          }
          disabled={rerun.seeds.length === 0}
          onPress={() => {
            if (engine.getState().queue.running || engine.getState().single.phase === 'running') {
              toast.error('Une analyse est déjà en cours.');
              return;
            }
            router.back();
            engine.startQueue(rerun.seeds, 'rerun');
            clearSelection();
            setTimeout(openPaQueue, 400);
          }}
        />
        <ActionRow
          icon={<Database size={20} color={t.accentText} />}
          label="Relire EbatPro"
          detail={`PA, stock, conditionnement et viabilité · ${withCode.length} éligible${plural(withCode.length)}`}
          disabled={withCode.length === 0}
          onPress={() => closeThen(() => void refreshEbatproForItems(getSelectedItems()))}
        />
      </SheetSection>

      <SheetSection title="Organisation">
        <ActionRow
          icon={<Layers size={20} color={t.accentText} />}
          label="Ajouter à une affaire"
          detail="Regroupe les produits pour un fournisseur"
          disabled={items.every((i) => i.status === 'LAUNCHED' || i.forcedFromCatalogue)}
          onPress={() => replacePaPicker('bulk-affaire')}
        />
        <ActionRow
          icon={<Truck size={20} color={t.accentText} />}
          label="DEP planifiée"
          detail={`Poser ou retirer la DEP d'un fournisseur · ${editable.length} modifiable${plural(editable.length)}`}
          disabled={editable.length === 0}
          onPress={() => replacePaPicker('bulk-dep')}
        />
      </SheetSection>

      <SheetSection title="Négociation">
        <ActionRow
          icon={<Handshake size={20} color={t.warning} />}
          label="Annuler les négociations en cours"
          detail={
            withNego.length > 0
              ? `${withNego.length} produit${plural(withNego.length)} avec une négo ouverte`
              : 'Aucune négociation ouverte dans la sélection'
          }
          disabled={withNego.length === 0}
          onPress={() => closeThen(() => void cancelNegotiationsFor(withNego))}
        />
      </SheetSection>

      <SheetSection title="Sur le web">
        <ActionRow
          icon={<ExternalLink size={20} color={t.accentText} />}
          label="Exporter en Excel"
          detail="L'export de la sélection se fait depuis le site web"
          onPress={() => closeThen(() => void openWebPage('/hub/product-analyzer'))}
        />
      </SheetSection>

      <SheetSection title="Zone sensible">
        <ActionRow
          icon={<Trash2 size={20} color={t.danger} />}
          label="Supprimer"
          destructive
          detail={
            deletable.length > 0
              ? `${deletable.length} supprimable${plural(deletable.length)} (non viables ou sans information)`
              : 'Seuls les produits non viables ou sans information peuvent être supprimés'
          }
          disabled={deletable.length === 0}
          onPress={() => closeThen(() => void deleteStagingItems(getSelectedItems()))}
        />
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: hitTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: t.border,
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: fontSize.sm, fontWeight: '700', color: t.text },
  detail: { fontSize: fontSize.xs, color: t.textMuted },
}));
