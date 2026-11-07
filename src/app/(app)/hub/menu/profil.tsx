import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { toast } from 'sonner-native';
import { ChevronRight, LayoutGrid, LogOut, UserCog } from 'lucide-react-native';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { canImpersonate } from '@/auth/permissions';
import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { Button, Card } from '@/components/ui';
import { openImpersonation } from '@/features/impersonation/navigation';
import { AppearanceSection } from '@/features/profile/components/AppearanceSection';
import { accessibleModules } from '@/modules/registry';
import { roleLabel } from '@/modules/roles';
import { openModuleSwitcher } from '@/modules/switchModule';
import {
  fontSize,
  hitTarget,
  makeStyles,
  radius,
  spacing,
  typography,
  useTheme,
  withAlpha,
} from '@/theme';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]];
  return letters
    .map((part) => part?.charAt(0) ?? '')
    .join('')
    .toUpperCase();
}

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { user, logout, isImpersonating, stopImpersonation } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [stopping, setStopping] = useState(false);
  if (!user) return null;

  const modules = accessibleModules(user);
  const lastLogin = formatDateTime(user.lastLoginAt);
  const warehouse = user.distributorWarehouse?.name ?? user.warehouse;
  const version = Constants.expoConfig?.version ?? '—';
  const appName = Constants.expoConfig?.name ?? 'Batipower Pro';

  const stopImpersonating = () => {
    setStopping(true);
    stopImpersonation()
      .catch((error: unknown) => {
        toast.error(
          error instanceof ApiError ? error.message : 'Impossible de revenir à votre compte.',
        );
      })
      .finally(() => setStopping(false));
  };

  const confirmLogout = () => {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          setLoggingOut(true);
          void logout().finally(() => setLoggingOut(false));
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </View>
        <Text style={styles.name} accessibilityRole="header">
          {user.name}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Card>
        <View style={styles.rows}>
          <InfoRow label="Rôle" value={roleLabel(user.role)} />
          {warehouse ? <InfoRow label="Entrepôt" value={warehouse} /> : null}
          {user.subsidiary ? <InfoRow label="Filiale" value={user.subsidiary.name} /> : null}
          {user.partnerDistributor ? (
            <InfoRow label="Distributeur" value={user.partnerDistributor.name} />
          ) : null}
          {lastLogin ? <InfoRow label="Dernière connexion" value={lastLogin} /> : null}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Modules</Text>
            <View style={styles.badges}>
              {modules.map((id) => (
                <ModuleBadge key={id} module={id} size="sm" />
              ))}
            </View>
          </View>
        </View>
      </Card>

      <AppearanceSection />

      {modules.length > 1 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Changer de module"
          onPress={() => openModuleSwitcher('HUB')}
          style={({ pressed }) => [styles.moduleRow, pressed && styles.moduleRowPressed]}
        >
          <LayoutGrid size={18} color={t.accentText} />
          <Text style={styles.moduleRowLabel}>Changer de module</Text>
          <ChevronRight size={18} color={t.textFaint} />
        </Pressable>
      ) : null}

      {isImpersonating ? (
        <Card style={styles.impersonationCard} contentStyle={styles.impersonationContent}>
          <View style={styles.impersonationHeader}>
            <UserCog size={18} color={t.warning} />
            <Text style={styles.impersonationTitle}>Connecté en tant que {user.name}</Text>
          </View>
          <Text style={styles.impersonationText}>
            {`Vous voyez l'application comme ce compte (${roleLabel(user.role)}). Les données et les onglets sont ceux de son profil.`}
          </Text>
          <Button label="Revenir à mon compte" loading={stopping} onPress={stopImpersonating} />
          <Button label="Changer de compte" variant="ghost" onPress={openImpersonation} />
        </Card>
      ) : canImpersonate(user.role) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Réglages super admin
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Se connecter en tant que"
            accessibilityHint="Choisir un compte pour tester l'application avec son profil"
            onPress={openImpersonation}
            style={({ pressed }) => [styles.moduleRow, pressed && styles.moduleRowPressed]}
          >
            <UserCog size={18} color={t.accentText} />
            <Text style={styles.moduleRowLabel}>Se connecter en tant que…</Text>
            <ChevronRight size={18} color={t.textFaint} />
          </Pressable>
        </View>
      ) : null}

      <Button
        label="Se déconnecter"
        variant="ghost"
        destructive
        loading={loggingOut}
        onPress={confirmLogout}
        leadingIcon={<LogOut size={16} color={t.danger} />}
        style={styles.logout}
      />

      <Text style={styles.version}>
        {appName} · version {version}
      </Text>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  scroll: { flex: 1, backgroundColor: t.bg },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing['2xl'],
  },
  moduleRow: {
    minHeight: hitTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: t.border,
    backgroundColor: t.card,
  },
  moduleRowPressed: { backgroundColor: t.cardPressed },
  moduleRowLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: t.text },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.label, color: t.textSubtle, paddingHorizontal: spacing.xs },
  impersonationCard: { borderColor: withAlpha(t.warning, 0.4) },
  impersonationContent: { padding: spacing.lg, gap: spacing.md },
  impersonationHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  impersonationTitle: { flex: 1, fontSize: fontSize.base, fontWeight: '700', color: t.text },
  impersonationText: { fontSize: fontSize.sm, lineHeight: 20, color: t.textMuted },
  identity: { alignItems: 'center', gap: spacing.xs },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: withAlpha(t.accent, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(t.accent, 0.3),
  },
  avatarText: { fontSize: fontSize['2xl'], fontWeight: '700', color: t.accentText },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: t.text, textAlign: 'center' },
  email: { fontSize: fontSize.sm, color: t.textSubtle },
  rows: { gap: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  rowLabel: { ...typography.label, color: t.textSubtle },
  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: fontSize.sm,
    color: t.text,
  },
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  logout: { borderWidth: 1, borderColor: withAlpha(t.danger, 0.3) },
  version: { ...typography.caption, color: t.textFaint, textAlign: 'center' },
}));
