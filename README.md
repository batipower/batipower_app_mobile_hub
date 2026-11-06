# Batipower Pro — application mobile

Application mobile (React Native / Expo) du logiciel Batipower, pendant de
`front_externe_batipower`. Première cible : **iPhone**, module **HUB**. La structure
est prête pour accueillir les autres modules (PARTNER, MARQUE, ADMIN, POWER).

État actuel : connexion (email + mot de passe, vérification 2FA par email), session
persistante, onglets HUB (Accueil placeholder, Profil / déconnexion).

## Stack

| Domaine       | Choix                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| Framework     | Expo SDK 58, React Native 0.88, React 19, nouvelle architecture           |
| Navigation    | Expo Router (`src/app`), routes typées, `Stack.Protected`, onglets natifs |
| Données       | TanStack Query, client `fetch` maison (Bearer + refresh automatique)      |
| Formulaires   | react-hook-form + zod                                                     |
| Stockage      | `expo-secure-store` (Keychain iOS) pour les tokens                        |
| UI            | `StyleSheet` + design tokens typés (`src/theme`), `expo-blur`             |
| Notifications | `sonner-native`                                                           |

> `AGENTS.md` rappelle de consulter la documentation versionnée
> (<https://docs.expo.dev/versions/v58.0.0/>) avant toute modification liée à Expo.

## Démarrage rapide (Expo Go sur iPhone)

1. Installer **Expo Go** depuis l'App Store sur l'iPhone.
2. Installer les dépendances : `npm install`.
3. Lancer : `npm start` (ou `npm run start:tunnel` si le Mac et l'iPhone ne sont pas
   sur le même réseau Wi-Fi, ou si le réseau bloque la découverte locale).
4. Scanner le QR code avec l'appareil photo de l'iPhone, qui ouvre Expo Go.

Par défaut l'app appelle l'API de production. Pour viser un back local :

```bash
cp .env.example .env
# puis dans .env : EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN-du-Mac>:3000
```

`localhost` ne fonctionne pas depuis le téléphone : il faut l'IP LAN du Mac. Après
modification du `.env`, relancer Expo avec `npx expo start -c`.

Limites d'Expo Go : pas de build natif personnalisé, et le bundle id / scheme de
l'app ne sont pas ceux de `app.config.ts`. Pour tester comme une vraie app, voir
« Build de développement » plus bas.

## Scripts

| Commande               | Rôle                                               |
| ---------------------- | -------------------------------------------------- |
| `npm start`            | Serveur Metro / Expo                               |
| `npm run start:tunnel` | Idem, via un tunnel (réseaux différents)           |
| `npm run ios`          | Ouvre le simulateur iOS (nécessite Xcode complet)  |
| `npm run typecheck`    | `tsc --noEmit`                                     |
| `npm run lint`         | ESLint (config Expo + Prettier)                    |
| `npm run format`       | Prettier                                           |
| `npm run doctor`       | `expo-doctor` (cohérence des dépendances / config) |

## Structure

```
src/
├── app/                      Routes Expo Router
│   ├── _layout.tsx           Providers + garde de navigation (Stack.Protected)
│   ├── index.tsx             Aiguillage (loading / login / module d'atterrissage)
│   ├── unreachable.tsx       Back injoignable au démarrage (réessayer / se déconnecter)
│   ├── (auth)/               login, verify-2fa  (visibles si déconnecté)
│   └── (app)/                Visibles si connecté
│       ├── hub/              Onglets natifs : Accueil, Profil  → /hub
│       └── module-indisponible.tsx
├── api/                      client.ts (fetch, refresh), auth.ts, queryClient.ts
├── auth/                     AuthProvider (état de session), tokenStorage (SecureStore)
├── components/ui/            Button, TextField, OtpInput, Card, Screen
├── components/auth/          Fond animé et logo de l'écran de connexion
├── modules/                  registry.ts (modules + routes), roles.ts
├── theme/                    colors, spacing, typography
├── config/env.ts             Variables EXPO_PUBLIC_* validées (zod)
├── lib/openWeb.ts            Ouvre une page du site web dans le navigateur intégré
└── types/                    Types partagés (CurrentUser…)
```

### Ajouter un module

1. Dans `src/modules/registry.ts`, passer `mobileEnabled: true` et renseigner la
   `route` du module.
2. Créer le dossier de routes correspondant sous `src/app/(app)/<module>/`, avec son
   `_layout.tsx` (onglets ou pile).
3. `getLandingHref(user)` choisit le module d'atterrissage après connexion selon les
   modules accessibles à l'utilisateur ; un module non activé mène à
   `/module-indisponible`.

## Authentification

L'app appelle directement le back NestJS (`/buyer-app/*`), sans passer par le BFF du
front web : pas de cookies, pas de Turnstile, les tokens sont envoyés en Bearer.

| Étape          | Route                              | Remarque                                                                               |
| -------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| Connexion      | `POST /buyer-app/auth/login`       | 3 réponses possibles : 2FA requise, session directe, changement de mot de passe requis |
| Code 2FA       | `POST /buyer-app/auth/verify-code` | `{ tempToken, code }`                                                                  |
| Renvoi du code | `POST /buyer-app/auth/resend-code` | Retourne un **nouveau** `tempToken` qui remplace l'ancien                              |
| Refresh        | `POST /buyer-app/auth/refresh`     | Ne renvoie qu'un `accessToken` ; le refresh token n'est pas renouvelé                  |
| Profil         | `GET /buyer-app/me`                | Restauration de session au démarrage                                                   |
| Déconnexion    | `POST /buyer-app/auth/logout`      | Au mieux côté serveur, puis purge locale quoi qu'il arrive                             |

Comportements à connaître :

- Le refresh est **mutualisé** : plusieurs requêtes en 401 simultanées ne déclenchent
  qu'un seul appel de refresh.
- La session n'est purgée que si le refresh répond 401/403. Une erreur réseau ou 5xx
  conserve la session (l'écran « back injoignable » propose de réessayer).
- Le `tempToken` 2FA vit uniquement en mémoire (jamais persisté ; durée de vie 5 min).
- Les messages d'erreur du back ne sont pas accentués ; l'app affiche ceux du back
  tels quels, sauf 429 et 5xx qui ont un message dédié.

## Réglages à effectuer (Expo, EAS, Apple)

Le compte Apple Developer est déjà disponible. Le Mac n'a pas besoin de Xcode complet :
Expo Go et les builds EAS (dans le cloud) ne l'exigent pas.

### 1. Compte Expo et EAS

```bash
npm i -g eas-cli        # ou : npx eas-cli@latest <commande>
eas login
eas init                # crée le projet EAS et renseigne extra.eas.projectId
```

Si `eas init` n'écrit pas l'identifiant dans `app.json`, l'ajouter à la main :
`expo.extra.eas.projectId`. Créer idéalement une **organisation Expo** Batipower
plutôt qu'un compte personnel, pour partager le projet.

### 2. Identité de l'app

`app.config.ts` génère trois variantes selon `APP_VARIANT` (positionné par `eas.json`) :

| Variante    | Nom                     | Bundle id                  |
| ----------- | ----------------------- | -------------------------- |
| development | Batipower Pro (Dev)     | `fr.batipower.hub.dev`     |
| preview     | Batipower Pro (Preview) | `fr.batipower.hub.preview` |
| production  | Batipower Pro           | `fr.batipower.hub`         |

Les variantes s'installent côte à côte sur le même iPhone. EAS crée les identifiants
(App ID, certificats, profils) dans le compte Apple Developer lors du premier build
(`eas build` demande les identifiants Apple, ou une clé API App Store Connect).
`ios.config.usesNonExemptEncryption` est déjà à `false` (pas de question de conformité
export à chaque envoi). Si le bundle id `fr.batipower.hub` doit changer, le modifier
dans `app.config.ts` **avant** le premier build : il ne peut plus être changé ensuite
dans App Store Connect.

### 3. Build de développement (installation sur l'iPhone)

Plus proche d'une vraie app qu'Expo Go (vrai bundle id, scheme, icône). Prérequis :
ajouter le client de développement.

```bash
npx expo install expo-dev-client
eas device:create                                   # enregistre l'iPhone (UDID) via un lien/QR
# iPhone : Réglages > Confidentialité et sécurité > Mode développeur : activer, redémarrer
eas build --profile development --platform ios      # build dans le cloud, ~15 min
npx expo start --dev-client                         # puis ouvrir l'app installée
```

### 4. TestFlight (distribution à l'équipe)

1. Dans App Store Connect, créer l'app « Batipower Pro » avec le bundle id
   `fr.batipower.hub`.
2. `eas build --profile production --platform ios` (`autoIncrement` gère le numéro de
   build, `appVersionSource: remote`).
3. `eas submit --platform ios` : envoi vers App Store Connect. Une **clé API App Store
   Connect** (rôle App Manager) évite les authentifications interactives et les codes 2FA
   Apple.
4. Ajouter des testeurs internes dans TestFlight (jusqu'à 100, sans revue Apple).

### 5. Variables d'environnement en build EAS

Le `.env` n'est pas versionné et n'est pas envoyé à EAS. Sans configuration, l'app
utilise les valeurs par défaut de `src/config/env.ts` (production). Pour surcharger sur
un profil, ajouter la variable dans `env` du profil de `eas.json`, ou utiliser les
variables d'environnement EAS (`eas env:create`). Elles sont publiques : aucun secret.

## Points d'attention

- **Durée de session** : le refresh token vit 24 h (valeur codée en dur dans
  `external-auth.service.ts` côté back), l'utilisateur doit donc se reconnecter
  (avec 2FA) au moins une fois par jour. Une durée plus longue pour le mobile demande
  une évolution du back.
- **Session unique avec la 2FA** : côté back, `verify-code` supprime **tous** les
  refresh tokens de l'utilisateur. Une connexion mobile avec 2FA déconnecte donc le web
  (à la prochaine expiration de l'access token, 2 h), et inversement. Ce cas est absent
  du chemin `twoFactorSkipped`.
- **Changement de mot de passe obligatoire** : non géré dans l'app. L'utilisateur est
  invité à passer par le site web, et la session ouverte pour l'occasion est révoquée.
- **Turnstile** : non utilisé sur mobile. Le back reste protégé par son throttling
  (connexion 5 req/min, renvoi du code 3 req/min) et son verrouillage de compte.
- **URL du site web** : `EXPO_PUBLIC_WEB_URL` (défaut `https://app.batipower.fr`, repris
  du fallback du back). À vérifier : c'est la cible des liens « Mot de passe oublié » et
  « Demander un accès ».
- **Logo** : `assets/logo-batipower.png` vient du front en 256 px, agrandi pour l'icône
  1024 px. Fournir le logo en haute définition ou vectoriel avant la publication, car
  Apple exige une icône nette.
- **Contraste** : le texte blanc sur le bouton vert reprend l'identité du site web. Le
  contraste est limité ; à rediscuter avec le design si l'accessibilité devient un
  critère.
- **Mode sombre uniquement** (`userInterfaceStyle: dark`), comme l'écran de connexion
  du web.
- `.claude/settings.json` et `AGENTS.md` viennent du modèle Expo et sont conservés.
