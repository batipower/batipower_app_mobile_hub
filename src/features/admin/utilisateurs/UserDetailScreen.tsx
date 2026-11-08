import { Alert, ScrollView, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Lock, Palmtree, Pencil, Power, UserX } from 'lucide-react-native';

import { Badge, Button, DetailSection, InfoRow } from '@/components/ui';
import { EmptyState, ErrorBanner, ListSkeleton } from '@/features/preparation/components/ListState';
import { formatDateTime } from '@/lib/format';
import { MODULES } from '@/modules/registry';
import { roleLabel } from '@/modules/roles';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { AdminUser } from '@/types/admin';

import { categoryLabel, effectiveModules } from '../shared/accessRules';
import { Notice } from '../shared/components/FormParts';
import { useAdminUser, useUserQuickActions, useVacationMode } from './hooks/useAdminUsers';
import { canToggleUserVacation, isUnassignedPartner, userWarehouseView } from './userHelpers';

/** Fiche d'un compte : informations, accès, état de sécurité et actions rapides. */
export function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const { user, isLoading, error, refetch } = useAdminUser(id);

  return (
    <>
      <Stack.Screen options={{ title: user?.name ?? 'Utilisateur' }} />
      {user ? (
        <UserDetail user={user} />
      ) : isLoading ? (
        <View style={{ padding: spacing.xl }}>
          <ListSkeleton rows={3} height={140} />
        </View>
      ) : error ? (
        <View style={{ padding: spacing.xl }}>
          <ErrorBanner error={error} fallback="Impossible de charger l'utilisateur" onRetry={() => void refetch()} />
        </View>
      ) : (
        <View style={{ padding: spacing.xl }}>
          <EmptyState
            icon={<UserX size={24} color={t.textMuted} />}
            title="Utilisateur introuvable"
            text="Ce compte n'existe plus ou a été supprimé."
          />
        </View>
      )}
    </>
  );
}

function UserDetail({ user }: { user: AdminUser }) {
  const styles = useStyles();
  const t = useTheme();
  const { update, unlock } = useUserQuickActions();
  const vacationConfig = useVacationMode();
  const warehouse = userWarehouseView(user);
  const modules = effectiveModules(user.modules);
  const busy = update.isPending || unlock.isPending;
  const manualVacation = (vacationConfig.data?.mode ?? 'MANUAL') === 'MANUAL';

  const toggleActive = () => {
    const next = !user.isActive;
    const run = () =>
      update.mutate({
        id: user.id,
        data: { isActive: next },
        message: next ? 'Compte activé' : 'Compte désactivé',
      });
    if (next) {
      run();
      return;
    }
    Alert.alert(
      'Désactiver ce compte ?',
      `${user.name} ne pourra plus se connecter tant que le compte reste inactif.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Désactiver', style: 'destructive', onPress: run },
      ],
    );
  };

  const toggleVacation = () =>
    update.mutate({
      id: user.id,
      data: { isOnVacation: !user.isOnVacation },
      message: user.isOnVacation ? 'Retiré des vacances' : 'Mis en vacances',
    });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email} selectable>
          {user.email}
        </Text>
        <View style={styles.badges}>
          <Badge label={roleLabel(user.role)} tone="blue" />
          <Badge label={user.isActive ? 'Actif' : 'Inactif'} tone={user.isActive ? 'green' : 'red'} />
          {user.twoFactorEnabled ? <Badge label="2FA" tone="green" /> : null}
          {user.mustChangePassword ? <Badge label="Mot de passe à changer" tone="amber" /> : null}
          {user.isOnVacation ? <Badge label="En vacances" tone="amber" /> : null}
        </View>
      </View>

      {isUnassignedPartner(user) ? (
        <Notice tone="warning">
          Ce compte partenaire n’est rattaché à aucune filiale : modifiez-le pour en choisir une.
        </Notice>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Modifier"
          leadingIcon={<Pencil size={16} color={t.onAccent} />}
          onPress={() =>
            router.push({ pathname: '/admin/utilisateurs/edition', params: { id: user.id } })
          }
        />
        <Button
          variant="outline"
          label={user.isActive ? 'Désactiver le compte' : 'Activer le compte'}
          destructive={user.isActive}
          disabled={busy}
          leadingIcon={<Power size={16} color={user.isActive ? t.danger : t.accentText} />}
          onPress={toggleActive}
        />
        {canToggleUserVacation(user) && manualVacation ? (
          <Button
            variant="outline"
            label={user.isOnVacation ? 'Retirer des vacances' : 'Mettre en vacances'}
            disabled={busy}
            leadingIcon={<Palmtree size={16} color={t.accentText} />}
            onPress={toggleVacation}
          />
        ) : null}
        <Button
          variant="outline"
          label="Débloquer le compte"
          loading={unlock.isPending}
          disabled={busy}
          leadingIcon={<Lock size={16} color={t.accentText} />}
          onPress={() => unlock.mutate(user.id)}
        />
      </View>

      <DetailSection title="Accès">
        <InfoRow label="Rôle" value={roleLabel(user.role)} />
        <InfoRow
          label="Modules"
          value={user.role === 'SUPERADMIN' ? 'Tous' : modules.map((m) => MODULES[m].name).join(', ') || '—'}
        />
        {user.role !== 'SUPERADMIN' ? (
          <InfoRow label="Module par défaut" value={MODULES[user.defaultModule]?.name ?? '—'} />
        ) : null}
        {user.brands && user.brands.length > 0 ? (
          <InfoRow
            label="Marques"
            value={`${user.brands.join(', ')}${user.brandPlan ? ` (${user.brandPlan === 'PREMIUM' ? 'Premium' : 'Essentiel'})` : ''}`}
          />
        ) : null}
        <InfoRow label="Code acheteur" value={user.code ?? '—'} mono={!!user.code} />
        <InfoRow
          label="Catégories"
          value={user.categoryTypes.length ? user.categoryTypes.map(categoryLabel).join(', ') : '—'}
        />
      </DetailSection>

      <DetailSection title="Rattachement">
        <InfoRow
          label="Entrepôt"
          value={warehouse ? `${warehouse.label}${warehouse.derived ? ' (déduit de la filiale)' : ''}` : '—'}
        />
        <InfoRow label="Distributeur" value={user.partnerDistributor?.name ?? '—'} />
        <InfoRow label="Filiale" value={user.subsidiary?.name ?? '—'} />
      </DetailSection>

      <DetailSection title="Sécurité et droits">
        <InfoRow label="Double authentification" value={user.twoFactorEnabled ? 'Activée' : 'Désactivée'} />
        <InfoRow label="Mot de passe à changer" value={user.mustChangePassword ? 'Oui' : 'Non'} />
        <InfoRow label="Export négo" value={user.canExportNego ? 'Autorisé' : 'Interdit'} />
        {user.role === 'MANAGER' ? (
          <InfoRow label="Accès Comptabilité" value={user.canAccessAccounting ? 'Oui' : 'Non'} />
        ) : null}
        {user.role === 'SUPERADMIN' ? (
          <InfoRow label="Agent PRISM" value={user.prismEnabled ? 'Activé' : 'Désactivé'} />
        ) : null}
      </DetailSection>

      <DetailSection title="Historique">
        <InfoRow label="Dernière connexion" value={formatDateTime(user.lastLoginAt) ?? 'Jamais'} />
        <InfoRow label="Créé le" value={formatDateTime(user.createdAt) ?? '—'} />
      </DetailSection>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: spacing.xl, paddingBottom: 160, gap: spacing.xl },
  hero: { gap: spacing.xs },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: t.text },
  email: { fontSize: fontSize.sm, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  actions: { gap: spacing.sm },
}));
