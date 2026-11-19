import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { SheetScreen } from '@/components/sheet/SheetScreen';
import { Button, InfoRow } from '@/components/ui';
import { fontSize, makeStyles, monoFontFamily, radius, spacing } from '@/theme';
import type { HubEnvelope } from '@/types/hubProductMarketplaces';

import { useMarketplaceMutations } from '../hooks/useMarketplaceMutations';
import {
  MarketplaceSheetData,
  useSheetParams,
  type SheetData,
} from './MarketplaceSheetData';

/** Liaison de l'offre d'une marketplace au produit par son EAN : aperçu (sans écriture), puis application. */
export function LinkEanSheet() {
  const params = useSheetParams();
  if (!params) return null;
  return (
    <MarketplaceSheetData title="Lier par EAN" params={params}>
      {(data) => <LinkEanForm data={data} />}
    </MarketplaceSheetData>
  );
}

/** Résumé lisible de la réponse d'aperçu : message du back, sinon son contenu en JSON. */
function previewText(result: HubEnvelope): string {
  const body = result.data ?? result;
  const json = JSON.stringify(body, null, 2);
  return result.message ? `${result.message}\n\n${json}` : json;
}

function LinkEanForm({ data }: { data: SheetData }) {
  const styles = useStyles();
  const { reference, config, header, view } = data;
  const { linkEan } = useMarketplaceMutations(reference);
  const [preview, setPreview] = useState<HubEnvelope | null>(null);
  const ean = header?.ean ?? null;
  const country = view.country === 'FR' ? undefined : view.country;

  const run = (dryRun: boolean) =>
    linkEan.mutate(
      { marketplace: config.key, payload: { dryRun, country } },
      {
        onSuccess: (result) => {
          if (dryRun) setPreview(result);
          else router.back();
        },
      },
    );

  return (
    <SheetScreen
      title={`Lier par EAN · ${config.label}${country ? ` ${country}` : ''}`}
      closeLabel="Annuler"
      closeDisabled={linkEan.isPending}
      footer={
        <View style={styles.footer}>
          <Button
            label="Aperçu"
            variant="outline"
            loading={linkEan.isPending && preview == null}
            disabled={!ean || linkEan.isPending}
            onPress={() => run(true)}
            style={styles.footerButton}
          />
          <Button
            label="Appliquer"
            loading={linkEan.isPending && preview != null}
            disabled={preview == null || linkEan.isPending}
            onPress={() => run(false)}
            style={styles.footerButton}
          />
        </View>
      }
    >
      <Text style={styles.reference}>{reference}</Text>
      <InfoRow label="EAN du produit" value={ean ?? '—'} mono />
      {!ean ? (
        <Text style={styles.hint}>Ce produit n&apos;a pas d&apos;EAN : la liaison est impossible.</Text>
      ) : (
        <Text style={styles.hint}>
          L&apos;aperçu cherche l&apos;offre correspondante sans rien modifier ; appliquez ensuite pour la lier.
        </Text>
      )}
      {preview ? (
        <View style={styles.preview}>
          <Text style={styles.previewText} selectable>
            {previewText(preview)}
          </Text>
        </View>
      ) : null}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  reference: { fontSize: fontSize.sm, fontWeight: '700', color: t.textMuted },
  hint: { fontSize: fontSize.xs, lineHeight: 17, color: t.textSubtle },
  preview: { padding: spacing.md, borderRadius: radius.md, backgroundColor: t.surface },
  previewText: { fontSize: 11, lineHeight: 16, fontFamily: monoFontFamily, color: t.textMuted },
  footer: { flexDirection: 'row', gap: spacing.md },
  footerButton: { flex: 1 },
}));
