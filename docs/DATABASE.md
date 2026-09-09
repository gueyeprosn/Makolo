# Base de données

Source de vérité : `scripts/sql/`. Les scripts sont **idempotents** et
s'exécutent dans l'ordre.

| Ordre | Fichier | Contenu |
|---|---|---|
| 1 | `01_schema.sql` | Types, tables, index, fonctions, triggers |
| 2 | `02_rls.sql` | Activation de RLS et policies |
| 3 | `03_storage.sql` | Bucket `listing-images` et policies Storage |
| 4 | `04_seed.sql` | Catégories initiales + jeu de démonstration |

## Tables

| Table | Rôle | Clés étrangères |
|---|---|---|
| `profiles` | Profil applicatif, lié 1-1 à `auth.users` | → `auth.users` (cascade) |
| `categories` | Catalogue de catégories | — |
| `listings` | Annonces | → `profiles`, `categories` (restrict) |
| `listing_images` | Photos d'une annonce | → `listings` (cascade) |
| `favorites` | Favoris d'un utilisateur | → `profiles`, `listings` (cascade) |
| `booking_requests` | Demandes de réservation | → `listings`, `profiles` ×2 |
| `notifications` | Notifications in-app | → `profiles` (cascade) |

## Énumérations

```
user_role         client | provider | admin
listing_status    draft | pending | published | archived | rejected
booking_status    pending | accepted | rejected | cancelled
price_unit        jour | evenement | unite | heure | semaine
notification_type booking_request | booking_accepted | booking_rejected
                  | booking_cancelled | listing_published | listing_rejected
```

## Cycle de vie d'une annonce

```
draft ──(prestataire soumet)──> pending ──(admin valide)──> published
  ▲                                │                            │
  │                                └──(admin refuse)──> rejected │
  │                                                        │     │
  └────────────(prestataire corrige : repasse en pending)──┘     │
                                                                 ▼
                                                             archived
```

Le prestataire ne peut atteindre que `draft`, `pending` et `archived`.
`published` et `rejected` sont réservés à l'administrateur — garanti par le
trigger `enforce_listing_status_transition()`, pas seulement par l'interface.

Une annonce refusée qui est corrigée repasse automatiquement en `pending`, et
son `moderation_reason` est effacé.

## Cycle de vie d'une demande

```
pending ──(prestataire accepte)──> accepted
   │
   ├──(prestataire refuse)──> rejected
   │
   └──(client annule)──> cancelled
```

Une demande sortie de `pending` est définitive. Aucune transition retour.

## Fonctions et triggers

| Objet | Type | Rôle |
|---|---|---|
| `set_updated_at()` | trigger | Met à jour `updated_at` |
| `handle_new_user()` | trigger `security definer` | Crée le profil à l'inscription et **force le rôle** à `client` ou `provider` |
| `is_admin()` | fonction `security definer` | Évite la récursion des policies sur `profiles` |
| `current_role_is(role)` | fonction `security definer` | Idem, par rôle |
| `listing_availability(id, from, to)` | fonction `security definer` | Renvoie **uniquement des agrégats** de disponibilité sur une période |
| `check_booking_capacity()` | trigger `security definer` | Refuse une acceptation dépassant le stock |
| `enforce_booking_provider()` | trigger | Déduit `provider_id` de l'annonce, jamais du client |
| `enforce_listing_status_transition()` | trigger | Bloque l'auto-publication |
| `notify_booking_created()` | trigger | Notifie le prestataire |
| `notify_booking_status_change()` | trigger | Notifie le client (ou le prestataire si annulation) |
| `notify_listing_moderation()` | trigger | Notifie le prestataire d'une publication ou d'un refus |

### Pourquoi `listing_availability` est `security definer`

Un client doit savoir combien d'unités restent libres sur une période, **sans**
pouvoir lire les demandes des autres clients. La fonction ne renvoie que des
totaux :

```
total_quantity | accepted_quantity | pending_quantity | is_active | listing_status
```

Aucune ligne nominative ne sort. Une annonce non publiée n'est interrogeable
que par son propriétaire ou un administrateur.

`p_from`/`p_to` acceptent une période de plusieurs jours (`p_from = p_to` pour
une location d'un seul jour). Le calcul agrège **jour par jour** via
`generate_series(p_from, p_to, interval '1 day')`, puis retient le **pire
jour** (`max`) : deux réservations acceptées sur des sous-périodes disjointes
(ex. 1-5 et 10-15) ne se cumulent jamais à tort face à une demande qui les
couvre sans les chevaucher elles-mêmes (ex. 1-15). `check_booking_capacity()`
applique exactement le même calcul côté trigger, et `bookedQuantities()`
(`src/services/demo-backend.ts`) le reproduit côté démo — voir
`docs/specs/BOOKING-LIFECYCLE.md`.

## Règle de disponibilité

Elle est écrite **une seule fois**, dans `buildAvailability()`
(`src/services/demo-backend.ts`), et utilisée par les deux backends :

| État | Condition | Libellé affiché |
|---|---|---|
| `disabled` | annonce non publiée ou mise en pause | Non disponible à la location |
| `unavailable` | `quantity − accepted ≤ 0` | Indisponible à cette date |
| `partial` | reste du stock, mais demandes en attente | En cours de confirmation |
| `available` | reste du stock, aucune demande en attente | Disponible |

**Seules les demandes `accepted` consomment du stock.** Les demandes `pending`
sont signalées mais ne bloquent rien : deux clients peuvent demander les mêmes
chaises, le prestataire arbitre.

Cette règle est couverte par `tests/unit/availability.test.ts`. Toute
modification doit y être répercutée, sinon les deux backends divergent — et une
divergence ici produit une double réservation en production.

## Index

25 index, dont les principaux :

```
listings          category_id · provider_id · city · status · created_at · price
                  (status, created_at) partiel sur status='published'
                  GIN plein texte français sur (title || description)
booking_requests  listing_id · client_id · provider_id · status
                  (listing_id, status, requested_from, requested_to)  ← calcul de disponibilité
favorites         user_id · listing_id
profiles          role · city · active · created_at
```

## Contraintes notables

- `favorites_unique (user_id, listing_id)` — pas de doublon de favori.
- `booking_valid_range` — `CHECK (requested_to >= requested_from)`.
- `bookings_no_duplicate_pending` — contrainte d'**exclusion GiST**
  (extension `btree_gist`) : pour un même `(listing_id, client_id)`, deux
  demandes `pending` dont les périodes (`daterange(requested_from,
  requested_to, '[]')`) se chevauchent sont rejetées **au niveau base**,
  sans condition de course possible. Postgres renvoie le code `23P01`
  (`exclusion_violation`), traduit côté client par
  `lib/errors.ts` : « Vous avez déjà une demande en attente sur une période
  qui chevauche celle-ci. »
- `booking_not_self` — `client_id <> provider_id`.
- Bornes `CHECK` sur les longueurs de texte, `price > 0`, `quantity >= 1`.

## Réservation sur une période

`booking_requests` porte `requested_from` / `requested_to` (bornes incluses).
Une location d'un seul jour a `requested_from = requested_to`. Ce modèle a
remplacé la date unique d'origine (chantier n°1 de `ROADMAP.md`, livré) :
extension `btree_gist`, contrainte d'exclusion, `listing_availability(id,
from, to)` et `check_booking_capacity()` réécrits en agrégation jour par jour
(voir plus haut), et les deux backends alignés. Détails et scénarios dans
`docs/specs/BOOKING-LIFECYCLE.md`.

## Faire évoluer le schéma

1. Modifier `scripts/sql/01_schema.sql` (et `02_rls.sql` si les droits changent).
2. Appliquer sur Supabase.
3. Mettre à jour `src/types/index.ts`.
4. Répercuter dans les **deux** backends.
5. Mettre à jour `prisma/schema.prisma` par `prisma db pull`.
6. Ajouter ou ajuster les tests.

Ne jamais utiliser `prisma migrate` : il écraserait triggers, fonctions
`security definer` et policies, qui portent l'essentiel de la sécurité.
