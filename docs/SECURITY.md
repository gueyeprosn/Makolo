# Sécurité

## Principe non négociable

**Le frontend n'est jamais une source de vérité.** Chaque règle affichée côté
client (`lib/permissions.ts`) a une policy RLS équivalente en base
(`scripts/sql/02_rls.sql`). Si les deux divergent, la base gagne — et c'est un
bug à corriger immédiatement, pas une fonctionnalité.

Aujourd'hui MAKALO n'a pas de serveur applicatif séparé : Postgres (RLS +
triggers `security definer`) **est** la couche serveur. C'est elle qui fait
autorité sur les prix, la disponibilité, les rôles et les transitions de statut.

## Modèle d'autorisation

| Rôle | Peut | Ne peut pas |
|---|---|---|
| Visiteur (`anon`) | Lire les annonces publiées, les catégories actives, les profils prestataires actifs | Écrire quoi que ce soit |
| Client | Gérer son profil, ses favoris, ses demandes | Modifier une annonce, voir les demandes d'autrui |
| Prestataire | Gérer ses propres annonces et leurs images, répondre aux demandes le concernant | Publier/refuser (réservé admin), toucher aux annonces d'un autre prestataire |
| Admin | Tout modérer, gérer utilisateurs et catégories | — |

## Comment le rôle `admin` est protégé

Le trigger `handle_new_user()` (`01_schema.sql`) lit `raw_user_meta_data->>'role'`
envoyé par le client à l'inscription et **n'accepte que `client` ou
`provider`** ; toute autre valeur, y compris `admin`, retombe sur `client`.

```sql
if requested_role = 'provider' then safe_role := 'provider';
else safe_role := 'client';
end if;
```

Testé explicitement : `tests/unit/validations.test.ts` (`registerSchema` rejette
`role: 'admin'` côté client) et vérifié en conditions réelles sur PostgreSQL —
un compte s'inscrivant avec `role: "admin"` reçoit `client`. La promotion vers
`admin` ne se fait qu'en base par un administrateur déjà en place :

```sql
update public.profiles set role = 'admin' where email = '...';
```

## Publication d'annonce : la règle en deux temps

Un prestataire ne peut pas s'auto-publier. Ce n'est **pas** seulement une
policy sur la ligne (`provider_id = auth.uid()`), qui autoriserait un
prestataire à modifier son propre `status`. C'est un trigger séparé,
`enforce_listing_status_transition()`, qui bloque spécifiquement la transition
vers `published` ou `rejected` pour qui n'est pas administrateur — tout en
laissant le prestataire modifier librement le contenu (prix, description)
d'une annonce déjà publiée.

Cette distinction a été découverte en testant : une première version de la
policy RLS interdisait *toute* modification d'une annonce publiée par son
propriétaire, y compris changer son prix. Le trigger corrige cela sans rouvrir
la faille d'auto-publication.

## Fonctions `security definer`

Quatre fonctions élèvent leurs privilèges pour un besoin précis, chacune avec
`set search_path = public` (contre le détournement de recherche de schéma) :

| Fonction | Pourquoi l'élévation est nécessaire |
|---|---|
| `is_admin()` / `current_role_is()` | Lire `profiles` depuis une policy sur `profiles` sans récursion infinie |
| `listing_availability()` | Un client doit connaître le stock restant sans lire les demandes des autres clients — ne renvoie que des agrégats |
| `check_booking_capacity()` | Refuser une acceptation qui dépasserait le stock, même si la policy RLS a laissé passer l'écriture |
| `handle_new_user()` / `enforce_*` | Écrire dans `profiles` / contrôler une transition au moment précis de l'INSERT ou l'UPDATE |

Aucune de ces fonctions n'expose de colonne nominative au-delà de ce que son
appelant a le droit de voir.

## Confidentialité des coordonnées

- Le téléphone d'un **prestataire** n'est visible que par un compte connecté
  (`canSeeProviderPhone()`), jamais par un visiteur anonyme.
- Le téléphone d'un **client** n'est révélé au prestataire qu'après acceptation
  de la demande (`BookingCard`, section « Contact » conditionnée à
  `status === 'accepted'`).

## Stockage des images

Chemin imposé : `<uid_propriétaire>/<listing_id>/<fichier>`. La policy Storage
vérifie que `(storage.foldername(name))[1] = auth.uid()::text` : un prestataire
ne peut physiquement pas écrire dans le dossier d'un autre, quelle que soit la
manipulation côté client. Upload limité à 5 Mo et aux types
`image/jpeg|png|webp`, appliqué à la fois côté client (retour rapide) et côté
bucket (`file_size_limit`, `allowed_mime_types` — la limite qui compte).

## Notifications : aucune voie d'écriture directe

`notifications` n'a **aucune policy INSERT**. Toute ligne provient d'un
trigger `security definer` (`notify_booking_created`,
`notify_booking_status_change`, `notify_listing_moderation`). Un utilisateur ne
peut donc pas fabriquer une fausse notification pour lui-même ou pour
quelqu'un d'autre.

## Anti-énumération

`requestPasswordReset()` renvoie la même réponse que l'adresse existe ou non.
Ne jamais faire dire à l'interface « aucun compte avec cet e-mail ».

## Gestion des erreurs

`lib/errors.ts` traduit toute erreur technique en message français avant
affichage ; le détail (code Postgres, stack) n'est journalisé qu'en
développement (`import.meta.env.DEV`). Un code comme `PostgrestError 23505` ne
doit jamais atteindre l'écran.

## Acompte (chantier n°2) : fondation livrée, encaissement réel pas encore

`docs/specs/PAYMENT-FLOW.md` détaille le flux visé. Ce qui est réellement
construit dans ce dépôt, et vérifié sur PostgreSQL réel :

1. **Vérification de signature côté serveur** —
   `supabase/functions/payment-webhook/signature.ts`, une fonction Edge
   Supabase (Deno), jamais dans le navigateur. Le secret de webhook n'existe
   que dans les variables d'environnement de cette fonction, jamais sous un
   nom `VITE_*`. Testé par `tests/unit/payment-webhook-signature.test.ts`
   avec de vraies signatures HMAC-SHA256.
2. **Idempotence** — contrainte `UNIQUE (provider, provider_event_id)` sur
   `payment_events` : un même événement rejoué ne peut pas être traité deux
   fois, garanti par Postgres et pas seulement par une vérification
   applicative.
3. **Journalisation systématique** — chaque webhook, accepté ou rejeté, est
   inséré dans `payment_events` avant tout autre effet.
4. **Aucune confirmation de paiement depuis le frontend** — verrouillé au
   niveau colonne, pas seulement par une policy RLS contournable en théorie
   par une erreur de logique métier : `authenticated` n'a **aucun** privilège
   `UPDATE`/`INSERT` sur `payment_status`, `payment_provider`,
   `deposit_amount`, `payment_reference` de `booking_requests` (`REVOKE`/
   `GRANT` colonne par colonne dans `02_rls.sql`) — un administrateur inclus,
   puisque `role = 'admin'` est une donnée dans `profiles`, pas un rôle
   Postgres distinct. Seul `service_role` (utilisé exclusivement par la
   fonction Edge) peut écrire ces colonnes.

Vérifié par des transactions de rôle sur PostgreSQL réel : un client ne peut
ni insérer ni mettre à jour ces colonnes, un administrateur non plus, un
rejeu du même `provider_event_id` est rejeté par la contrainte, et
`service_role` peut écrire ces colonnes normalement.

**Ce qui manque encore avant un vrai encaissement** (voir aussi
`supabase/functions/payment-webhook/README.md`) : un compte marchand
Wave/Orange Money réel et ses secrets, l'endpoint de création d'intention de
paiement (calcule `deposit_amount`, ouvre la session de paiement, pose
`payment_reference`), la confirmation du schéma exact des webhooks Orange
Money, et le séquestre/reversement au prestataire. Sans le compte marchand,
`payment_status` ne quitte jamais `none` — ce n'est pas simulé pour paraître
plus avancé que ça.

C'est la même philosophie que RLS ailleurs dans cette base : la confirmation
vient toujours d'un endroit que l'utilisateur ne contrôle pas.

## Vérifications à refaire après toute modification de RLS

1. Rejouer `scripts/sql/01_schema.sql` → `02_rls.sql` → `03_storage.sql` sur
   une base de test.
2. Pour chaque rôle (`anon`, client, prestataire A, prestataire B, admin),
   dans une transaction annulée (`begin; set local role ...; ...; rollback;`) :
   vérifier qu'un accès refusé l'est toujours, et qu'un accès légitime ne l'est
   pas devenu.
3. Cas à ne jamais casser silencieusement :
   - visiteur → écriture sur `listings` ou `categories` → refusé ;
   - prestataire B → écriture sur une annonce de A → refusé ;
   - prestataire → auto-publication → refusé, mais modification du prix d'une
     annonce publiée → **autorisé** ;
   - client → lecture des demandes d'un autre client → 0 ligne ;
   - client → `role = 'admin'` sur son propre profil → refusé.
   - client → deux demandes `pending` sur des périodes qui se chevauchent
     (même annonce, même client) → la deuxième insertion est rejetée par la
     contrainte d'exclusion GiST `bookings_no_duplicate_pending` (`23P01`),
     y compris en cas d'insertions concurrentes (contrairement à une
     vérification applicative seule, la contrainte est portée par Postgres) ;
   - client → date de début antérieure à aujourd'hui → refusé par
     `bookings_insert_client` (`requested_from >= current_date`) ;
   - client, prestataire concerné, **et administrateur** → écriture directe
     de `payment_status`/`payment_provider`/`deposit_amount`/
     `payment_reference` sur une demande, à l'insertion ou à la mise à jour →
     refusé (`permission denied for table booking_requests`, verrou colonne,
     pas seulement RLS) ;
   - `service_role` → écriture de ces mêmes colonnes → autorisé (c'est la
     seule voie légitime, utilisée par
     `supabase/functions/payment-webhook/`) ;
   - client, prestataire → lecture de `payment_events` → 0 ligne ; admin →
     lecture autorisée ;
   - `service_role` → deux insertions dans `payment_events` avec le même
     `(provider, provider_event_id)` → la seconde est rejetée par la
     contrainte `payment_events_idempotent`.
