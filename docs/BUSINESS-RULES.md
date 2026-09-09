# Règles métier

Référence unique pour toute règle qui n'est pas évidente à la lecture du code.
Chaque règle indique où elle est **appliquée** (autorité) et où elle est
**reflétée** (confort d'interface).

## Comptes et rôles

| Règle | Appliquée | Reflétée |
|---|---|---|
| Un compte a exactement un rôle : `client`, `provider` ou `admin` | contrainte enum SQL | `types/index.ts` |
| Le rôle `admin` ne s'obtient jamais par auto-inscription | `handle_new_user()` | `registerSchema` (Zod) refuse `role: 'admin'` en amont |
| Un compte désactivé (`active = false`) perd tous ses droits | policies RLS (`... and active = true`) | `lib/permissions.ts` (`hasRole`) |
| Un utilisateur ne change ni son rôle ni son statut actif lui-même | `profiles_update_own` (WITH CHECK compare à l'existant) | champ non exposé dans `ProfilePage` |
| Un administrateur ne peut pas désactiver son propre compte | `demo-backend.ts` (`adminUpdateUser`) | bouton désactivé dans `AdminUsersPage` si `user.id === me.id` |

## Annonces

| Règle | Appliquée | Reflétée |
|---|---|---|
| Statuts : `draft → pending → published \| rejected`, puis `archived` | `enforce_listing_status_transition()` | `LISTING_STATUS_LABEL` |
| Un prestataire n'atteint que `draft`, `pending`, `archived` | trigger + policy RLS | boutons conditionnels dans `ProviderListingsPage` |
| `published` et `rejected` sont réservés à l'admin | trigger | `AdminListingsPage` seul à proposer Publier/Refuser |
| Un refus exige un motif (`moderation_reason`) | `rejectionSchema` (≥ 10 caractères) | affiché au prestataire sur sa carte d'annonce |
| Une annonce refusée puis corrigée repasse en `pending` et perd son motif | `updateListing()` (les deux backends) | — |
| Prix strictement positif, quantité entière ≥ 1 | contraintes `CHECK` SQL | `listingSchema` (Zod) |
| Suppression d'une annonce : cascade sur images, favoris, demandes | `on delete cascade` | `ConfirmDialog` avertit explicitement |
| Une catégorie utilisée par au moins une annonce ne peut pas être supprimée | `on delete restrict` sur `category_id` | message dédié (« désactivez-la à la place ») |

## Disponibilité et réservation

| Règle | Appliquée | Reflétée |
|---|---|---|
| Seules les demandes `accepted` consomment le stock ; `pending` est signalé sans bloquer | `listing_availability()` / `buildAvailability()` | badge « Disponible / En cours de confirmation / Indisponible » |
| Une acceptation qui dépasserait le stock est refusée, même en cas de concurrence | `check_booking_capacity()` (trigger) | vérifié avant l'appel dans `updateBookingStatus()` |
| Une demande porte sur une période (`requested_from` → `requested_to`), pas une date unique | schéma SQL, les deux backends | `BookingDialog` (deux champs, un seul en location d'un jour) |
| La disponibilité et la capacité sont calculées jour par jour sur toute la période, en retenant le pire jour | `listing_availability()` / `check_booking_capacity()` (SQL) et `bookedQuantities()` (démo) | badge de disponibilité recalculé à chaque changement de période |
| La date de fin ne peut pas précéder la date de début | `CHECK booking_valid_range` (SQL), `bookingSchema` (Zod, `.refine`) | `DatePicker` de fin borné par `minDate` |
| Un client ne peut avoir deux demandes `pending` pour la même annonce sur des périodes qui se chevauchent | contrainte d'exclusion GiST `bookings_no_duplicate_pending` | message d'erreur dédié (code `23P01`) |
| La date de début ne peut pas être dans le passé | `bookingSchema` (Zod, comparaison à `todayISO()`) puis policy RLS (`requested_from >= current_date`) | `DatePicker` désactive les jours passés |
| Un prestataire ne réserve pas sa propre annonce | policy RLS (`provider_id <> auth.uid()`) | `canRequestBooking()` |
| `provider_id` d'une demande est toujours déduit de l'annonce, jamais du client | `enforce_booking_provider()` (trigger `before insert`) | le formulaire de réservation ne transmet pas ce champ |

## Cycle de vie d'une demande

| Règle | Appliquée | Reflétée |
|---|---|---|
| `pending → accepted \| rejected` : décision du prestataire concerné (ou admin) | `bookings_update_provider` | boutons Accepter/Refuser dans `ProviderBookingsPage` |
| `pending → cancelled` : décision du client concerné | `bookings_update_client` | bouton Annuler dans `ClientBookingsPage` |
| Une demande sortie de `pending` est définitive | policies (`using status = 'pending'`) | aucune action proposée hors `pending` |
| Chaque transition génère une notification pour l'autre partie | triggers `notify_booking_*` | `NotificationBell` |

## Favoris

| Règle | Appliquée | Reflétée |
|---|---|---|
| Un favori est unique par (utilisateur, annonce) | contrainte `UNIQUE` | `addFavorite()` idempotent (code `23505` avalé) |
| On ne met en favori qu'une annonce publiée | policy RLS (`favorites_insert_own`) | le bouton favori n'existe que sur des annonces publiées affichées |
| Un visiteur non connecté est invité à se connecter, jamais bloqué silencieusement | — | `FavoriteButton` → toast + redirection `/connexion` |

## Validation (Zod ↔ SQL)

Chaque schéma de `lib/validations.ts` a sa contrainte miroir en base ; Zod
donne un message immédiat et lisible, SQL est le filet de sécurité qui ne fait
jamais confiance au client.

| Schéma | Contrainte SQL miroir |
|---|---|
| `registerSchema` (téléphone sénégalais `7[0678]…`) | `profiles.phone` (longueur uniquement — le format est une règle d'UX, pas de sécurité) |
| `listingSchema` (prix > 0, quantité ≥ 1, titre 5–90, description 30–2000) | `CHECK` correspondants sur `listings` |
| `bookingSchema` (date ≥ aujourd'hui, quantité ≥ 1) | policy RLS + trigger de capacité |
| `categorySchema` / `rejectionSchema` | contraintes de longueur sur `categories.name` / motif ≥ 10 caractères côté UI (pas de contrainte SQL dédiée — à ajouter si le refus devient un flux critique) |

## Devise et formats

- Toute somme est en FCFA (XOF), sans décimale à l'affichage :
  `formatPrice()` arrondit et espace les milliers (`25 000 FCFA`).
- Aucune conversion de devise n'existe ni n'est prévue.
- Dates affichées en français long (`24 mai 2026`), stockées en `date` SQL
  (pas de fuseau horaire — voir la note sur `fromISODate()` dans `utils.ts`
  pour éviter le décalage UTC classique).

## Ce que ce document ne couvre pas encore

Les règles de commission, d'acompte, de caution et de facturation décrites
dans le plan de croissance (partagé hors dépôt) ne sont **pas** implémentées :
aucune table, aucune colonne, aucune policy ne les reflète aujourd'hui. Elles
entreront ici au fur et à mesure de leur implémentation réelle, jamais avant —
ce document décrit le système tel qu'il fonctionne, pas tel qu'il est prévu de
fonctionner (voir `ROADMAP.md` pour l'intention).
