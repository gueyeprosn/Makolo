# Spécification — Cycle de vie étendu de la réservation

Ce document couvre trois choses très différentes :

- **La réservation sur une période (chantier n°1) est livrée** (les deux
  backends, RLS, tests). Décrite ci-dessous par souci de continuité ; sa
  référence à jour est `docs/DATABASE.md` (« Réservation sur une période »)
  et `docs/BUSINESS-RULES.md`.
- **La fondation de l'acompte (chantier n°2) est livrée**, mais comme un
  champ `payment_status` séparé (`none`/`pending`/`paid`/`failed`/
  `refunded`) — jamais comme une valeur de `booking_status`. `booking_status`
  n'a pas changé : toujours `pending`/`accepted`/`rejected`/`cancelled`, sans
  `deposit_paid`. Référence à jour : `docs/DATABASE.md` (« Acompte —
  fondation ») et `docs/specs/PAYMENT-FLOW.md`.
- **Le modèle cible étendu ci-dessous (`fulfilled`, `completed`, `disputed`
  sur `booking_status`, plus la mention `deposit_paid` dans le diagramme)
  reste non implémenté.** Le diagramme date d'avant la décision — actée dans
  « Migration » plus bas et effectivement suivie — de garder `payment_status`
  séparé : lire `deposit_paid` dans ce qui suit comme une illustration de
  "l'acompte est confirmé", pas comme une future valeur de `booking_status`.
  `fulfilled`/`completed`/`disputed` supposent le chantier n°4 (constat
  post-événement) et ne sont pas construits.

## Réservation sur une période — livré

`booking_requests` porte `requested_from` / `requested_to` (une location d'un
seul jour a `requested_from = requested_to`). Deux garanties, tenues aux deux
mêmes endroits côté SQL et côté démo, pour ne jamais diverger :

- **Capacité** : `listing_availability()` / `check_booking_capacity()` (SQL)
  et `bookedQuantities()` (`src/services/demo-backend.ts`) agrègent
  `accepted`/`pending` **jour par jour** sur la période demandée et retiennent
  le **pire jour** (`max`). Deux réservations acceptées sur des sous-périodes
  disjointes (1-5 et 10-15) ne se cumulent jamais à tort face à une demande
  qui les couvre sans les chevaucher elles-mêmes (1-15).
- **Anti-doublon** : la contrainte d'exclusion GiST
  `bookings_no_duplicate_pending` (extension `btree_gist`,
  `daterange(requested_from, requested_to, '[]')`) refuse, au niveau base,
  une deuxième demande `pending` du même client sur la même annonce dont la
  période chevauche une demande déjà en attente — y compris sous concurrence,
  ce qu'une vérification applicative seule ne garantirait pas. Le backend
  démo reproduit ce refus par un test de chevauchement explicite
  (`rangesOverlap()`) avant insertion.

Couvert par `tests/unit/booking-overlap.test.ts` (chevauchements, périodes
disjointes) et vérifié de bout en bout par navigateur réel ainsi que par un
audit RLS sur PostgreSQL réel.

## Pourquoi ce document existe

Le cycle actuel — `pending → accepted | rejected`, ou `pending → cancelled` —
est correct pour ce qu'il fait, mais il modélise une **décision**, pas un
**événement qui se déroule dans le temps**. Une fois le paiement (chantier 2)
et la clôture d'un événement introduits, une demande acceptée doit encore
distinguer « le versement d'acompte est arrivé » de « le matériel a été
livré » de « l'événement s'est tenu sans incident ». Le statut actuel ne
porte aucune de ces distinctions.

## Le modèle actuel, pour référence

```
pending ──(prestataire accepte)──> accepted
   │
   ├──(prestataire refuse)──> rejected
   │
   └──(client annule)──> cancelled
```

Une fois `accepted`, `rejected` ou `cancelled` atteint, la ligne est
définitive (`docs/DATABASE.md`). Rien ne distingue aujourd'hui une demande
acceptée la veille de l'événement d'une demande acceptée il y a six mois.

## Le modèle cible

```
pending ──accepte──> accepted ──acompte confirmé──> deposit_paid
                                                          │
                                            (date de l'événement passée)
                                                          ▼
                                                    fulfilled ──constat sans écart──> completed
                                                          │
                                                          └──écart signalé──> disputed
   │
   ├──refuse──> rejected
   └──annule──> cancelled           accepted/deposit_paid ──annulation tardive──> cancelled (règles de pénalité)
```

| Statut | Ce qu'il signifie | Ce qui le déclenche |
|---|---|---|
| `pending` | Demande envoyée, en attente de décision | inchangé |
| `accepted` | Le prestataire s'engage, aucun encaissement encore confirmé | inchangé |
| `deposit_paid` | L'acompte (chantier 2) a été confirmé par webhook | événement de paiement serveur, jamais le frontend seul |
| `fulfilled` | La date de l'événement est passée sans annulation | tâche planifiée, ou constat explicite d'une partie |
| `completed` | Aucun écart signalé dans un délai de contestation (proposition : 72 h) | expiration du délai, ou constat positif des deux parties |
| `disputed` | Une partie signale un écart (quantité, casse, absence) | formulaire de constat post-événement (chantier 4, score de fiabilité) |
| `rejected` | inchangé | prestataire |
| `cancelled` | inchangé, mais peut désormais porter une pénalité selon le délai avant l'événement | client, ou expiration de l'acompte non reçu |

## Ce qu'il ne faut pas faire

- **Ne pas** introduire `payment_status = 'paid'` sans paiement réel derrière
  — voir la Règle d'or de `CLAUDE.md`. C'est déjà respecté aujourd'hui : rien
  ne fait transitionner ce champ hors d'un webhook réel (aucun compte
  marchand n'étant branché, il reste `none` pour toute demande).
- **Ne pas** fusionner ce champ avec `booking_status` : garder les deux
  machines d'état séparées (`booking_status` pour l'engagement,
  `payment_status` pour l'argent — décision prise, voir « Migration »
  ci-dessous) évite qu'un échec de paiement ne force une transition de
  réservation invalide.

## Migration — chantier n°2 (acompte), livré

1. ~~Étendre l'enum `booking_status`~~ — **écarté**, au profit de l'option 2.
2. ✅ Colonne `payment_status` séparée plutôt que de surcharger
   `booking_status` (`scripts/sql/01_schema.sql`, `02_rls.sql`).
3. Pas de nouveau trigger de transition : la seule autorité sur
   `payment_status` est `service_role`, imposée par un verrou colonne
   (`REVOKE`/`GRANT`), pas par un trigger de transition — plus direct et
   impossible à contourner même en SQL brut. Voir `docs/SECURITY.md`.
4. ✅ `tests/unit/payment-webhook-signature.test.ts` couvre la vérification
   de signature ; l'audit RLS sur PostgreSQL réel couvre le verrou colonne.

## Migration — `fulfilled` / `completed` / `disputed`, non commencée

Ces trois valeurs de `booking_status` supposent le chantier n°4 (constat
post-événement) :

1. Étendre l'enum `booking_status` (`ALTER TYPE ... ADD VALUE`, irréversible
   en une seule transaction sous Postgres — prévoir une fenêtre de
   maintenance ou une double-écriture).
2. Ajouter un trigger `enforce_booking_lifecycle_transition()` sur le même
   modèle que `enforce_listing_status_transition()` (`docs/SECURITY.md`) :
   chaque transition a une autorité précise (client, prestataire, tâche
   planifiée).
3. Étendre `tests/unit/` avec un test par transition autorisée et par
   transition refusée, sur le modèle de `tests/unit/permissions.test.ts`.
