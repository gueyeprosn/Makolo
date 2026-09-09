# Architecture

## En une phrase

SPA React + TypeScript servie en statique, qui parle à Supabase via une couche
de données contractualisée derrière une interface unique.

## Stack

| Domaine | Choix | Pourquoi |
|---|---|---|
| Vue | React 18 + TypeScript strict | Écosystème, typage de bout en bout |
| Build | Vite 6 | Démarrage rapide, sortie statique déployable partout |
| Styles | Tailwind 3 + jetons MAKALO | Cohérence forcée, pas de CSS orphelin |
| Composants | Primitives Radix, écrites dans `src/components/ui` | Accessibilité correcte sans dépendance à un design system tiers |
| Icônes | Lucide React | Une seule bibliothèque, jamais mélangée |
| Routage | React Router 6 | Routes imbriquées et gardes par rôle |
| Données serveur | TanStack Query 5 | Cache, invalidation, états de chargement |
| Formulaires | React Hook Form + Zod | Validation partagée entre types et exécution |
| Backend | Supabase (Auth, Postgres, Storage, RLS) | Sécurité en base, pas dans le client |
| Tests | Vitest | Rapide, même résolution d'alias que Vite |

## Arborescence

```
src/
├── assets/         Visuels générés (repli d'images, avatars)
├── components/
│   ├── ui/         Design system : Button, Input, Dialog, Toast, Skeleton…
│   ├── layout/     Header, Footer, navigation, cloche de notifications
│   ├── listings/   ListingCard, CategoryCard, filtres, favoris, upload
│   ├── booking/    BookingCard, modale de demande
│   ├── dashboard/  Gabarit des espaces connectés, StatCard, PageHeader
│   ├── auth/       Gabarit des pages d'authentification
│   ├── admin/      Composants propres au back-office
│   └── common/     Logo, ImageWithFallback, ErrorBoundary
├── pages/          Une page par route (public, auth, client, provider, admin)
├── routes/         Gardes de route, gestion du défilement
├── hooks/          useAuth + hooks TanStack Query par domaine
├── lib/            supabase, validations, permissions, errors, utils
├── services/       Couche données (voir ci-dessous)
├── types/          Types métier alignés sur le schéma SQL
└── constants/      Villes, unités, libellés, limites d'upload
```

## La décision structurante : la couche données

L'interface ne connaît **qu'un seul objet** : `api`, exporté par
`src/services/index.ts`. Il implémente le contrat `MakoloBackend` défini dans
`src/services/backend.ts`.

```
        composants / hooks
                │
                ▼
        api : MakoloBackend          ← le seul point d'entrée
          ╱             ╲
supabase-backend    demo-backend
 (production)       (démonstration)
```

| Implémentation | Activée quand | Rôle |
|---|---|---|
| `supabase-backend.ts` | `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` renseignées | Production |
| `demo-backend.ts` | Aucune variable d'environnement | Démonstration, données fictives en mémoire |

### Trois règles à ne pas enfreindre

1. **Aucun composant n'importe `@supabase/supabase-js` ni un backend concret.**
   Le seul import autorisé est `import { api } from '@/services'`.
2. **Toute méthode ajoutée au contrat doit être implémentée dans les deux
   backends.** TypeScript le rend obligatoire, ne le contournez pas avec un
   `throw new Error('non implémenté')`.
3. **Le backend démo reproduit les mêmes règles métier que Supabase** :
   contrôles de propriété, transitions de statut autorisées, création
   automatique des notifications. Sinon les parcours testés en local mentent.

La conséquence : passer de la démonstration à la production ne demande **aucune
modification de code**, seulement un fichier `.env`.

## Où vit la logique métier

| Règle | Où elle est appliquée |
|---|---|
| Format et bornes des saisies | Zod (`lib/validations.ts`) + contraintes `CHECK` SQL |
| Qui voit quoi, qui écrit quoi | Policies RLS (`scripts/sql/02_rls.sql`) |
| Transitions de statut d'annonce | Trigger `enforce_listing_status_transition()` |
| Capacité de stock à l'acceptation | Trigger `check_booking_capacity()` |
| Création des notifications | Triggers SQL, jamais depuis le client |
| Affichage / masquage de l'UI | `lib/permissions.ts` — confort uniquement |

`lib/permissions.ts` **ne sécurise rien**. Il évite d'afficher un bouton
inutilisable. Chaque règle qu'il exprime possède une policy RLS équivalente,
et c'est elle qui fait autorité.

## Gestion des erreurs

`lib/errors.ts` convertit toute erreur (code Postgres, erreur Supabase Auth,
panne réseau) en message français affichable. Le détail technique n'est
journalisé qu'en développement.

Aucun code brut (`PostgrestError 23505`, `PGRST116`) ne doit jamais atteindre
l'écran.

## Performance

- Découpage des bundles par domaine (`react`, `data`, `forms`) dans
  `vite.config.ts`.
- Pagination systématique : jamais de chargement complet du catalogue.
- Cache TanStack Query avec `staleTime` adapté par ressource.
- `placeholderData` sur la marketplace pour éviter le clignotement à la
  pagination.
- Images en `loading="lazy"` avec repli en cas d'échec.

## Ce que l'architecture ne couvre pas

Tout ce qui exige un secret serveur : webhooks de paiement, WhatsApp Business,
génération de factures, tâches planifiées. Le dossier `prisma/` prépare cette
couche ; voir `prisma/README.md`.
