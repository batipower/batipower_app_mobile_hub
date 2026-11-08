import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, CheckCircle2, Pencil, Plus } from 'lucide-react-native';
import { toast } from 'sonner-native';

import { adminQuoteBankAccountsApi } from '@/api/adminPlatform';
import { Badge, Button, Card } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton, errorMessage } from '@/features/preparation/components/ListState';
import { SegmentedControl } from '@/features/preparation/components/SegmentedControl';
import { usePullToRefresh } from '@/features/preparation/hooks/usePullToRefresh';
import { formatDateTime } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { QuoteBankAccount, QuoteBankAccountEventAction } from '@/types/adminPlatform';

import { ADMIN_BANK_ACCOUNTS_KEY, ADMIN_BANK_EVENTS_KEY } from '../../queryKeys';
import { useBankAccountEvents, useBankAccounts } from '../hooks';
import { RibPreview } from './RibPreview';

const ACTION_LABELS: Record<QuoteBankAccountEventAction, string> = {
  CREATED: 'Création',
  UPDATED: 'Modification',
  ACTIVATED: 'Activation',
  ARCHIVED: 'Archivage',
  UNARCHIVED: 'Désarchivage',
};

type Tab = 'accounts' | 'history';

/** RIB des devis réglés par virement : RIB actif, liste, activation / archivage et historique. */
export function BankAccountsScreen() {
  const styles = useStyles();
  const t = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('accounts');
  const accounts = useBankAccounts();
  const events = useBankAccountEvents();
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([accounts.refetch(), events.refetch()]);
  });

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_BANK_ACCOUNTS_KEY }),
      queryClient.invalidateQueries({ queryKey: ADMIN_BANK_EVENTS_KEY }),
    ]);

  const activate = useMutation({
    mutationFn: (id: string) => adminQuoteBankAccountsApi.activate(id),
    onSuccess: async () => {
      await refresh();
      toast.success('RIB activé : il sera utilisé pour tous les nouveaux devis par virement.');
    },
    onError: (e) => toast.error(errorMessage(e, "Erreur lors de l'activation")),
  });

  const archive = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      archived ? adminQuoteBankAccountsApi.unarchive(id) : adminQuoteBankAccountsApi.archive(id),
    onSuccess: async (_r, vars) => {
      await refresh();
      toast.success(vars.archived ? 'RIB restauré' : 'RIB archivé');
    },
    onError: (e) => toast.error(errorMessage(e, 'Erreur')),
  });

  const list = accounts.data ?? [];
  const active = list.find((a) => a.isActive) ?? null;
  const busy = activate.isPending || archive.isPending;

  const confirmActivate = (account: QuoteBankAccount) =>
    Alert.alert(
      'Activer ce RIB ?',
      `${account.label} — ${account.iban}\n\nTous les nouveaux devis envoyés par virement (e-mail et PDF) afficheront ce RIB. Les envois déjà effectués ne sont pas modifiés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Activer ce RIB', onPress: () => activate.mutate(account.id) },
      ],
    );

  const confirmArchive = (account: QuoteBankAccount) =>
    Alert.alert('Archiver ce RIB ?', `${account.label} — ${account.iban}`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Archiver', style: 'destructive', onPress: () => archive.mutate({ id: account.id, archived: false }) },
    ]);

  const openForm = (id?: string) =>
    router.push({ pathname: '/admin/plateforme/rib-formulaire', params: id ? { id } : {} });

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Nouveau RIB" hitSlop={8} onPress={() => openForm()}>
              <Plus size={22} color={t.accentText} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.accentText} />}
      >
        <Text style={styles.intro}>
          Coordonnées bancaires communiquées aux clients pour les devis réglés par virement (e-mail et PDF du devis).
        </Text>
        <SegmentedControl<Tab>
          segments={[
            { key: 'accounts', label: 'RIB', count: list.length || undefined },
            { key: 'history', label: 'Historique' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'accounts' ? (
          accounts.isLoading ? (
            <ListSkeleton rows={2} height={120} />
          ) : accounts.error ? (
            <ErrorBanner error={accounts.error} fallback="Impossible de charger les RIB" onRetry={() => void accounts.refetch()} />
          ) : (
            <>
              <View style={styles.block}>
                <Text style={styles.sectionTitle}>RIB actif</Text>
                {active ? (
                  <RibPreview holder={active.holder} iban={active.iban} bic={active.bic} domiciliation={active.domiciliation} />
                ) : (
                  <Text style={styles.warning}>
                    Aucun RIB actif : le RIB de secours intégré à l’application est utilisé. Activez un RIB ci-dessous.
                  </Text>
                )}
              </View>
              <View style={styles.block}>
                <Text style={styles.sectionTitle}>Tous les RIB</Text>
                {list.length === 0 ? (
                  <EmptyState icon={<Plus size={24} color={t.textMuted} />} title="Aucun RIB" text="Aucun RIB enregistré." />
                ) : (
                  list.map((account) => (
                    <Card key={account.id} contentStyle={styles.cardContent}>
                      <View style={styles.badges}>
                        <Text style={styles.name}>{account.label}</Text>
                        {account.isActive ? <Badge label="Actif" tone="green" /> : null}
                        {account.archivedAt ? <Badge label="Archivé" /> : null}
                      </View>
                      <Text style={styles.iban} selectable>
                        {account.iban}
                      </Text>
                      <Text style={styles.sub}>
                        BIC {account.bic} · {account.domiciliation}
                      </Text>
                      <View style={styles.actions}>
                        {!account.isActive ? (
                          <Button
                            label="Activer"
                            disabled={busy}
                            leadingIcon={<CheckCircle2 size={16} color={t.onAccent} />}
                            onPress={() => confirmActivate(account)}
                          />
                        ) : null}
                        <Button
                          variant="outline"
                          label="Modifier"
                          leadingIcon={<Pencil size={16} color={t.accentText} />}
                          onPress={() => openForm(account.id)}
                        />
                        {!account.isActive ? (
                          account.archivedAt ? (
                            <Button
                              variant="ghost"
                              label="Restaurer"
                              disabled={busy}
                              leadingIcon={<ArchiveRestore size={16} color={t.accentText} />}
                              onPress={() => archive.mutate({ id: account.id, archived: true })}
                            />
                          ) : (
                            <Button
                              variant="ghost"
                              label="Archiver"
                              disabled={busy}
                              leadingIcon={<Archive size={16} color={t.accentText} />}
                              onPress={() => confirmArchive(account)}
                            />
                          )
                        ) : null}
                      </View>
                    </Card>
                  ))
                )}
              </View>
            </>
          )
        ) : events.isLoading ? (
          <ListSkeleton rows={3} height={70} />
        ) : events.error ? (
          <ErrorBanner error={events.error} fallback="Impossible de charger l'historique" onRetry={() => void events.refetch()} />
        ) : (events.data ?? []).length === 0 ? (
          <EmptyState icon={<Archive size={24} color={t.textMuted} />} title="Aucun événement" text="Aucun événement enregistré." />
        ) : (
          (events.data ?? []).map((event) => (
            <Card key={event.id} contentStyle={styles.cardContent}>
              <Text style={styles.name}>
                {ACTION_LABELS[event.action] ?? event.action} · {event.bankAccountLabel}
              </Text>
              <Text style={styles.iban}>{event.bankAccountIban}</Text>
              <Text style={styles.sub}>
                {formatDateTime(event.createdAt)}
                {event.actorLabel ? ` · ${event.actorLabel}` : ''}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, paddingBottom: 160, gap: spacing.lg },
  intro: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  block: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', color: t.textSubtle },
  warning: { fontSize: fontSize.sm, lineHeight: 19, color: t.danger },
  cardContent: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  iban: { fontSize: fontSize.sm, color: t.text, fontVariant: ['tabular-nums'] },
  sub: { fontSize: fontSize.xs, color: t.textMuted },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
}));
