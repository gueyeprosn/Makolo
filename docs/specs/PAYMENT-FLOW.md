# Spécification — Flux d'encaissement de l'acompte

**Statut : non implémenté.** Détaille le chantier n°2 de `docs/ROADMAP.md`.
Aucune ligne de code de ce dépôt n'implémente ceci aujourd'hui — ne pas
présenter ce document comme une description de fonctionnalité existante.

## Pourquoi un acompte, pas le paiement complet

Le marché cible reste majoritairement en espèces (`docs/PRODUCT.md`,
section « Contexte marché »). Imposer le tout-numérique ferait fuir. On ne
capture par voie électronique que l'acompte (proposition : 20 %) ; le solde
reste réglable en espèces à la livraison. Ce choix n'est pas une limite
technique — c'est une décision produit à ne pas « corriger » en implémentant
un paiement intégral sans validation préalable du marché.

## Pourquoi ça ne peut pas vivre dans cette SPA

Un webhook de paiement doit vérifier une signature avec un secret qui ne doit
**jamais** atteindre le navigateur (`docs/SECURITY.md`, section
« Ce qui reste à faire avant un vrai encaissement »). Cela suppose un service
serveur — voir `prisma/README.md` pour ce que cette couche doit héberger.

## Le flux

```
Client confirme la demande
        │
        ▼
Service serveur crée une intention de paiement
(montant = 20 % du total, devise XOF)
        │
        ▼
Client redirigé vers Wave / Orange Money
        │
        ▼
Provider de paiement notifie le service serveur (webhook)
        │
        ▼
   Vérifications obligatoires, dans cet ordre :
   1. Signature du webhook (secret serveur uniquement)
   2. Idempotence — un même identifiant d'événement rejoué n'a aucun effet
      la seconde fois (table d'événements traités, contrainte UNIQUE)
   3. Montant reçu = montant attendu (jamais fait confiance au frontend)
   4. Devise = XOF
   5. La demande référencée existe et est encore dans un état où un
      paiement est attendu (pas déjà annulée entre-temps)
        │
        ▼
Transition booking_status → deposit_paid (voir BOOKING-LIFECYCLE.md)
        │
        ▼
Notification WhatsApp au client et au prestataire (chantier 3)
```

## Ce que le frontend a le droit de faire

- Afficher l'état courant (`pending`, `accepted`, `deposit_paid`...) lu depuis
  la base.
- Rediriger vers l'URL de paiement fournie par le service serveur.
- Afficher un état « en attente de confirmation » après le retour du
  provider, **sans jamais** marquer la demande comme payée localement.

## Ce que le frontend n'a jamais le droit de faire

- Décider qu'un paiement a réussi. Le seul fait qu'un provider ait redirigé
  l'utilisateur vers une page de succès ne prouve rien côté serveur — un
  utilisateur peut naviguer manuellement vers cette URL.
- Calculer le montant de l'acompte à envoyer au provider. Le service serveur
  le recalcule à partir du prix réel de l'annonce et de la quantité
  acceptée ; ne jamais transmettre un montant construit côté client sans le
  revérifier.

## Séquestre et reversement

L'acompte est retenu par la plateforme jusqu'à la date de l'événement (ou
jusqu'au statut `fulfilled` du chantier BOOKING-LIFECYCLE), puis reversé au
prestataire net de commission. Le calcul de commission n'est pas encore
spécifié — ne pas l'implémenter avant qu'un taux et une assiette (GMV ? net
de frais d'encaissement ?) soient explicitement validés.

## Traçabilité

Chaque webhook reçu — accepté ou rejeté — est journalisé avec son horodatage,
son identifiant d'événement, et la raison d'un rejet éventuel. Sans cette
journalisation, un litige de paiement ne peut pas être instruit.

## Rattachement à la sécurité

Ce flux ne fait qu'appliquer, à un sous-système précis, la même philosophie
que RLS applique déjà à toute la base : *la confirmation vient toujours d'un
endroit que l'utilisateur ne contrôle pas.* Voir `docs/SECURITY.md`.
