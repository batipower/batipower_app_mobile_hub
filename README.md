# Batipower Pro — application mobile

Application mobile (React Native / Expo) du logiciel Batipower, pendant de
`front_externe_batipower`. Première cible : **iPhone**, module **HUB**. La structure
accueille aujourd'hui les modules HUB, ADMIN et PARTNER ; MARQUE et POWER restent à venir.

État actuel : connexion (email + mot de passe, vérification 2FA par email), session
persistante, onglets HUB : **Préparation** (consultation des commandes à préparer et
des articles à récupérer en agence), **Recherche** (commandes et produits, en lecture
seule), Profil / déconnexion, et un **sélecteur de module** accessible depuis chaque
écran racine.

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

| Commande                  | Rôle                                               |
| ------------------------- | -------------------------------------------------- |
| `npm start`               | Serveur Metro / Expo                               |
| `npm run start:tunnel`    | Idem, via un tunnel (réseaux différents)           |
| `npm run ios`             | Ouvre le simulateur iOS (nécessite Xcode complet)  |
| `npm run typecheck`       | `tsc --noEmit`                                     |
| `npm run lint`            | ESLint (config Expo + Prettier)                    |
| `npm run format`          | Prettier                                           |
| `npm run doctor`          | `expo-doctor` (cohérence des dépendances / config) |
| `npm run build:ios`       | Build iOS de production (EAS, dans le cloud)       |
| `npm run submit:ios`      | Envoie le dernier build à TestFlight (EAS Submit)  |
| `npm run credentials:ios` | Gère les identifiants Apple dans EAS               |

## Structure

```
src/
├── app/                      Routes Expo Router
│   ├── _layout.tsx           Providers + garde de navigation (Stack.Protected)
│   ├── index.tsx             Aiguillage (loading / login / module d'atterrissage)
│   ├── unreachable.tsx       Back injoignable au démarrage (réessayer / se déconnecter)
│   ├── (auth)/               login, verify-2fa  (visibles si déconnecté)
│   └── (app)/                Visibles si connecté
│       ├── switch-module.tsx Feuille de sélection du module (formSheet)
│       ├── modules/[id].tsx  « Bientôt disponible » pour un module pas encore sur mobile
│       └── hub/              Onglets natifs : Préparation, Recherche, Profil
│           ├── preparation/  Pile de l'onglet : index (liste) + [reference] (détail)
│           └── recherche/    Pile de l'onglet : index (recherche), commandes (liste),
│                             commande/[reference], produit/[reference]
├── api/                      client.ts (fetch, refresh, annulation), auth.ts, preparation.ts,
│                             hubOrders.ts, hubProducts.ts, searchHistory.ts, queryClient.ts
├── auth/                     AuthProvider (état de session), tokenStorage (SecureStore),
│                             permissions.ts (accès par rôle)
├── components/ui/            Button, TextField, OtpInput, Card, Badge, DetailSection / InfoRow, Screen
├── components/auth/          Fond animé et logo de l'écran de connexion
├── components/modules/       ModuleSwitcherButton (pastille du module + chevron)
├── features/preparation/     Hooks, helpers et composants de la préparation HUB
├── features/search/          Recherche unifiée : écran, hooks (débounce, historique), navigation
├── features/orders/          Liste paginée, fiche commande, libellés portés du web
├── features/products/        Fiche produit (en-tête + stock), affichage des agences
├── modules/                  registry.ts (modules + écran d'accueil), switchModule.ts, roles.ts
├── features/profile/         Sélecteur d'apparence (Sombre / Clair / Auto)
├── theme/                    colors, spacing, typography, palettes clair / sombre,
│                             ThemeProvider (useTheme, makeStyles), préférence persistée
├── config/env.ts             Variables EXPO_PUBLIC_* validées (zod)
├── lib/                      openWeb (navigateur intégré), format (dates, montants),
│                             clipboard (copie + toast), contact (appel, email)
└── types/                    Types partagés (CurrentUser, préparation, commandes, produits…)
```

## Recherche (module HUB)

Onglet **Recherche** du HUB (bouton séparé en Liquid Glass sur iOS 26), pendant mobile de
la recherche du web (`HubSearchBar`), en **lecture seule**. Ouvert à tout compte qui
possède le module HUB ; les produits ne le sont qu'aux rôles `SUPERADMIN` et `MANAGER`
(`canAccessHubProductSheet`, même règle que le back sur `hub-app/products/*`).

- **Saisie** : barre de recherche native du titre. Recherche dès 2 caractères, avec un
  délai de 120 ms pour un code collé ou scanné (8 caractères et plus), 250 ms sinon.
  Les requêtes en cours sont annulées dès que la saisie change.
- **Résultats** : commandes (référence, référence eBat, téléphone, n° de suivi, email, nom)
  fusionnées avec celles qui contiennent la référence produit, puis produits (référence,
  EAN, SKU, désignation). « Voir les N commandes » ouvre la liste complète à défilement
  infini. La recherche par produit est sautée pour une référence `BATPWR…` ou quand une
  commande porte déjà exactement cette référence (comme le web).
- **Historique** : partagé avec le web (`hub-app/search-history`). Il s'affiche quand la
  saisie est vide et s'efface après confirmation. Les entrées d'un type non autorisé
  (produit pour un non-Manager, analyseur) sont masquées.
- **Fiche commande** (`recherche/commande/[reference]`) : identité et statuts, demande
  d'annulation, client et adresse (appel et email en un toucher), articles, montants HT /
  TTC, mode de paiement, expédition (suivi transporteur cliquable), commandes liées,
  retours et litiges. Les références et n° de suivi se copient d'un appui long.
- **Fiche produit** (`recherche/produit/[reference]`, `SUPERADMIN` / `MANAGER`) : vignette,
  désignation, codes, drapeaux, ventes 7 / 30 jours, stock par entrepôt et par agence
  (inventaires périmés signalés), commandes fournisseur de la semaine, et lien vers les
  commandes qui contiennent le produit.

Aucune donnée financière interne (prix d'achat, marges) n'est typée ni affichée : le back
les renvoie à un `SUPERADMIN`, l'app les ignore volontairement.

| Donnée                 | Route back                                                     |
| ---------------------- | -------------------------------------------------------------- |
| Recherche commandes    | `GET /hub-app/orders/search-sav`                               |
| Commandes d'un produit | `GET /hub-app/orders/search-by-product-reference`              |
| Fiche commande         | `GET /hub-app/orders/logistics-detail/:reference`              |
| Recherche produits     | `GET /hub-app/products/search`                                 |
| Fiche produit          | `GET /hub-app/products/:reference` et `GET …/:reference/stock` |
| Historique             | `GET`, `POST`, `DELETE /hub-app/search-history`                |

## Modules et sélecteur

Chaque écran racine d'un module affiche en haut à droite la pastille du module actif
(`ModuleSwitcherButton`), qui ouvre la feuille `switch-module` : un module par ligne
(icône, nom, accroche, coche sur l'actif, badge « Bientôt » s'il n'est pas encore sur
mobile). Le profil propose aussi « Changer de module ». La pastille et la ligne sont
masquées si le compte n'a qu'un seul module.

- La feuille liste **tous les modules du compte** (`accessibleModules`), même ceux qui ne
  sont pas encore disponibles sur mobile : ils mènent à `modules/[id]` (« bientôt
  disponible », avec ouverture du web, retour au module actif et déconnexion). Passer d'un
  module à l'autre n'empile pas d'historique (`dismissAll` puis `replace`).
- Le HUB garde l'accès : un compte sans le module HUB est redirigé vers son module
  d'atterrissage (`getLandingHref`).
- L'écran d'accueil d'un module dépend du rôle (`landing` dans le registre) : pour le HUB,
  la préparation pour `SUPERADMIN` / `MANAGER`, la recherche pour les autres comptes.

## Préparation (module HUB)

Pendant mobile de `/hub/preparation-batipower` du front web, en **consultation seule**
et réservé aux rôles `SUPERADMIN` et `MANAGER` (`canAccessHubPreparation`).

- **À préparer** : commandes du QG, avec filtres (Toutes, En stock QG, Attente livreur,
  Non affecté), recherche locale (référence, client, ville), badges de tags et
  volumétrie (pièces, colis, poids, transporteur). Un appui ouvre le détail.
- **En agence** : articles à récupérer en agence proche, regroupés par agence
  (quantité, référence, désignation) avec les totaux.
- **Détail** : lu dans la liste déjà chargée (même clé de cache TanStack), sans appel
  dédié. Si la commande a disparu de la liste (préparée entre-temps) : « introuvable ».

| Donnée          | Route back                                         |
| --------------- | -------------------------------------------------- |
| Commandes       | `GET /hub-app/orders/preparation?scope=to-prepare` |
| Synthèse agence | `GET /hub-app/orders/preparation/drivers-tour`     |

Comportements à connaître :

- Rafraîchissement automatique toutes les 30 s (commandes) et 60 s (agences), **uniquement
  quand l'écran est affiché**, et suspendu en arrière-plan (`focusManager` branché sur
  `AppState`). Tirer pour rafraîchir est disponible partout, et l'app recharge les
  données périmées à son retour au premier plan.
- Les règles de classement (tag `AGENCE PROCHE` = attente livreur, absence de `STOCK_QG`
  = non affecté) sont portées de `lib/hub/preparation/order-helpers.ts` : à garder
  synchronisées avec le web.
- Hors périmètre de cette V1 : scan douchette, impression d'étiquettes, bons de livraison,
  transferts d'entrepôt (Flévy / Dombasle), onglet Expédiés, miniatures produit.
- Pas de route `/hub` seule : le module s'ouvre directement sur `/hub/preparation`
  (`NativeTabs` ne gère que les routes déclarées par un onglet).

## Partenaires (module PARTNER)

Pendant mobile des pages principales du module PARTNER du front web, en **consultation avec
actions simples** (le reste se fait sur l'espace web). Quatre onglets
(`src/app/(app)/partner/(tabs)`), chacun visible selon le rôle et le périmètre du compte
(`partnerTabsFor` dans `auth/permissions.ts`, à garder synchronisé avec le web) :

- **Produits** (ACHETEUR, CHEF_SERVICE, RA, RAR, RESPONSABLE_PLATEFORME, RESPONSABLE, SUPERADMIN) :
  catalogue **Standard** (couverture, criticité, messages) et **DEP** (déstockage), filtres
  (marque, criticité, réponse attendue, entrepôt DEP), fiche en lecture et fil de messages.
  Un compte avec `productsCatalogAccess === false` n'a que la liste DEP.
- **Opportunités** (RA, RAR, SUPERADMIN) : Standard et DEP, puces de statut avec compteurs,
  filtres (marque, non lues), fiche (prix, propositions, notes), marquage **traitée / rouverte**
  et **non lue**, lecture automatique à l'ouverture, fil de messages. Pas de proposition de prix.
  Après la négociation, l'envoi est fermé aux RA / RAR (règle du back).
- **Inter-agences** (rôles des Produits, hors compte « DEP uniquement ») : commandes confirmées
  par la logistique, statut (à traiter, réalisée, impossible), filtres (mes commandes, entrepôt),
  actions **réalisée** (agences prévenues + n° inter-agence), **pré-réception** et **impossible
  d'honorer** (motif, alerte HUB), fils logistique et HUB.
- **BL à corriger** (RA, RAR, SUPERADMIN) : lignes en écart de prix, vues À traiter / Traités avec
  barre de progression, filtre marque, fiche du BL (lignes, totaux), **traiter / rouvrir**, fil
  de messages. Ni PDF ni contrôle des BL traités sur mobile.

Un compte « DEP uniquement » (`opportunityOpenAccess === false`) arrive sur les opportunités DEP et
n'a pas les inter-agences. Le menu central (éclair) donne accès au profil et à l'espace web. Les
pastilles des onglets (messages produit à traiter, opportunités à traiter, BL à traiter) sont
recalées chaque minute.

Code dans `src/features/partner/*` (un dossier par onglet, composants communs dans `shared/` :
liste paginée, fil de discussion, feuilles de filtres), appels dans `src/api/partner*.ts` et
clés de cache dans `features/partner/queryKeys.ts`. Les filtres de chaque liste sont un petit store
de module, remis à zéro à la déconnexion (`features/partner/state.ts`). Les opportunités utilisent
des puces de statut comme le web plutôt qu'un simple « À traiter / Traitées » : « traitée » n'existe
que dans le statut « Ouvertes ».

## Administration (module ADMIN)

Pendant mobile des pages d'administration du front web, réservé aux `SUPERADMIN`
(`canAccessAdmin`, masqué pendant une impersonation). Quatre onglets (`src/app/(app)/admin/(tabs)`) :

- **Utilisateurs** : liste, filtres (rôle, entrepôt, filiale, catégories), fiche, actions
  rapides, création / modification et mode vacances. Le menu du module donne aussi accès à **Activité**.
- **Inscriptions** : demandes en attente (badge sur l'onglet), feuilles Approuver / Refuser.
- **Distributeurs** : distributeurs, entrepôts, filiales, comptes eBatPro, interrupteurs
  d'affectation, marges (recalcul suivi toutes les secondes) et logos (PNG, JPG, WebP, SVG ≤ 2 Mo).
- **Plateforme** : maintenance, horaires du support, RIB des devis et clés API.

Code dans `src/features/admin/*`, appels dans `src/api/admin*.ts`, clés de cache dans
`features/admin/queryKeys.ts`. Les règles métier partagées (modules, entrepôts, filiales, accès
marque) sont dans `features/admin/shared/accessRules.ts` : à garder synchronisées avec le web.
Points d'attention : la clé API émise à l'approbation n'est affichée qu'une fois (état local de la
feuille, jamais en cache ni dans l'URL) et les comptes eBatPro sont en lecture seule quand le serveur
n'a pas la clé de chiffrement (`encryptionAvailable=false`). Prism n'est pas porté sur mobile.

### Ajouter un module

1. Dans `src/modules/registry.ts`, passer `mobileEnabled: true` et faire pointer
   `landing` vers l'écran d'accueil du module (fonction du rôle de l'utilisateur).
2. Créer le dossier de routes correspondant sous `src/app/(app)/<module>/`, avec son
   `_layout.tsx` (onglets ou pile), et y poser `ModuleSwitcherButton` (prop `active`)
   dans l'en-tête de ses écrans racines.
3. Le sélecteur (`switch-module`) intègre le module sans autre changement. Tant que
   `mobileEnabled` est à `false`, `landing` renvoie vers `/modules/[id]` (« bientôt
   disponible »). `getLandingHref(user)` choisit le module d'atterrissage après connexion
   selon les modules accessibles à l'utilisateur.

## Apparence (sombre / clair)

Le profil propose un sélecteur **Sombre / Clair / Auto** (`features/profile`). « Auto »
suit le réglage de l'iPhone ; le défaut est **Sombre**, l'identité historique de l'app.

- **Palettes** : `src/theme/palettes.ts` définit les jetons sémantiques (`bg`, `card`,
  `text`, `textMuted`, `accent`, `accentText`, `danger`…). Les couleurs de marque ne
  changent pas ; le texte vert passe à `accentText` (vert foncé) en clair, car le vert
  de marque est trop pâle sur fond blanc.
- **Utilisation** : `useTheme()` donne le thème courant, et `makeStyles((t) => ({…}))`
  remplace `StyleSheet.create` pour les styles qui dépendent du thème. Ne pas importer
  `colors` ou `onDark` dans un composant d'écran : ils restent réservés à l'écran de
  connexion et aux palettes.
- **Persistance** : `src/theme/preference.ts` (SecureStore, lecture synchrone au
  démarrage, donc sans flash) puis `Appearance.setColorScheme`. Les éléments natifs
  (barre d'onglets, feuilles, clavier, recherche) suivent automatiquement.
- **Connexion** : `(auth)/_layout.tsx` suit le thème courant (sombre, clair ou auto) ; fond animé, logo et carte `glass` ont une variante claire.

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
3. `npm run submit:ios` : envoi du dernier build vers App Store Connect. Une **clé API App
   Store Connect** (rôle App Manager) évite les authentifications interactives et les
   codes 2FA Apple.
4. Ajouter des testeurs internes dans TestFlight (jusqu'à 100, sans revue Apple).

> **Piège : toujours passer par les scripts `submit:ios` / `credentials:ios`.**
> `APP_VARIANT` est posé par `eas.json` uniquement pendant `eas build`. Un `eas submit` ou
> `eas credentials` lancé « à nu » retombe sur la variante `development` et cherche les
> identifiants pour `fr.batipower.hub.dev` au lieu de `fr.batipower.hub`. Les scripts
> forcent `APP_VARIANT=production`.

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
- **Apparence** : `userInterfaceStyle` vaut `automatic` dans `app.json`, sinon iOS et
  Android bloquent le mode clair. Ce réglage est natif : il demande un nouveau build
  (Expo Go l'ignore). L'écran de connexion et la double authentification restent
  toujours sombres, comme sur le web.
- `.claude/settings.json` et `AGENTS.md` viennent du modèle Expo et sont conservés.
