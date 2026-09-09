<div align="center">

# MAKOLO

**La plateforme de location de matériel événementiel au Sénégal.**

Louez • Célébrez • Simplement

</div>

---

## Sommaire

1. [Présentation](#1-présentation)
2. [Fonctionnalités](#2-fonctionnalités)
3. [Stack technique](#3-stack-technique)
4. [Architecture](#4-architecture)
5. [Installation](#5-installation)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Mode démonstration](#7-mode-démonstration)
8. [Connexion à Supabase](#8-connexion-à-supabase)
9. [Comptes de démonstration](#9-comptes-de-démonstration)
10. [Sécurité](#10-sécurité)
11. [Build et déploiement](#11-build-et-déploiement)
12. [Périmètre du MVP](#12-périmètre-du-mvp)

---

## 1. Présentation

MAKOLO est une marketplace qui met en relation les organisateurs d'événements et les loueurs
de matériel événementiel au Sénégal : chaises, tables, tentes, sonorisation, éclairage,
décoration et accessoires.

Le parcours est volontairement court :

```
Accueil → Recherche → Catégorie → Annonce → Date → Quantité → Demande → Confirmation → Suivi
```

La plateforme ne gère **ni paiement ni livraison** : elle organise la découverte du matériel,
la vérification de disponibilité et l'échange de la demande de réservation entre le client et
le prestataire.

---

## 2. Fonctionnalités

### Visiteur
- Page d'accueil orientée conversion (recherche, catégories, offres récentes).
- Marketplace `/materiel` avec recherche plein texte, filtres (catégorie, ville, prix,
  disponibilité), tri et pagination — l'état des filtres vit dans l'URL, donc partageable.
- Fiche détaillée : galerie, description, conditions, prestataire, **vérification de la
  disponibilité par date**.
- Vitrine publique de chaque prestataire.
- Interface entièrement responsive (testée de 320 px au desktop).

### Client
- Inscription, connexion, mot de passe oublié, changement de mot de passe, session persistante.
- Favoris (ajout/retrait avec mise à jour optimiste).
- Demande de réservation : date, quantité, message — la quantité est confrontée au stock
  réellement disponible à cette date.
- Suivi des demandes par statut, annulation d'une demande en attente.
- Notifications in-app (acceptation, refus).
- Tableau de bord avec statistiques et gestion du profil.

### Prestataire
- Tableau de bord d'activité (annonces publiées, en validation, demandes reçues/acceptées).
- CRUD complet des annonces : brouillon → soumission → publication → archivage.
- Upload de photos vers Supabase Storage : glisser-déposer, aperçu, suppression,
  réordonnancement, choix de la photo principale, validation du format et de la taille.
- Réception des demandes, acceptation ou refus, avec notification automatique du client.
- Le téléphone du client n'est révélé qu'après acceptation de la demande.

### Administrateur
- Statistiques globales et répartition des comptes.
- Modération des annonces : publier, refuser **avec motif transmis au prestataire**, archiver,
  supprimer.
- Gestion des utilisateurs : recherche, filtres, changement de rôle, activation/désactivation.
- CRUD des catégories.
- Supervision de l'ensemble des demandes de réservation.

---

## 3. Stack technique

| Domaine | Technologie |
|---|---|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 6 |
| Styles | Tailwind CSS 3 (tokens de marque MAKOLO) |
| Composants | Primitives Radix UI façon shadcn/ui, écrites dans `src/components/ui` |
| Icônes | Lucide React (bibliothèque unique) |
| Routage | React Router 6 |
| Données serveur | TanStack Query 5 |
| Formulaires | React Hook Form + Zod |
| Backend | Supabase (Auth, Postgres, Storage, RLS) |

---

## 4. Architecture

```
src/
├── assets/            Visuels générés (repli d'images, avatars)
├── components/
│   ├── ui/            Design system (Button, Input, Dialog, Toast, Skeleton…)
│   ├── layout/        Header, Footer, navigation, notifications
│   ├── listings/      ListingCard, CategoryCard, filtres, favoris, upload d'images
│   ├── booking/       BookingCard, modale de demande de réservation
│   ├── dashboard/     Gabarit des espaces connectés, StatCard, PageHeader
│   ├── auth/          Gabarit des pages d'authentification
│   ├── admin/         (réservé aux composants spécifiques au back-office)
│   └── common/        Logo, images tolérantes aux pannes, ErrorBoundary
├── pages/             Une page par route (public, auth, client, provider, admin)
├── routes/            Gardes de route et gestion du défilement
├── hooks/             useAuth + hooks TanStack Query par domaine
├── lib/               supabase.ts, validations.ts, permissions.ts, errors.ts, utils.ts
├── services/          Couche données
├── types/             Types métier alignés sur le schéma SQL
└── constants/         Villes, unités de prix, libellés, limites d'upload
```

### La couche données

L'interface ne connaît qu'un seul objet : `api`, exporté par `src/services/index.ts`.
Il implémente le contrat `MakoloBackend` (`services/backend.ts`), avec deux implémentations :

| Implémentation | Fichier | Quand ? |
|---|---|---|
| Supabase | `services/supabase-backend.ts` | `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` renseignées |
| Démonstration | `services/demo-backend.ts` | Aucune variable d'environnement |

Aucun composant n'importe Supabase directement. Passer de la démonstration à la production ne
demande donc **aucune modification de code**, seulement un fichier `.env`.

Le backend de démonstration reproduit les mêmes règles que Supabase (contrôles de propriété,
transitions de statut autorisées, création automatique des notifications, calcul de
disponibilité), afin que les parcours testés en local correspondent au comportement réel.

---

## 5. Installation

**Prérequis :** Node.js 20 ou supérieur, npm 10 ou supérieur.

```bash
git clone <url-du-depot>
cd Makolo
npm install
npm run dev
```

L'application démarre sur <http://localhost:5173> — sans configuration, en mode démonstration.

### Scripts disponibles

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification des types puis build de production dans `dist/` |
| `npm run preview` | Sert le build de production en local |
| `npm run typecheck` | Vérification TypeScript seule |

---

## 6. Variables d'environnement

Copiez `.env.example` vers `.env` :

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-publique
```

> **La clé `service_role` ne doit jamais figurer dans ce fichier.** Seule la clé publique
> `anon` est destinée au navigateur ; la sécurité repose sur les policies RLS.
> Le fichier `.env` est exclu du dépôt par `.gitignore`.

---

## 7. Mode démonstration

Sans variables d'environnement, MAKOLO démarre avec un jeu de données fictives en mémoire
(persisté dans `localStorage` uniquement pour ne pas perdre la session au rafraîchissement).

Un bandeau orange le signale en permanence, avec les identifiants de test.
Toutes les entreprises, personnes et coordonnées y sont fictives — le préfixe `77 000 xx xx`
n'est attribué à aucun opérateur.

Pour repartir d'un état propre : videz le `localStorage` du site, ou appelez
`resetDemoState()` depuis `src/services/demo/store.ts`.

---

## 8. Connexion à Supabase

### 8.1 Créer le projet

1. Créez un projet sur <https://supabase.com>.
2. Copiez **Project URL** et **anon public key** (Settings → API) dans votre `.env`.

### 8.2 Exécuter les scripts SQL

Dans **SQL Editor → New query**, exécutez dans l'ordre :

| Ordre | Fichier | Contenu |
|---|---|---|
| 1 | `scripts/sql/01_schema.sql` | Types, tables, index, triggers, fonction de disponibilité |
| 2 | `scripts/sql/02_rls.sql` | Activation de RLS et policies |
| 3 | `scripts/sql/03_storage.sql` | Bucket `listing-images` et policies Storage |
| 4 | `scripts/sql/04_seed.sql` | Catégories initiales et jeu de démonstration |

Les scripts sont idempotents : ils peuvent être rejoués sans erreur.

**Ce que met en place `01_schema.sql` :**
- 7 tables : `profiles`, `categories`, `listings`, `listing_images`, `favorites`,
  `booking_requests`, `notifications`.
- Les index demandés sur `listings` (catégorie, prestataire, ville, statut, date, prix),
  `booking_requests` (annonce, client, prestataire, statut) et `favorites` (utilisateur, annonce),
  plus un index GIN de recherche plein texte française.
- `handle_new_user()` : crée le profil à l'inscription et **force le rôle à `client` ou
  `provider`** — le rôle `admin` ne peut jamais être obtenu par auto-inscription.
- `listing_availability(listing_id, date)` : fonction `security definer` qui renvoie
  **uniquement des agrégats**, permettant à un client de connaître le stock restant sans lire
  les demandes des autres utilisateurs.
- `check_booking_capacity()` : refuse côté serveur toute acceptation dépassant le stock.
- Triggers de notification : demande créée, statut modifié, annonce publiée ou refusée.

### 8.3 Authentification

Dans **Authentication → Providers**, activez **Email**.

- Pour exiger la confirmation d'e-mail, activez *Confirm email* : l'inscription affiche alors
  automatiquement l'écran « Vérifiez votre boîte e-mail ».
- Dans **URL Configuration**, renseignez votre *Site URL* et ajoutez
  `https://votre-domaine/connexion` et `https://votre-domaine/profil` aux *Redirect URLs*
  (nécessaire à la réinitialisation de mot de passe).

### 8.4 Storage

`03_storage.sql` crée le bucket `listing-images` : public en lecture, limité à 5 Mo et aux
types `image/jpeg`, `image/png`, `image/webp`.

Le chemin de chaque fichier commence par l'identifiant de son propriétaire
(`<user_id>/<listing_id>/<fichier>`), et la policy Storage vérifie que ce premier segment
correspond à `auth.uid()` : un prestataire ne peut donc jamais écrire dans le dossier d'un autre.

### 8.5 Créer l'administrateur

Le rôle `admin` s'attribue uniquement en base :

```sql
update public.profiles set role = 'admin' where email = 'votre@email.sn';
```

---

## 9. Comptes de démonstration

Ces comptes existent immédiatement en mode démonstration. Pour Supabase, créez-les d'abord
dans **Authentication → Users → Add user** (en cochant *Auto Confirm User*), puis exécutez
`04_seed.sql` qui leur attribue les bons rôles et installe les annonces.

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Client | `client@makolo.sn` | `Makolo2026` |
| Prestataire | `prestataire@makolo.sn` | `Makolo2026` |
| Administrateur | `admin@makolo.sn` | `Makolo2026` |

> Ces identifiants sont destinés au test et à la recette. **Supprimez-les ou changez leurs mots
> de passe avant toute mise en production.**

---

## 10. Sécurité

Le frontend ne fait jamais autorité. `src/lib/permissions.ts` sert à afficher ou masquer
l'interface ; chaque règle possède son équivalent en policy RLS.

| Règle | Application côté base |
|---|---|
| Un visiteur ne voit que les annonces `published` | `listings_public_read` |
| Un prestataire ne gère que ses propres annonces | `listings_provider_update` / `_delete` |
| Un prestataire ne peut pas s'auto-publier | `with check (status in ('draft','pending','archived'))` |
| Un client ne modifie que ses propres demandes | `bookings_update_client` (→ `cancelled` uniquement) |
| Un prestataire ne répond qu'aux demandes qui le concernent | `bookings_update_provider` (→ `accepted`/`rejected`) |
| Un utilisateur ne change ni son rôle ni son statut | `profiles_update_own` compare aux valeurs existantes |
| Personne ne fabrique de notification | Aucune policy `insert` : seuls les triggers écrivent |
| Un prestataire n'écrit pas dans le dossier d'un autre | Policy Storage sur `storage.foldername(name)[1]` |
| On n'accepte jamais plus que le stock | Trigger `check_booking_capacity()` |

Autres points :
- Validation Zod sur tous les formulaires, doublée des contraintes `check` SQL.
- Les erreurs techniques ne sont jamais affichées : `lib/errors.ts` les traduit en messages
  français et ne journalise le détail qu'en développement.
- La connexion et le mot de passe oublié renvoient un message identique que le compte existe
  ou non (anti-énumération).
- Le téléphone d'un prestataire n'est visible que par les comptes connectés ; celui d'un client
  seulement après acceptation de sa demande.

---

## 11. Build et déploiement

```bash
npm run build     # vérifie les types puis produit dist/
npm run preview   # contrôle le build en local
```

Le résultat est une application statique déployable sur Vercel, Netlify, Cloudflare Pages ou
tout hébergeur de fichiers statiques.

**Configuration indispensable :** l'application utilise le routage par historique. Toutes les
routes doivent être réécrites vers `index.html`, sans quoi un rechargement sur `/materiel`
renverra une 404 serveur.

<details>
<summary>Netlify — <code>public/_redirects</code></summary>

```
/*  /index.html  200
```
</details>

<details>
<summary>Vercel — <code>vercel.json</code></summary>

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
</details>

N'oubliez pas de définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables
d'environnement de l'hébergeur.

### Préparation PWA

`public/manifest.webmanifest`, les icônes et la balise `theme-color` sont déjà en place.
Ajouter un service worker (par exemple `vite-plugin-pwa`) suffirait à rendre l'application
installable — volontairement non fait pour ne pas alourdir le MVP.

---

## 12. Périmètre du MVP

**Hors périmètre, volontairement non implémenté :** paiement en ligne (Wave, Orange Money,
carte bancaire), facturation, chat temps réel, SMS, notifications push, GPS et suivi de
livraison, commissions, IA, enchères.

L'architecture reste ouverte à ces ajouts : la couche `services/` est contractualisée par une
interface, les statuts de réservation sont extensibles, et le schéma SQL peut accueillir des
tables `payments`, `messages`, `deliveries` ou `reviews` sans remaniement.

### Prochaines étapes recommandées

1. Renseigner les mentions légales (raison sociale, NINEA/RCCM, contact).
2. Ajouter des avis et notes après une location terminée — premier signal de confiance
   réellement mesurable.
3. Prévoir un statut `completed` pour clôturer une location honorée.
4. Ajouter un service worker pour l'installation mobile (PWA).
5. Mettre en place des tests automatisés (Vitest + Playwright) sur les parcours critiques.
6. Ajouter un suivi d'erreurs en production (Sentry ou équivalent).

---

<div align="center">

**MAKOLO** — Dakar, Sénégal

</div>
