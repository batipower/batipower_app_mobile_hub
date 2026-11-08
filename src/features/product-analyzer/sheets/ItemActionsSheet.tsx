import { router } from 'expo-router';
import {
  Copy,
  Database,
  Globe,
  Layers,
  RefreshCw,
  Rocket,
  Tag,
  Trash2,
  Truck,
  Handshake,
  Calculator,
  KeyRound,
} from 'lucide-react-native';
import { toast } from 'sonner-native';

import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { copyToClipboard } from '@/lib/clipboard';
import { openWebPage } from '@/lib/openWeb';
import { useTheme } from '@/theme';

import { cancelNegotiationsFor, deleteStagingItems, refreshEbatproForItems } from '../bulkActions';
import { buildRerunRequest, ficheLaunchState, launchSingle, recalculateTop } from '../ficheActions';
import { useNegoInfo } from '../hooks/useNegoInfo';
import { useStagingDetail } from '../hooks/useStagingDetail';
import { canDeleteStaging, stagingRerunTarget } from '../lib/helpers';
import { dismissThen, openPaEdit, openPaLive, replacePaPicker } from '../navigation';
import { useAnalyzerEngine } from '../socket/AnalyzerSocketProvider';

import { ActionRow } from './BulkActionsSheet';
import { dismissSheetThen } from '@/components/sheet/dismissSheet';

/** Menu « … » d'une fiche : analyse, organisation, négociation et zone sensible, regroupés par famille. */
export function ItemActionsSheet({ uuid }: { uuid: string }) {
  const t = useTheme();
  const engine = useAnalyzerEngine();
  const { data: item } = useStagingDetail(uuid);
  const nego = useNegoInfo([uuid], {});

  if (!item) {
    return (
      <SheetScreen title="Actions" closeLabel="Fermer">
        <ActionRow icon={null} label="Chargement…" onPress={() => undefined} disabled />
      </SheetScreen>
    );
  }

  const locked = !!item.forcedFromCatalogue;
  const launched = item.status === 'LAUNCHED';
  const hasCode = !!item.codeEbat || (item.distributorOffers ?? []).some((o) => !!o.distributorCode?.trim());
  const rerunnable = !!stagingRerunTarget(item);
  const hasNego = !!nego.open[uuid];
  const primary = ficheLaunchState(item);

  const rerun = async () => {
    const state = engine.getState();
    if (state.queue.running || state.single.phase === 'pending' || state.single.phase === 'running') {
      toast.error('Une analyse est déjà en cours.');
      return;
    }
    const request = await buildRerunRequest(item);
    if (!request) {
      toast.error('Produit non relançable.');
      return;
    }
    if (engine.startSingle(request)) dismissSheetThen(openPaLive);
    else router.back();
  };

  return (
    <SheetScreen title="Actions" closeLabel="Fermer">
      {!locked ? (
        <SheetSection title="Analyse">
          <ActionRow
            icon={<RefreshCw size={20} color={t.accentText} />}
            label="Relancer l'analyse"
            detail={rerunnable ? 'Analyse complète : marketplaces, stocks, viabilité' : 'Non relançable (produit lancé ou sans code / EAN)'}
            disabled={!rerunnable}
            onPress={() => void rerun()}
          />
          <ActionRow
            icon={<Database size={20} color={t.accentText} />}
            label="Relancer EbatPro"
            detail="Relit PA, stock, conditionnement et viabilité"
            disabled={launched || !hasCode}
            onPress={() => dismissThen(() => void refreshEbatproForItems([item]))}
          />
          <ActionRow
            icon={<Calculator size={20} color={t.accentText} />}
            label="Recalculer TOP 1–7"
            detail="Degrés de viabilité du produit"
            onPress={() => dismissThen(() => void recalculateTop(item))}
          />
        </SheetSection>
      ) : null}

      {!locked && primary.kind === 'launch' ? (
        <SheetSection title="Lancement">
          <ActionRow
            icon={<Rocket size={20} color={t.accentText} />}
            label="Lancer + déployer FR"
            detail="Crée la fiche puis déploie les offres sur les marketplaces"
            onPress={() => dismissThen(() => void launchSingle(item, 'deploy'))}
          />
        </SheetSection>
      ) : null}

      <SheetSection title="Organisation">
        {!locked && !launched ? (
          <>
            <ActionRow
              icon={<Layers size={20} color={t.accentText} />}
              label="Affaires"
              detail="Rattacher le produit à une affaire fournisseur"
              onPress={() => {
                dismissSheetThen(() => openPaEdit('affaire', { uuid }));
              }}
            />
            <ActionRow
              icon={<Truck size={20} color={t.accentText} />}
              label="DEP planifiée"
              detail="Poser ou retirer la DEP par fournisseur"
              onPress={() => {
                dismissSheetThen(() => openPaEdit('dep', { uuid }));
              }}
            />
            <ActionRow
              icon={<KeyRound size={20} color={t.accentText} />}
              label="Codes fournisseurs"
              detail="Rechercher ou rattacher les codes internes"
              onPress={() => {
                dismissSheetThen(() => openPaEdit('supplier-codes', { uuid }));
              }}
            />
          </>
        ) : null}
        {!locked ? (
          <ActionRow
            icon={<Tag size={20} color={t.accentText} />}
            label="Tags"
            detail="Recopiés sur la fiche catalogue au lancement"
            onPress={() => replacePaPicker('edit-tags', { uuid })}
          />
        ) : null}
      </SheetSection>

      {hasNego && !locked ? (
        <SheetSection title="Négociation">
          <ActionRow
            icon={<Handshake size={20} color={t.warning} />}
            label="Annuler la négociation"
            detail="La ligne disparaît des opportunités partenaire"
            onPress={() => dismissThen(() => void cancelNegotiationsFor([item]))}
          />
        </SheetSection>
      ) : null}

      <SheetSection title="Partager">
        {item.ean ? (
          <ActionRow
            icon={<Copy size={20} color={t.accentText} />}
            label="Copier l'EAN"
            detail={item.ean}
            onPress={() => dismissThen(() => void copyToClipboard(item.ean as string, 'EAN'))}
          />
        ) : null}
        <ActionRow
          icon={<Globe size={20} color={t.accentText} />}
          label="Ouvrir sur le web"
          detail="Fiche complète dans le Product Analyzer web"
          disabled={!item.ean}
          onPress={() => dismissThen(() => void openWebPage(`/hub/product-analyzer/${encodeURIComponent(item.ean as string)}`))}
        />
      </SheetSection>

      {canDeleteStaging(item) ? (
        <SheetSection title="Zone sensible">
          <ActionRow
            icon={<Trash2 size={20} color={t.danger} />}
            label="Supprimer l'analyse"
            destructive
            detail="Produit non viable ou sans information"
            onPress={() =>
              dismissThen(() => {
                void deleteStagingItems([item]).then((deleted) => {
                  if (deleted && router.canGoBack()) router.back();
                });
              })
            }
          />
        </SheetSection>
      ) : null}
    </SheetScreen>
  );
}

