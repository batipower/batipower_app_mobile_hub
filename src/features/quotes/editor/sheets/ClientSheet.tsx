import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';

import { listQuoteProspects, listRecentPrestaShopCustomers, searchPrestaShopCustomers } from '@/api/hubCustomerQuotes';
import { SheetScreen, SheetSection } from '@/components/sheet/SheetScreen';
import { Chip, TextField } from '@/components/ui';
import { EmptyState, ErrorBanner } from '@/features/preparation/components/ListState';
import { SearchBar } from '@/features/preparation/components/SearchBar';
import { useDebouncedTerm } from '@/features/search/hooks/useDebouncedTerm';
import { fontSize, hitTarget, makeStyles, spacing, useTheme } from '@/theme';

import { QUOTES_ROOT_KEY } from '../../queryKeys';
import { quoteCustomerName } from '../helpers';
import { useQuoteEditor } from '../QuoteEditorProvider';

/** Client du devis : client PrestaShop (recherche) ou prospect (saisie, ou prospect déjà connu). */
export function ClientSheet() {
  const { state, pickCustomer, pickProspect, setDraft, setClientMode, derived } = useQuoteEditor();
  const styles = useStyles();
  const t = useTheme();
  const [search, setSearch] = useState('');
  const term = useDebouncedTerm(search);
  const editable = !derived.readOnly;
  const ps = state.clientMode === 'prestashop';

  const customers = useQuery({
    queryKey: [...QUOTES_ROOT_KEY, 'ps-customers', term],
    queryFn: () => (term.length >= 2 ? searchPrestaShopCustomers(term, 20) : listRecentPrestaShopCustomers(20)),
    enabled: ps,
    staleTime: 30_000,
  });
  const prospects = useQuery({
    queryKey: [...QUOTES_ROOT_KEY, 'prospects', term],
    queryFn: () => listQuoteProspects({ search: term, limit: 15 }),
    enabled: !ps && term.length >= 2,
    staleTime: 30_000,
  });

  const d = state.draft;

  return (
    <SheetScreen title="Client du devis" closeLabel="OK">
      <View style={styles.row}>
        <Chip label="Client PrestaShop" active={ps} onPress={() => setClientMode('prestashop')} />
        <Chip label="Pas encore client" active={!ps} onPress={() => setClientMode('prospect')} />
      </View>

      {ps ? (
        <SheetSection title={term.length >= 2 ? 'Résultats' : 'Clients récents'}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Nom, société, e-mail…" />
          {state.selectedCustomer ? (
            <View style={styles.selected}>
              <Check size={16} color={t.success} />
              <Text style={styles.selectedText} numberOfLines={2}>
                {quoteCustomerName(state)}
                {state.selectedCustomer.email ? `\n${state.selectedCustomer.email}` : ''}
              </Text>
            </View>
          ) : null}
          {customers.isPending ? <ActivityIndicator color={t.accentText} /> : null}
          {customers.error ? (
            <ErrorBanner error={customers.error} fallback="Recherche impossible" onRetry={() => void customers.refetch()} />
          ) : null}
          {(customers.data ?? []).map((c) => {
            const label = c.company?.trim() || [c.firstname, c.lastname].filter(Boolean).join(' ') || c.email || `#${c.id}`;
            const selected = String(state.selectedCustomer?.id) === String(c.id);
            return (
              <Pressable
                key={String(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => void pickCustomer(c)}
                style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
              >
                <View style={styles.hitText}>
                  <Text style={styles.hitLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={styles.hitSub} numberOfLines={1}>
                    {[c.email, c.city].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {selected ? <Check size={16} color={t.success} /> : null}
              </Pressable>
            );
          })}
          {!customers.isPending && (customers.data?.length ?? 0) === 0 && !customers.error ? (
            <EmptyState icon={null} title="Aucun client" text="Essayez un autre nom, ou passez en « Pas encore client »." />
          ) : null}
        </SheetSection>
      ) : (
        <>
          <SheetSection title="Prospect déjà connu">
            <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un prospect (nom, e-mail)…" />
            {(prospects.data?.data ?? []).map((p) => (
              <Pressable
                key={p.email}
                accessibilityRole="button"
                onPress={() => {
                  void pickProspect(p);
                  setSearch('');
                }}
                style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
              >
                <View style={styles.hitText}>
                  <Text style={styles.hitLabel} numberOfLines={1}>
                    {p.company?.trim() || [p.firstname, p.lastname].filter(Boolean).join(' ') || p.email}
                  </Text>
                  <Text style={styles.hitSub} numberOfLines={1}>
                    {p.email} · {p.quoteCount} devis
                  </Text>
                </View>
              </Pressable>
            ))}
          </SheetSection>
          <SheetSection title="Coordonnées du prospect">
            <TextField label="E-mail *" value={d.email ?? ''} onChangeText={(v) => setDraft({ email: v })} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={editable} />
            <TextField label="Prénom *" value={d.firstname ?? ''} onChangeText={(v) => setDraft({ firstname: v })} autoCapitalize="words" editable={editable} />
            <TextField label="Nom *" value={d.lastname ?? ''} onChangeText={(v) => setDraft({ lastname: v })} autoCapitalize="words" editable={editable} />
            <TextField label="Société" value={d.company ?? ''} onChangeText={(v) => setDraft({ company: v })} editable={editable} />
            <TextField label="Téléphone" value={d.phone ?? ''} onChangeText={(v) => setDraft({ phone: v })} keyboardType="phone-pad" editable={editable} />
            <TextField label="Adresse" value={d.address1 ?? ''} onChangeText={(v) => setDraft({ address1: v })} editable={editable} />
            <View style={styles.row}>
              <View style={styles.postcode}>
                <TextField label="Code postal" value={d.postcode ?? ''} onChangeText={(v) => setDraft({ postcode: v })} keyboardType="number-pad" editable={editable} />
              </View>
              <View style={styles.city}>
                <TextField label="Ville" value={d.city ?? ''} onChangeText={(v) => setDraft({ city: v })} editable={editable} />
              </View>
            </View>
          </SheetSection>
        </>
      )}
    </SheetScreen>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  postcode: { width: 120 },
  city: { flex: 1 },
  selected: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: t.surface,
  },
  selectedText: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
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
  hitText: { flex: 1, gap: 1 },
  hitLabel: { fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  hitSub: { fontSize: fontSize.xs, color: t.textMuted },
}));
