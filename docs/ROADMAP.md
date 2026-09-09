# Feuille de route technique

Ordonnée par dépendance, pas par facilité. Chaque chantier précise ce qu'il
débloque et ce sur quoi il s'appuie. Ne pas commencer un chantier tant que ses
prérequis ne sont pas livrés — un webhook de paiement sans acompte livré n'a
rien à confirmer, une facture sans compte Entreprise n'a personne à qui
l'adresser.

## Légende

- **Bloquant** : rien en aval ne peut être construit sans ce chantier.
- **Fondation** : touche le schéma de données ; migration SQL requise.

## 1. Réservation sur une période — Bloquant · Fondation

**Problème réel** (voir `docs/DATABASE.md`, section « Limite connue ») :
`booking_requests.requested_date` est une date unique. Une location court en
réalité de la livraison la veille à la reprise le lendemain — trois jours de
stock immobilisé comptés comme un seul. Le calcul de disponibilité est faux
dès la deuxième réservation qui chevauche la même période.

**Travail** :
1. Migration SQL : ajouter `requested_from` / `requested_to` (`date`),
   reprendre l'existant avec `from = to = requested_date`, supprimer
   `requested_date` dans une migration séparée une fois le code basculé.
2. Réécrire `listing_availability()` en test de chevauchement de plages
   (`from <= p_to AND to >= p_from`), plus l'index
   `bookings_no_duplicate_pending` qui devient un test de recouvrement plutôt
   que d'égalité.
3. Répercuter dans `buildAvailability()` (les deux backends) et dans
   `BookingDialog` (deux sélecteurs de date, ou un sélecteur de plage).
4. Étendre `tests/unit/availability.test.ts` aux cas de chevauchement partiel.

**Débloque** : tout calcul de disponibilité correct, donc tout ce qui suit.

## 2. Encaissement d'acompte — Bloquant · Fondation

**Problème réel** : aucune transaction ne passe par la plateforme. Client et
prestataire concluent hors ligne dès que le téléphone est visible ; MAKALO ne
capture aucune valeur de la mise en relation qu'elle a pourtant produite.

**Travail** :
1. Service serveur (hors de cette SPA — voir `prisma/README.md`) recevant les
   webhooks Wave / Orange Money : vérification de signature, idempotence,
   journalisation systématique (voir `docs/SECURITY.md`).
2. Nouveau statut de demande ou champ `payment_status` distinct de
   `booking_status` — une demande peut être `accepted` sans acompte encore
   confirmé.
3. Séquestre : l'acompte n'est reversé au prestataire qu'après la date de
   l'événement, net de commission.
4. Jamais de confirmation de paiement acceptée depuis le seul frontend.

**Débloque** : toute commission, donc tout modèle de revenu.

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

## Explicitement hors périmètre pour l'instant

Chat temps réel, SMS, notifications push, GPS et suivi de livraison en temps
réel, commissions automatisées complexes (paliers, parrainage), IA, système
d'enchères. Chacun de ces sujets peut être réexaminé une fois les huit
chantiers ci-dessus livrés — pas avant, car aucun n'a de prérequis satisfait
aujourd'hui.

## Comment ajouter un chantier à cette liste

Un chantier n'entre ici que s'il répond à un problème déjà observé dans le
code ou dans l'usage réel — pas à une fonctionnalité qu'un concurrent
possède. Préciser systématiquement : le problème concret, ce qu'il débloque en
aval, ce dont il dépend en amont.
