import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { Badge, DetailSection, InfoRow } from '@/components/ui';
import { formatDate, formatEuro, formatInteger } from '@/lib/format';
import { fontSize, makeStyles, monoFontFamily, spacing } from '@/theme';

import { openProductConversation } from '../navigation';
import { ConversationLink } from '../shared/ConversationLink';
import { DetailScroll } from '../shared/DetailScroll';
import { ProductThumb } from '../shared/ProductThumb';
import { CRITICITE_META, formatWeeks } from './constants';
import { useProductDetail } from './hooks/useProductDetail';

/**
 * Fiche d'un produit PARTNER, en lecture : identité, stock, couverture et ventes, commande
 * fournisseur en cours, et accès au fil de messages du produit.
 */
export function ProductDetailScreen() {
  const styles = useStyles();
  const { reference } = useLocalSearchParams<{ reference: string }>();
  const { product, loading, error, notFound, refetch } = useProductDetail(reference);
  const criticite = product?.niveauCriticite ? CRITICITE_META[product.niveauCriticite] : null;
  const reappro = product?.reapproActuel;

  return (
    <>
      <Stack.Screen options={{ title: reference ?? 'Produit' }} />
      <DetailScroll
        loading={loading}
        error={error}
        notFound={notFound}
        notFoundTitle="Produit introuvable"
        notFoundText="Aucun produit ne correspond à cette référence."
        errorFallback="Impossible de charger le produit"
        refetch={refetch}
      >
        {product ? (
          <>
            <View style={styles.hero}>
              <ProductThumb base64={product.thumbnailBase64} size={84} />
              <View style={styles.heroText}>
                <Text style={styles.designation}>{product.designation ?? 'Sans désignation'}</Text>
                <Text style={styles.reference}>{product.reference}</Text>
                {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
                <View style={styles.badges}>
                  {criticite ? <Badge label={criticite.label} tone={criticite.tone} /> : null}
                  {product.needsAppro ? <Badge label="Réappro à lancer" tone="amber" /> : null}
                  {product.aRenegocier ? <Badge label="À renégocier" tone="purple" /> : null}
                  {product.obsoletProduct ? <Badge label="Obsolète" tone="neutral" /> : null}
                </View>
              </View>
            </View>

            <ConversationLink
              count={product.messagesCount}
              awaitingReply={product.awaitingReplyFromMe}
              preview={product.lastMessagePreview}
              onPress={() => openProductConversation(product.reference)}
            />

            <DetailSection title="Stock">
              <InfoRow label="Dombasle" value={formatInteger(product.warehouseDombasleStock)} />
              <InfoRow label="Flevy" value={formatInteger(product.warehouseFlevyStock)} />
              {product.ruptureNbDays != null && product.ruptureNbDays > 0 ? (
                <InfoRow label="En rupture depuis" value={`${product.ruptureNbDays} j`} />
              ) : null}
              {product.lastInventoryDombasle ? (
                <InfoRow
                  label="Dernier inventaire Dombasle"
                  value={formatDate(product.lastInventoryDombasle) ?? '—'}
                />
              ) : null}
              {product.lastInventoryFlevy ? (
                <InfoRow
                  label="Dernier inventaire Flevy"
                  value={formatDate(product.lastInventoryFlevy) ?? '—'}
                />
              ) : null}
            </DetailSection>

            <DetailSection title="Couverture et ventes">
              <InfoRow label="Couverture" value={formatWeeks(product.couvertureEnSemaines)} />
              <InfoRow
                label="Ventes moyennes / 3 mois"
                value={
                  product.venteMoyenne3mois != null
                    ? formatInteger(Math.round(product.venteMoyenne3mois))
                    : '—'
                }
              />
              <InfoRow
                label="Ventes moyennes / 6 mois"
                value={
                  product.venteMoyenne6mois != null
                    ? formatInteger(Math.round(product.venteMoyenne6mois))
                    : '—'
                }
              />
            </DetailSection>

            {reappro?.commandeFournisseur ? (
              <DetailSection title="Commande fournisseur">
                <InfoRow label="Quantité commandée" value={formatInteger(reappro.quantiteCommandee)} />
                <InfoRow
                  label="Livraison prévue"
                  value={formatDate(reappro.dateLivraisonPrevue) ?? '—'}
                />
              </DetailSection>
            ) : null}

            <DetailSection title="Identification">
              {product.ean ? (
                <InfoRow label="EAN" value={product.ean} mono copyLabel="EAN" />
              ) : null}
              <InfoRow label="Référence" value={product.reference} mono copyLabel="Référence" />
              {product.categoryType ? (
                <InfoRow label="Catégorie" value={product.categoryType} />
              ) : null}
              {product.fixPriceHT != null ? (
                <InfoRow label="Prix d'achat HT" value={formatEuro(product.fixPriceHT)} />
              ) : null}
            </DetailSection>

            <Text style={styles.footnote}>
              Consultation en lecture seule. Le réapprovisionnement et les prix se gèrent depuis
              l&apos;espace web.
            </Text>
          </>
        ) : null}
      </DetailScroll>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  heroText: { flex: 1, gap: spacing.xs },
  designation: { fontSize: fontSize.lg, fontWeight: '700', color: t.text },
  reference: { fontFamily: monoFontFamily, fontSize: fontSize.xs, color: t.textMuted },
  brand: { fontSize: fontSize.sm, fontWeight: '600', color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, paddingTop: spacing.xs },
  footnote: {
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: t.textFaint,
  },
}));
