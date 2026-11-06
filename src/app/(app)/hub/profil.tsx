import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { ModuleBadge } from '@/components/modules/ModuleBadge';
import { Button, Card } from '@/components/ui';
import { accessibleModules } from '@/modules/registry';
import { roleLabel } from '@/modules/roles';
import { colors, fontSize, onDark, radius, spacing, typography, withAlpha } from '@/theme';

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
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [loggingOut, setLoggingOut] = useState(false);
  if (!user) return null;

  const modules = accessibleModules(user);
  const lastLogin = formatDateTime(user.lastLoginAt);
  const warehouse = user.distributorWarehouse?.name ?? user.warehouse;
  const version = Constants.expoConfig?.version ?? '—';
  const appName = Constants.expoConfig?.name ?? 'Batipower Pro';

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
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing['2xl'] }]}
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

      <Button
        label="Se déconnecter"
        variant="ghost"
        destructive
        loading={loggingOut}
        onPress={confirmLogout}
        leadingIcon={<LogOut size={16} color={colors.danger} />}
        style={styles.logout}
      />

      <Text style={styles.version}>
        {appName} · version {version}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.black },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing['4xl'], gap: spacing['2xl'] },
  identity: { alignItems: 'center', gap: spacing.xs },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    backgroundColor: withAlpha(colors.green, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(colors.green, 0.3),
  },
  avatarText: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.green },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.white, textAlign: 'center' },
  email: { fontSize: fontSize.sm, color: onDark.textSubtle },
  rows: { gap: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  rowLabel: { ...typography.label, color: onDark.textSubtle },
  rowValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: fontSize.sm,
    color: colors.white,
  },
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  logout: { borderWidth: 1, borderColor: withAlpha(colors.danger, 0.3) },
  version: { ...typography.caption, color: onDark.textFaint, textAlign: 'center' },
});
