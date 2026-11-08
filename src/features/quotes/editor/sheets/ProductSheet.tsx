import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Heading, Package, Plus, Type } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { searchPrestaShopProducts } from '@/api/hubCustomerQuotes';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Button, TextField } from '@/components/ui';
import { ErrorBanner } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { formatEuro } from '@/lib/format';
import { fontSize, hitTarget, makeStyles, monoFontFamily, radius, spacing, useTheme } from '@/theme';

import { QUOTES_ROOT_KEY } from '../../queryKeys';
import { normalizeTaxRate } from '../../lib/quote-math';
import { useQuoteEditor } from '../QuoteEditorProvider';

/**
 * Ajout de lignes : recherche catalogue PrestaShop (plusieurs ajouts d'affilée), saisie d'une
 * référence, titre de section ou texte libre.
 */
export function ProductSheet() {
  const { state, addProductFromHit, addProductByReference, addTextLine } = useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [reference, setReference] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [adding, setAdding] = useState(false);
  const term = useDebouncedTerm(search);

  const products = useQuery({
    queryKey: [...QUOTES_ROOT_KEY, 'ps-products', term],
    queryFn: () => searchPrestaShopProducts(term, 20),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });

  const countOf = (ref: string) => state.lines.filter((l) => l.reference === ref).length;

  return (
    <SheetScreen title="Ajouter au devis" closeLabel="OK">
      <SheetSection title="Rechercher un produit">
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nom ou référence du produit…" />
        {products.isFetching ? <ActivityIndicator color={t.accentText} /> : null}
        {products.error ? (
          <ErrorBanner error={products.error} fallback="Recherche impossible" onRetry={() => void products.refetch()} />
        ) : null}
        {(products.data ?? []).map((p) => {
          const tr = normalizeTaxRate(p.taxRate ?? 0.2);
          const ttc = p.unitPriceHT != null ? p.unitPriceHT * (1 + tr) : null;
          const already = countOf(p.reference);
          return (
            <Pressable
              key={`${p.reference}-${String(p.prestashopProductId)}`}
              accessibilityRole="button"
              accessibilityLabel={`Ajouter ${p.label}`}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                void addProductFromHit(p);
                toast.success(`${p.reference} ajouté`);
              }}
              style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
            >
              <View style={styles.thumb}>
                {p.imageUrl ? (
                  <Image source={{ uri: p.imageUrl }} contentFit="contain" style={styles.image} />
                ) : (
                  <Package size={18} color={t.textFaint} />
                )}
              </View>
              <View style={styles.hitText}>
                <Text style={styles.hitLabel} numberOfLines={2}>
                  {p.label}
                </Text>
                <Text style={styles.hitSub} numberOfLines={1}>
                  {p.reference}
                  {ttc != null ? ` · ${formatEuro(ttc)} TTC` : ''}
                  {p.active === false ? ' · Inactif' : ''}
                </Text>
              </View>
              {already > 0 ? <Text style={styles.count}>×{already}</Text> : null}
              <Plus size={18} color={t.accentText} />
            </Pressable>
          );
        })}
        {term.length >= 2 && !products.isFetching && (products.data?.length ?? 0) === 0 && !products.error ? (
          <Text style={styles.hitSub}>Aucun produit trouvé.</Text>
        ) : null}
      </SheetSection>

      <SheetSection title="Par référence">
        <View style={styles.refRow}>
          <View style={styles.refField}>
            <TextField label="Référence" value={reference} onChangeText={setReference} autoCapitalize="characters" autoCorrect={false} />
          </View>
          <View style={styles.qtyField}>
            <TextField label="Qté" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
          </View>
        </View>
        <Button
          variant="outline"
          label="Ajouter cette référence"
          loading={adding}
          disabled={!reference.trim()}
          leadingIcon={<Plus size={16} color={t.accentText} />}
          onPress={() => {
            setAdding(true);
            void addProductByReference(reference, Number(quantity) || 1).finally(() => {
              setAdding(false);
              setReference('');
              setQuantity('1');
            });
          }}
        />
      </SheetSection>

      <SheetSection title="Mise en page">
        <Button
          variant="outline"
          label="Ajouter un titre de section"
          leadingIcon={<Heading size={16} color={t.accentText} />}
          onPress={() => {
            addTextLine('title', '');
            toast.success('Titre ajouté : touchez-le dans la liste pour le renseigner.');
          }}
        />
        <Button
          variant="outline"
          label="Ajouter un texte libre"
          leadingIcon={<Type size={16} color={t.accentText} />}
          onPress={() => {
            addTextLine('text', '');
            toast.success('Texte ajouté : touchez-le dans la liste pour le renseigner.');
          }}
        />
      </SheetSection>
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hit: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  pressed: { opacity: 0.6 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: 44, height: 44 },
  hitText: { flex: 1, gap: 1 },
  hitLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  hitSub: { fontSize: fontSize.xs, color: t.textMuted, fontFamily: monoFontFamily },
  count: { fontSize: fontSize.xs, fontWeight: '800', color: t.success },
  refRow: { flexDirection: 'row', gap: spacing.md },
  refField: { flex: 1 },
  qtyField: { width: 84 },
}));
