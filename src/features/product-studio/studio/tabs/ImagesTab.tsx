import { useState } from 'react';
import { Alert, Linking, Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowLeft, ArrowRight, ExternalLink, Plus, X } from 'lucide-react-native';

import { Button } from '@/components/ui';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { StudioImageAsset } from '@/types/hubStudio';

import { googleImagesUrl, isGenerableView } from '../../domain/model';
import { useStudio } from '../StudioContext';
import { StudioCard, StudioHeading, StudioInput } from '../ui';

function defectLabel(defects: StudioImageAsset['defects']): string {
  if (!defects) return '';
  return Array.isArray(defects) ? defects.join(', ') : Object.keys(defects).join(', ');
}

function ImportForm() {
  const styles = useStyles();
  const t = useTheme();
  const { blocks } = useStudio();
  const [urls, setUrls] = useState<string[]>(['']);
  const importing = blocks.importImages.isPending;
  const filled = urls.map((url) => url.trim()).filter(Boolean);

  return (
    <View style={styles.import}>
      {urls.map((value, index) => (
        <View key={index} style={styles.urlRow}>
          <View style={styles.flex}>
            <StudioInput
              value={value}
              editable={!importing}
              placeholder="https://… URL de l'image"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(text) => setUrls(urls.map((url, i) => (i === index ? text : url)))}
            />
          </View>
          {urls.length > 1 ? (
            <Pressable
              accessibilityLabel="Retirer cette URL"
              disabled={importing}
              hitSlop={8}
              onPress={() => setUrls(urls.filter((_, i) => i !== index))}
              style={styles.iconBtn}
            >
              <X size={18} color={t.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ))}
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            label="Ajouter une URL"
            variant="ghost"
            disabled={importing}
            leadingIcon={<Plus size={15} color={t.text} />}
            onPress={() => setUrls([...urls, ''])}
          />
        </View>
        <View style={styles.flex}>
          <Button
            label={importing ? 'Import…' : 'Importer'}
            loading={importing}
            disabled={filled.length === 0}
            onPress={() => blocks.importImages.mutate(filled, { onSuccess: () => setUrls(['']) })}
          />
        </View>
      </View>
    </View>
  );
}

function AssetCard({
  asset,
  index,
  total,
  busy,
  onMove,
  onCover,
  onDelete,
  onPreview,
}: {
  asset: StudioImageAsset;
  index: number;
  total: number;
  busy: boolean;
  onMove: (direction: -1 | 1) => void;
  onCover: () => void;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const src = asset.thumbnailUrl || asset.originalUrl || '';
  const defects = defectLabel(asset.defects);
  const ai = (asset.origin ?? '').toUpperCase() === 'AI_GENERATED';

  return (
    <View style={styles.asset}>
      <Pressable onPress={onPreview} style={styles.thumb} accessibilityLabel="Agrandir l'image">
        {src ? (
          <Image
            source={{ uri: src }}
            style={styles.thumbImg}
            contentFit="contain"
            accessibilityLabel={asset.viewType || 'image produit'}
          />
        ) : (
          <Text style={styles.muted}>Aperçu indisponible</Text>
        )}
        <View style={styles.tags}>
          {asset.isCover ? (
            <Text style={[styles.tag, { backgroundColor: '#131921', color: '#fff' }]}>COVER</Text>
          ) : null}
          {ai ? (
            <Text style={[styles.tag, { backgroundColor: t.accent, color: t.onAccent }]}>IA</Text>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.meta}>
        <Text style={styles.view} numberOfLines={1}>
          {asset.viewType || 'vue'}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {asset.width}×{asset.height}
          {defects ? ` · ${defects}` : ''}
        </Text>
        <View style={styles.assetActions}>
          <Pressable
            accessibilityLabel="Déplacer avant"
            disabled={busy || index === 0}
            hitSlop={6}
            onPress={() => onMove(-1)}
            style={[styles.moveBtn, (busy || index === 0) && styles.disabled]}
          >
            <ArrowLeft size={16} color={t.text} />
          </Pressable>
          <Pressable
            accessibilityLabel="Déplacer après"
            disabled={busy || index === total - 1}
            hitSlop={6}
            onPress={() => onMove(1)}
            style={[styles.moveBtn, (busy || index === total - 1) && styles.disabled]}
          >
            <ArrowRight size={16} color={t.text} />
          </Pressable>
          {!asset.isCover ? (
            <Pressable hitSlop={6} disabled={busy} onPress={onCover}>
              <Text style={[styles.action, { color: t.accentText }]}>Cover</Text>
            </Pressable>
          ) : null}
          <Pressable hitSlop={6} disabled={busy} onPress={onDelete} style={styles.deleteBtn}>
            <Text style={[styles.action, { color: t.danger }]}>Supprimer</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Onglet Images : inventaire PrestaShop (ordre, cover, suppression), génération IA et import par URL. */
export function ImagesTab() {
  const styles = useStyles();
  const t = useTheme();
  const studio = useStudio();
  const { blocks, draft } = studio;
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<StudioImageAsset | null>(null);

  const assets = draft?.imageAssets ?? [];
  const plan = (draft?.imagePlan ?? []).filter((item) => item.viewType);
  const generable = plan.filter(isGenerableView);
  const photoRequired = plan.filter((item) => !isGenerableView(item));
  const generating = blocks.generateImages.isPending;
  const importing = blocks.importImages.isPending;
  const rejected = (blocks.importImages.data?.results ?? []).filter((r) => r.status === 'rejected');
  const busy =
    blocks.reorderImages.isPending || blocks.coverImage.isPending || blocks.removeImage.isPending;
  const previewSrc = preview?.previewUrl || preview?.originalUrl || preview?.thumbnailUrl || '';

  const move = (index: number, direction: -1 | 1) => {
    const ids = assets.map((a) => a.id);
    const target = index + direction;
    const moved = ids[index];
    const swapped = ids[target];
    if (moved === undefined || swapped === undefined) return;
    ids[index] = swapped;
    ids[target] = moved;
    blocks.reorderImages.mutate(ids);
  };

  const confirmDelete = (asset: StudioImageAsset) =>
    Alert.alert('Supprimer l’image', 'L’image sera retirée de la fiche PrestaShop.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => blocks.removeImage.mutate(asset.id) },
    ]);

  return (
    <View style={styles.root}>
      <StudioCard>
        <Button
          label={
            generating
              ? studio.imageLabel
              : generable.length === 0
                ? 'Aucune vue générable'
                : 'Générer les vues manquantes'
          }
          loading={generating}
          disabled={generating || importing || generable.length === 0}
          onPress={studio.generateImages}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              label={importOpen ? "Masquer l'import" : 'Importer des URLs'}
              variant="outline"
              onPress={() => setImportOpen((open) => !open)}
            />
          </View>
          <View style={styles.flex}>
            <Button
              label="Google Images"
              variant="outline"
              leadingIcon={<ExternalLink size={15} color={t.text} />}
              onPress={() => void Linking.openURL(googleImagesUrl(studio.reference))}
            />
          </View>
        </View>
        {generable.length > 0 ? (
          <Text style={styles.hint}>
            Générables par IA : {generable.map((item) => item.viewType).join(', ')}
          </Text>
        ) : null}
        {photoRequired.length > 0 ? (
          <Text style={[styles.hint, { color: t.warning }]}>
            Photo réelle requise :{' '}
            {photoRequired.map((item) => `${item.viewType}${item.hint ? ` (${item.hint})` : ''}`).join(' · ')}
          </Text>
        ) : null}
        {importOpen ? <ImportForm /> : null}
        {rejected.length > 0 ? (
          <View style={styles.rejected}>
            <Text style={[styles.rejectedTitle, { color: t.warning }]}>URLs refusées</Text>
            {rejected.map((item) => (
              <Text key={item.url} style={styles.hint}>
                {item.url}
                {item.reason ? ` — ${item.reason}` : ''}
              </Text>
            ))}
          </View>
        ) : null}
      </StudioCard>

      <StudioHeading>{`Images (${assets.length})`}</StudioHeading>
      {assets.length === 0 ? (
        <Text style={styles.empty}>Aucune image inventoriée.</Text>
      ) : (
        <View style={styles.grid}>
          {assets.map((asset, index) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              index={index}
              total={assets.length}
              busy={busy}
              onMove={(direction) => move(index, direction)}
              onCover={() => blocks.coverImage.mutate(asset.id)}
              onDelete={() => confirmDelete(asset)}
              onPreview={() => setPreview(asset)}
            />
          ))}
        </View>
      )}

      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreview(null)}>
          {previewSrc ? (
            <Image
              source={{ uri: previewSrc }}
              style={styles.previewImg}
              contentFit="contain"
              accessibilityLabel={preview?.viewType || 'aperçu'}
            />
          ) : (
            <Text style={styles.previewText}>Aperçu indisponible</Text>
          )}
          <Text style={styles.previewText}>Toucher pour fermer</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: spacing.md },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  hint: { fontSize: fontSize.xs, color: t.textMuted, lineHeight: 17 },
  muted: { fontSize: 11, color: t.textSubtle },
  empty: { paddingVertical: spacing.xl, textAlign: 'center', fontSize: fontSize.xs, color: t.textSubtle },
  disabled: { opacity: 0.3 },
  import: { gap: spacing.sm },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  rejected: {
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: t.surface,
  },
  rejectedTitle: { fontSize: fontSize.xs, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  asset: {
    width: '48.5%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  thumb: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  thumbImg: { width: '100%', height: '100%' },
  tags: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', gap: 4 },
  tag: {
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontSize: 10,
    fontWeight: '800',
  },
  meta: { gap: 2, padding: spacing.sm },
  view: { fontSize: fontSize.xs, fontWeight: '700', color: t.text },
  assetActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  moveBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: t.surfaceStrong,
  },
  action: { fontSize: fontSize.xs, fontWeight: '700' },
  deleteBtn: { marginLeft: 'auto' },
  previewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  previewImg: { width: '100%', height: '80%' },
  previewText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)' },
}));
