import { Pressable, Text, View } from 'react-native';
import { MoreHorizontal } from 'lucide-react-native';

import { Badge } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { EbatproAccount } from '@/types/adminPartners';

/** Ligne d'un compte eBatPro : libellé, identifiant, état et dernier test de connexion. */
export function EbatproAccountRow({
  account,
  busy,
  showWarehouse,
  onPress,
}: {
  account: EbatproAccount;
  busy?: boolean;
  showWarehouse?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const t = useTheme();
  const last = formatRelative(account.lastLoginAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Compte ${account.label}`}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.row, (pressed || busy) && { opacity: 0.7 }]}
    >
      <View style={styles.text}>
        <Text style={styles.label}>{account.label}</Text>
        <Text style={styles.sub}>
          {account.login}
          {showWarehouse && account.distributorWarehouseName ? ` · ${account.distributorWarehouseName}` : ''}
        </Text>
        <View style={styles.badges}>
          {account.isDefault ? <Badge label="Par défaut" tone="blue" /> : null}
          <Badge label={account.isActive ? 'Actif' : 'Inactif'} tone={account.isActive ? 'green' : 'neutral'} />
          {!account.hasPassword ? <Badge label="Sans mot de passe" tone="red" /> : null}
          {account.lastLoginStatus ? (
            <Badge
              label={`${account.lastLoginStatus === 'SUCCESS' || account.lastLoginStatus === 'OK' ? 'Connexion OK' : 'Connexion en échec'}${last ? ` · ${last}` : ''}`}
              tone={account.lastLoginStatus === 'SUCCESS' || account.lastLoginStatus === 'OK' ? 'green' : 'red'}
            />
          ) : null}
        </View>
        {account.lastLoginError ? <Text style={styles.error}>{account.lastLoginError}</Text> : null}
      </View>
      <MoreHorizontal size={20} color={t.textSubtle} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: fontSize.base, fontWeight: '700', color: t.text },
  sub: { fontSize: fontSize.xs, color: t.textMuted },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  error: { fontSize: fontSize.xs, color: t.danger },
}));
