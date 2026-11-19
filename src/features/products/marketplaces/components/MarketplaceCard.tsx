import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ExternalLink, MoreHorizontal } from 'lucide-react-native';

import { Badge, Button, Card, Chip, InfoRow } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { OriginLogo } from '@/features/orders/components/OriginLogo';
import { formatEuro } from '@/lib/format';
import { openExternalUrl } from '@/lib/openWeb';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';
import type { HubProductPricing } from '@/types/hubProductMarketplaces';

import { COUNTRY_FLAGS, type MarketplaceConfigEntry } from '../config';
import { useMarketplaceActions } from '../hooks/useMarketplaceActions';
import { openFieldSheet } from '../navigation';
import { buildMarketplaceViewModel, type MarketplaceCountryView } from '../viewModel';
import { CompetitionBlock } from './CompetitionBlock';
import { MarketplaceKpis } from './MarketplaceKpis';

type Props = {
  pricing: HubProductPricing;
  config: MarketplaceConfigEntry;
  ean: string | null;
  /** SUPERADMIN : menu d'actions et tuiles modifiables ; sinon lecture seule. */
  canEdit: boolean;
  /** MANAGER : marge, commission, objectif et prix d'équilibre masqués. */
  masked: boolean;
};

function statusOf(view: MarketplaceCountryView): { label: string; tone: BadgeTone } {
  if (view.notAvailable) return { label: 'Indisponible', tone: 'neutral' };
  if (view.noBuyBox) return { label: 'Aucune BuyBox', tone: 'neutral' };
  if (view.isOwner) return { label: 'Notre BuyBox', tone: 'green' };
  if (view.isOwner === false) return { label: 'BuyBox perdue', tone: 'red' };
  return { label: 'BuyBox inconnue', tone: 'neutral' };
}

/** Libellé d'un SKU : l'identifiant Amazon est un ASIN, les autres marketplaces ont un SKU. */
function skuLabel(config: MarketplaceConfigEntry, index: number): string {
  const base = config.key === 'amazon' ? 'ASIN' : 'SKU';
  return index === 0 ? base : `${base} ${index + 1}`;
}

/**
 * Carte d'une marketplace : pays (puces), statut de la BuyBox, prix, concurrence, repères
 * financiers, identifiants copiables et lien vers la fiche. Une marketplace sans offre est
 * repliée sur une ligne « Aucune offre ».
 */
export function MarketplaceCard({ pricing, config, ean, canEdit, masked }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const viewModel = buildMarketplaceViewModel(pricing, config.key, ean);
  const [country, setCountry] = useState('FR');
  const [expanded, setExpanded] = useState(false);

  const view = viewModel.countries.find((entry) => entry.country === country) ?? viewModel.countries[0]!;
  const { openMenu, pending } = useMarketplaceActions(pricing.reference, config, view);

  const status = statusOf(view);
  const hasNoOffer = view.noBuyBox && view.skus.length === 0 && !view.skuInternal;
  const compact = hasNoOffer && !expanded;
  const price = view.actualPrice;
  const shipping = view.details.shippingCostTTC;
  const priceLabel = view.isOwner ? 'Prix de vente TTC' : 'Prix BuyBox TTC';
  const edit = (field: 'objective' | 'commission') =>
    openFieldSheet({ reference: pricing.reference, marketplace: config.key, country, field });

  return (
    <Card contentStyle={styles.card}>
      <View style={styles.header}>
        <OriginLogo origin={config.origin} size={36} />
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{config.label}</Text>
          <View style={styles.badges}>
            <Badge label={status.label} tone={status.tone} />
            {view.details.manoManoExpress ? <Badge label="Express" tone="blue" /> : null}
          </View>
        </View>
        {canEdit ? (
          <Pressable
            onPress={() => void openMenu()}
            disabled={pending}
            hitSlop={8}
            style={({ pressed }) => [styles.menuButton, (pressed || pending) && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Actions ${config.label}`}
          >
            <MoreHorizontal size={20} color={t.accentText} />
          </Pressable>
        ) : null}
      </View>

      {config.countries.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.countries}
        >
          {viewModel.countries.map((entry) => (
            <Chip
              key={entry.country}
              label={`${COUNTRY_FLAGS[entry.country] ?? ''} ${entry.country}`.trim()}
              active={entry.country === country}
              onPress={() => setCountry(entry.country)}
            />
          ))}
        </ScrollView>
      ) : null}

      {compact ? (
        <View style={styles.compact}>
          <Text style={styles.muted}>Aucune offre{country === 'FR' ? '' : ` (${country})`}</Text>
          <Pressable onPress={() => setExpanded(true)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>Détails</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.body, view.notAvailable ? styles.dimmed : null]}>
          {!view.noBuyBox ? (
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>{priceLabel}</Text>
                <Text style={styles.price}>{formatEuro(price)}</Text>
              </View>
              <View style={styles.shippingWrap}>
                <Text style={styles.priceLabel}>Port TTC</Text>
                <Text style={styles.shipping}>
                  {shipping == null ? 'Non renseigné' : shipping <= 0 ? 'Offert' : formatEuro(shipping)}
                </Text>
              </View>
              {price != null && shipping != null && shipping > 0 ? (
                <View style={styles.shippingWrap}>
                  <Text style={styles.priceLabel}>Total client</Text>
                  <Text style={styles.shipping}>{formatEuro(price + shipping)}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {view.sellerName && view.isOwner ? (
            <InfoRow label="Vendeur" value={view.sellerName} />
          ) : null}

          <CompetitionBlock view={view} />

          <MarketplaceKpis
            config={config}
            view={view}
            masked={masked}
            onEditObjective={canEdit ? () => edit('objective') : undefined}
            onEditCommission={canEdit ? () => edit('commission') : undefined}
          />

          {view.skus.length > 0 || view.skuInternal ? (
            <View style={styles.identifiers}>
              {view.skus.map((sku, index) => (
                <InfoRow
                  key={`${sku}-${index}`}
                  label={skuLabel(config, index)}
                  value={sku}
                  mono
                  copyLabel={skuLabel(config, index)}
                />
              ))}
              {view.skuInternal ? (
                <InfoRow label="SKU interne" value={view.skuInternal} mono copyLabel="SKU interne" />
              ) : null}
            </View>
          ) : null}

          {view.productUrl ? (
            <Button
              label={`Voir sur ${config.label}`}
              variant="outline"
              leadingIcon={<ExternalLink size={16} color={t.accentText} />}
              onPress={() => void openExternalUrl(view.productUrl ?? '')}
            />
          ) : null}

          {hasNoOffer ? (
            <Pressable onPress={() => setExpanded(false)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Réduire</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { padding: spacing.lg, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleWrap: { flex: 1, gap: spacing.xs },
  title: { fontSize: fontSize.base, fontWeight: '800', color: t.text },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  menuButton: {
    width: hitTarget,
    height: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.5 },
  countries: { gap: spacing.sm },
  compact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { fontSize: fontSize.sm, color: t.textSubtle },
  link: { fontSize: fontSize.sm, fontWeight: '700', color: t.accentText },
  body: { gap: spacing.lg },
  dimmed: { opacity: 0.55 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: spacing.xl },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.textSubtle,
  },
  price: { fontSize: fontSize['2xl'], fontWeight: '800', color: t.text },
  shippingWrap: { gap: 2 },
  shipping: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  identifiers: { gap: spacing.md },
}));
