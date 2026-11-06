import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { getLandingHref } from '@/modules/registry';
import { useTheme } from '@/theme';

/** Ancre de navigation : aiguille vers l'écran qui correspond à l'état de la session. */
export default function Index() {
  const t = useTheme();
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.accentText} />
      </View>
    );
  }
  if (status === 'unreachable') return <Redirect href="/unreachable" />;
  if (status === 'signedIn' && user) return <Redirect href={getLandingHref(user)} />;
  return <Redirect href="/login" />;
}
