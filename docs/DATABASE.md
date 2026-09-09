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
| `listing_availability(id, date)` | fonction `security definer` | Renvoie **uniquement des agrégats** de disponibilité |
| `check_booking_capacity()` | trigger `security definer` | Refuse une acceptation dépassant le stock |
| `enforce_booking_provider()` | trigger | Déduit `provider_id` de l'annonce, jamais du client |
| `enforce_listing_status_transition()` | trigger | Bloque l'auto-publication |
| `notify_booking_created()` | trigger | Notifie le prestataire |
| `notify_booking_status_change()` | trigger | Notifie le client (ou le prestataire si annulation) |
| `notify_listing_moderation()` | trigger | Notifie le prestataire d'une publication ou d'un refus |

### Pourquoi `listing_availability` est `security definer`

Un client doit savoir combien d'unités restent libres à une date, **sans**
pouvoir lire les demandes des autres clients. La fonction ne renvoie que des
totaux :

```
total_quantity | accepted_quantity | pending_quantity | is_active | listing_status
```

Aucune ligne nominative ne sort. Une annonce non publiée n'est interrogeable
que par son propriétaire ou un administrateur.

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
                  (listing_id, requested_date, status)  ← calcul de disponibilité
favorites         user_id · listing_id
profiles          role · city · active · created_at
```

## Contraintes notables

- `favorites_unique (user_id, listing_id)` — pas de doublon de favori.
- `bookings_no_duplicate_pending` — index unique partiel : une seule demande en
  attente par (annonce, client, date).
- `booking_not_self` — `client_id <> provider_id`.
- Bornes `CHECK` sur les longueurs de texte, `price > 0`, `quantity >= 1`.

## Limite connue : la réservation mono-date

`booking_requests.requested_date` est une **date unique**. Une location réelle
court de la livraison la veille à la reprise le lendemain. Le calcul de
disponibilité est donc optimiste dès qu'un même lot est loué deux week-ends
consécutifs avec chevauchement logistique.

C'est le chantier n°1 de `ROADMAP.md`. La migration devra :

1. ajouter `requested_from` / `requested_to` (dates) ;
2. reprendre l'existant avec `from = to = requested_date` ;
3. réécrire `listing_availability` en chevauchement de plages
   (`from <= p_date AND to >= p_date`, puis en intervalle) ;
4. mettre à jour `buildAvailability()` et ses tests.

## Faire évoluer le schéma

1. Modifier `scripts/sql/01_schema.sql` (et `02_rls.sql` si les droits changent).
2. Appliquer sur Supabase.
3. Mettre à jour `src/types/index.ts`.
4. Répercuter dans les **deux** backends.
5. Mettre à jour `prisma/schema.prisma` par `prisma db pull`.
6. Ajouter ou ajuster les tests.

Ne jamais utiliser `prisma migrate` : il écraserait triggers, fonctions
`security definer` et policies, qui portent l'essentiel de la sécurité.
