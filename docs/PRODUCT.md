# Produit

## Ce que fait MAKALO

Une place de marché sénégalaise de location de matériel événementiel. Elle met en
relation des organisateurs (particuliers, entreprises, traiteurs) et des loueurs
de chaises, tables, tentes, sonorisation, éclairage, décoration et accessoires.

MAKALO **n'est pas** un loueur : le contrat se conclut entre le client et le
prestataire. La plateforme apporte la découverte, la vérification de
disponibilité et le suivi de la demande.

## Le parcours, en une ligne

```
Accueil → Recherche → Catégorie → Annonce → Date → Quantité → Demande → Réponse → Suivi
```

Toute proposition d'évolution qui allonge ce chemin doit se justifier par une
augmentation mesurable de la conversion ou de la confiance.

## Les trois rôles

### Client (`client`)
Cherche, compare, met en favori, vérifie la disponibilité à une date, envoie une
demande, suit son statut, annule tant qu'elle est en attente.

### Prestataire (`provider`)
Publie ses annonces (brouillon → soumission → publication après modération),
téléverse ses photos, définit prix et stock, reçoit les demandes, accepte ou
refuse.

### Administrateur (`admin`)
Modère les annonces (publier / refuser avec motif / archiver / supprimer), gère
les utilisateurs et les catégories, supervise l'ensemble des demandes.

Le rôle `admin` **ne peut jamais** être obtenu à l'inscription : le trigger SQL
`handle_new_user()` force toute valeur autre que `provider` vers `client`.
La promotion se fait uniquement en base.

## Métrique nord

**Nombre de commandes payées sur la plateforme, par mois.**

Ni les inscriptions, ni les annonces publiées, ni le trafic. Une annonce qui ne
se loue jamais ne crée aucune valeur. Cette métrique n'est pas encore
instrumentée : elle le devient avec l'encaissement (voir `ROADMAP.md`).

## Indicateurs secondaires

| Indicateur | Ce qu'il révèle |
|---|---|
| Taux de fuite | Part des demandes acceptées qui se concluent hors plateforme — mesure la viabilité du modèle |
| Délai de réponse prestataire | Premier facteur de conversion |
| Taux d'acceptation | Indique si la disponibilité affichée est sincère |
| Prestataires actifs | Un inscrit sans commande n'existe pas |
| GMV par prestataire actif | Mesure l'utilité réelle rendue au prestataire |

## Périmètre couvert aujourd'hui

- Marketplace : recherche plein texte, filtres (catégorie, ville, prix,
  disponibilité), tri, pagination ; l'état vit dans l'URL, donc partageable.
- Disponibilité calculée par date à partir des demandes acceptées.
- Favoris, demandes de réservation, notifications in-app.
- CRUD complet des annonces avec téléversement d'images.
- Back-office de modération.

## Hors périmètre, volontairement

Paiement en ligne, Wave / Orange Money, facturation, chat temps réel, SMS,
notifications push, GPS et suivi de livraison, commissions automatisées, IA,
enchères.

Ce n'est pas un oubli : chacun de ces sujets suppose une couche serveur qui
n'existe pas encore. `ROADMAP.md` indique dans quel ordre les ouvrir.

## Contexte marché à ne pas perdre de vue

- **Le cash domine.** Imposer le tout-numérique fait fuir. L'encaissement à venir
  ne portera que sur un acompte ; le solde reste réglable en espèces.
- **WhatsApp est le canal de décision.** L'e-mail ne porte pas. Les notifications
  produit doivent y aller.
- **La saisonnalité est extrême.** Pic en décembre-janvier, creux en
  juillet-août (hivernage). Les grands rendez-vous religieux (Magal, Gamou,
  Tabaski, Korité) suivent le calendrier lunaire et se décalent chaque année :
  ne jamais les coder en dur sur un mois.
- **L'informalité est la norme.** Beaucoup de prestataires n'ont ni NINEA ni
  capacité à facturer. C'est une contrainte, et une opportunité côté B2B.
