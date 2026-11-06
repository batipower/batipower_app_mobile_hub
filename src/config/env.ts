import { z } from 'zod';

/**
 * Variables d'environnement exposées à l'app (préfixe EXPO_PUBLIC_).
 *
 * Metro n'inline que les accès statiques `process.env.EXPO_PUBLIC_XXX` : on ne
 * peut donc pas itérer sur `process.env`, chaque variable est lue explicitement.
 */
const schema = z.object({
  apiBaseUrl: z.url({ message: 'EXPO_PUBLIC_API_BASE_URL doit être une URL valide' }),
  webUrl: z.url({ message: 'EXPO_PUBLIC_WEB_URL doit être une URL valide' }),
});

const parsed = schema.safeParse({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api-bati.batipower.fr',
  webUrl: process.env.EXPO_PUBLIC_WEB_URL || 'https://app.batipower.fr',
});

if (!parsed.success) {
  throw new Error(
    `Configuration invalide :\n${parsed.error.issues.map((i) => `- ${i.message}`).join('\n')}`,
  );
}

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export const env = {
  /** Base du back NestJS, sans slash final (les routes sont sous `/buyer-app`). */
  apiBaseUrl: stripTrailingSlash(parsed.data.apiBaseUrl),
  /** Base du front externe web, sans slash final. */
  webUrl: stripTrailingSlash(parsed.data.webUrl),
} as const;
