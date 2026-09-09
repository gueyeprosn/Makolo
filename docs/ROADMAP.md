# Feuille de route technique

Ordonnée par dépendance, pas par facilité. Chaque chantier précise ce qu'il
débloque et ce sur quoi il s'appuie. Ne pas commencer un chantier tant que ses
prérequis ne sont pas livrés — un webhook de paiement sans acompte livré n'a
rien à confirmer, une facture sans compte Entreprise n'a personne à qui
l'adresser.

## Légende

- **Bloquant** : rien en aval ne peut être construit sans ce chantier.
- **Fondation** : touche le schéma de données ; migration SQL requise.

## 1. Réservation sur une période — Bloquant · Fondation — ✅ Livré

**Problème réel** (résolu) : `booking_requests.requested_date` était une date
unique. Une location court en réalité de la livraison la veille à la reprise
le lendemain — trois jours de stock immobilisé comptés comme un seul. Le
calcul de disponibilité était faux dès la deuxième réservation qui chevauchait
la même période.

**Livré** :
1. Migration SQL (dans `01_schema.sql`, réexécutable) : `requested_from` /
   `requested_to` (`date`), `CHECK booking_valid_range`, extension
   `btree_gist` et contrainte d'exclusion GiST
   `bookings_no_duplicate_pending` sur `daterange(requested_from,
   requested_to, '[]')` (recouvrement, plus une simple égalité).
2. `listing_availability(id, from, to)` et `check_booking_capacity()`
   réécrits en agrégation jour par jour (`generate_series` + pire jour), en
   miroir exact.
3. Répercuté dans `buildAvailability()`/`bookedQuantities()` (les deux
   backends) et dans `BookingDialog` (deux sélecteurs de date, la fin suit le
   début tant qu'elle n'est pas touchée).
4. `tests/unit/booking-overlap.test.ts` couvre les chevauchements (partiel,
   contact borne à borne, périodes disjointes) ; validé de bout en bout par
   navigateur réel (double réservation chevauchante refusée, période
   contiguë acceptée) et par un audit RLS sur PostgreSQL réel.

**A débloqué** : un calcul de disponibilité correct, donc tout ce qui suit.

Spécification détaillée du cycle de statut : `docs/specs/BOOKING-LIFECYCLE.md`.

## 2. Encaissement d'acompte — Bloquant · Fondation — 🟡 Fondation livrée, encaissement réel bloqué sur un compte marchand

**Problème réel** : aucune transaction ne passe par la plateforme. Client et
prestataire concluent hors ligne dès que le téléphone est visible ; MAKALO ne
capture aucune valeur de la mise en relation qu'elle a pourtant produite.

**Livré** :
1. Champ `payment_status` (`none`/`pending`/`paid`/`failed`/`refunded`),
   distinct de `booking_status` — une demande peut être `accepted` sans
   acompte encore confirmé — plus `payment_provider`, `deposit_amount`,
   `payment_reference` sur `booking_requests`, et une table `payment_events`
   pour la traçabilité et l'idempotence (`UNIQUE (provider,
   provider_event_id)`).
2. Ces colonnes sont verrouillées au niveau colonne (`REVOKE`/`GRANT` dans
   `02_rls.sql`) : aucun compte `authenticated` — administrateur inclus — ne
   peut les écrire. Seul `service_role` le peut.
3. `supabase/functions/payment-webhook/` : fonction Edge Supabase qui reçoit
   un webhook, vérifie sa signature (HMAC-SHA256 réelle pour Wave, schéma
   Orange Money non confirmé faute de documentation publique), applique
   l'idempotence, vérifie montant et devise, et transitionne
   `payment_status`. Jamais de confirmation de paiement acceptée depuis le
   frontend seul.
4. Vérifié sur PostgreSQL réel (verrou colonne, idempotence, lecture
   `payment_events` réservée à l'admin) et par
   `tests/unit/payment-webhook-signature.test.ts`.

**Reste à faire avant un vrai encaissement** (aucun des quatre n'est
buildable sans le premier) :
1. Un compte marchand Wave / Orange Money réel et ses secrets.
2. L'endpoint de création d'intention de paiement (calcule `deposit_amount`,
   ouvre la session de paiement côté provider, pose `payment_reference`) —
   suppose lui aussi le compte marchand.
3. Confirmation du schéma exact des webhooks Orange Money avec le contrat
   d'intégration réel.
4. Séquestre : l'acompte n'est reversé au prestataire qu'après la date de
   l'événement, net de commission — logique de reversement non construite.

**Débloque** : toute commission, donc tout modèle de revenu — une fois
l'encaissement réel, pas seulement sa fondation, livré.

Spécification détaillée du flux, des vérifications obligatoires et de ce que
le frontend n'a jamais le droit de décider : `docs/specs/PAYMENT-FLOW.md`.
Détail d'implémentation et limites connues : `supabase/functions/payment-webhook/README.md`.

## 3. Notifications WhatsApp Business — Fondation

**Problème réel** : l'e-mail ne porte pas au Sénégal, où WhatsApp est le canal
de décision par défaut. Les notifications in-app actuelles ne sont vues que si
l'utilisateur revient sur l'application.

**Travail** : service serveur appelant l'API WhatsApp Business à chaque
événement déjà couvert par un trigger (`notify_booking_created`,
`notify_booking_status_change`, `notify_listing_moderation`) — ces triggers
deviennent la source d'événements, pas seulement d'écritures dans
`notifications`.

**Débloque** : le délai de réponse prestataire, indicateur cité dans
`docs/PRODUCT.md`.

## 4. Score de fiabilité prestataire

**Pourquoi avant les avis** : une note d'étoiles se manipule (avis complaisants,
avis de représailles). Trois indicateurs factuels ne se manipulent pas :

- taux de présence (l'événement a-t-il eu lieu comme prévu ?) ;
- ponctualité (livraison dans le créneau annoncé) ;
- conformité de quantité (le stock livré correspond-il à la demande acceptée ?).

**Travail** : ces trois faits doivent être constatés par quelqu'un — client ou
prestataire — après la date de l'événement. Suppose un état `completed` sur la
demande (aujourd'hui absent : une demande `accepted` n'est jamais close), et un
court formulaire de constat post-événement.

**Débloque** : le premier signal de confiance affichable sans réserve (voir
`docs/UX.md`).

## 5. Panier multi-prestataires

**Travail** : une commande peut référencer plusieurs `booking_requests` liées
à des prestataires différents, avec un identifiant de panier commun et une
répartition automatique des reversements une fois l'acompte encaissé (point 2).
Nécessite l'agenda prestataire (point 7) pour garantir que chaque maillon est
réellement disponible au moment de l'assemblage.

## 6. Devis et facture conformes

**Prérequis** : un premier compte utilisant réellement le service (traiteur,
hôtel, entreprise) qui exige un document NINEA / TVA. Ne pas construire ce
générateur avant d'avoir ce cas d'usage concret face à soi.

**Travail** : mandat de facturation (MAKALO émet pour le compte du
prestataire), numérotation séquentielle fiable — ce qui exige un service
serveur avec une base transactionnelle, pas une génération côté client.

## 7. Agenda prestataire et blocage manuel de stock

**Problème réel** : un prestataire qui loue aussi hors plateforme n'a
aujourd'hui aucun moyen de bloquer ces quantités dans MAKALO. Il sous-déclare
donc son stock disponible par prudence, ce qui fausse la marketplace pour tout
le monde.

**Travail** : vue calendrier côté prestataire, écriture directe de blocages qui
alimentent le même calcul que `listing_availability()`.

## 8. Zones de livraison, tarifs dégressifs, état des lieux photo

Trois sujets indépendants, à traiter ensemble parce qu'ils produisent les
mêmes symptômes (litiges de livraison et de casse) :

- frais de livraison calculés par zone plutôt que négociés au cas par cas ;
- remise automatique au-delà d'un seuil de quantité ;
- photo horodatée au départ et au retour du matériel, pour arbitrer un
  désaccord sur la casse sans dépendre de la parole de l'une des parties.

## 9. Messagerie asynchrone client ↔ prestataire

**À distinguer du chat temps réel** (explicitement hors périmètre ci-dessous) :
un fil de messages rattaché à une demande de réservation existante, rafraîchi
par intervalle comme le sont déjà les notifications (`useNotifications`,
`refetchInterval`), sans WebSocket. Cette distinction n'est pas cosmétique :
un fil de discussion ouvert à tout visiteur est une surface de spam et
d'abus ; rattaché à une `booking_request` réelle, il hérite de ses policies
RLS (seuls le client et le prestataire concernés y accèdent).

**Travail** : tables `conversations` (1–1 avec une `booking_request`) et
`messages`, policies RLS symétriques à celles de `booking_requests`,
statut lu/non lu, notification à la réception (réutilise
`notify_booking_*` comme modèle).

Ne dépend d'aucun autre chantier — buildable indépendamment de l'encaissement.

## 10. Avis notés, distincts du score de fiabilité

Le score de fiabilité (chantier 4) est calculé par la plateforme à partir de
faits observables (présence, ponctualité, conformité) — il ne se manipule
pas. Un avis noté est un texte libre écrit par un client : utile, mais sujet
aux faux avis et aux règlements de compte, donc à traiter séparément.

**Dépend de** : chantier 4 / `docs/specs/BOOKING-LIFECYCLE.md` — un avis n'a
de sens qu'après le statut `completed`, qui n'existe pas encore.

**Travail** : table `reviews` (note 1–5, commentaire, `booking_id` unique
pour empêcher plusieurs avis sur la même réservation), policy RLS limitant
l'écriture au client dont la réservation est `completed`, modération admin
en cas de signalement (chantier 11).

## 11. Signalement et litiges

**Dépend de** : chantiers 9 et 10 — un signalement porte sur un message, un
avis ou une annonce ; sans eux, rien à signaler.

**Travail** : table `reports` (cible polymorphe : annonce, avis ou message,
motif, statut), file de modération admin, trace d'audit des décisions.

## 12. Rôle `support`

Demandé par le master prompt UX/UI (RBAC à 4 rôles), mais **prématuré tant
que rien n'a besoin de lui** : les chantiers 9, 10 et 11 sont ce qui donnerait
un contenu réel à ce rôle (traiter les signalements, répondre aux
utilisateurs). Créer le rôle avant ces chantiers produirait une permission
vide de tout pouvoir — voir la règle anti-sur-ingénierie de `CLAUDE.md`.

**Dépend de** : chantier 11 au minimum.

## 13. Vertical « Services », distinct des équipements

Un DJ, un traiteur ou un photographe ne se décrivent pas comme un stock de
`quantity` unités disponibles : ils se décrivent par des créneaux et une
zone de couverture. Fusionner ça dans `listings` tel qu'il existe
dénaturerait le modèle (`quantity` n'a pas de sens pour un service).

**Travail, avant tout code** : trancher explicitement si `listings` reçoit un
champ `listing_type` (`equipment` | `service`) avec des colonnes optionnelles
selon le type, ou si `services` devient une table séparée avec son propre
cycle de modération. Ce choix structure toute la suite — ne pas le faire à la
volée dans un correctif de composant.

Ne dépend d'aucun autre chantier.

## 14. Granularité géographique (région / commune / quartier)

`city` reste une liste fermée de villes (`src/constants/index.ts`), étendue
en pratique à la demande (Pikine, Guédiawaye, Rufisque ajoutées lors de
l'audit du 09/2026 sans migration, `city` étant un champ texte libre en
base). Une hiérarchie complète Région → Ville → Commune → Quartier est un
chantier de données à part entière : la lister pour Dakar seul (Almadies,
Mermoz, Sacré-Cœur, Plateau, Parcelles Assainies...) est déjà un travail de
saisie non trivial, et l'étendre aux 14 régions sans données fiables
produirait une liste incomplète pire que l'absence de liste.

**Ne pas** commencer par un champ `quartier` texte libre non structuré : ça
n'apporte aucune capacité de filtre réelle par rapport à `address` qui existe
déjà, et fait doublon front sans valeur.

## 15. Architecture mobile native

**Dépend de** : à peu près tout ce qui précède, car un client mobile
consomme la même API que le web. Aujourd'hui « l'API » est directement
Supabase avec RLS ; un client mobile pourrait déjà s'y brancher avec les
mêmes policies, sans backend supplémentaire, pour les fonctionnalités déjà
livrées (marketplace, favoris, demandes). Ce qui dépend du chantier 2
(service serveur) — paiement, WhatsApp — resterait indisponible côté mobile
tant que ce service n'existe pas, pour le web comme pour le mobile.

**Ne pas** dupliquer une règle métier dans le client mobile : le mobile
consomme les mêmes RLS/fonctions `security definer` que le web, jamais une
copie de la logique de disponibilité ou de capacité.

## Explicitement hors périmètre pour l'instant

Chat **temps réel** (WebSocket — voir chantier 9 pour l'alternative
asynchrone déjà planifiée), SMS, notifications push, GPS et suivi de
livraison en temps réel, commissions automatisées complexes (paliers,
parrainage), IA, système d'enchères. Chacun de ces sujets peut être
réexaminé une fois les chantiers ci-dessus livrés — pas avant, car aucun n'a
de prérequis satisfait aujourd'hui.

## Comment ajouter un chantier à cette liste

Un chantier n'entre ici que s'il répond à un problème déjà observé dans le
code ou dans l'usage réel — pas à une fonctionnalité qu'un concurrent
possède. Préciser systématiquement : le problème concret, ce qu'il débloque en
aval, ce dont il dépend en amont.
