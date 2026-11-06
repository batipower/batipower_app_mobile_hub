import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configuration dynamique d'Expo.
 *
 * Les valeurs communes sont dans `app.json` (c'est aussi là qu'`eas init` écrit
 * `extra.eas.projectId`). Ce fichier ne fait que dériver les variantes
 * development / preview / production, afin qu'elles puissent être installées
 * côte à côte sur le même iPhone (bundle identifier et nom différents).
 *
 * La variante est choisie par `APP_VARIANT`, posée dans les profils de `eas.json`.
 * Sans valeur (ex. `npx expo start` avec Expo Go), on retombe sur `development`.
 */

type AppVariant = 'development' | 'preview' | 'production';

const BASE_BUNDLE_ID = 'fr.batipower.hub';
const BASE_SCHEME = 'batipower-hub';

const VARIANTS: Record<AppVariant, { name: string; suffix: string }> = {
  development: { name: 'Batipower Pro (Dev)', suffix: '.dev' },
  preview: { name: 'Batipower Pro (Preview)', suffix: '.preview' },
  production: { name: 'Batipower Pro', suffix: '' },
};

function resolveVariant(): AppVariant {
  const value = process.env.APP_VARIANT;
  if (value === 'preview' || value === 'production') return value;
  return 'development';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = VARIANTS[resolveVariant()];

  return {
    ...config,
    name: variant.name,
    slug: config.slug ?? 'batipower-hub',
    scheme: `${BASE_SCHEME}${variant.suffix.replace('.', '-')}`,
    ios: {
      ...config.ios,
      bundleIdentifier: `${BASE_BUNDLE_ID}${variant.suffix}`,
    },
  };
};
