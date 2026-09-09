# Spécification — Flux d'encaissement de l'acompte

**Statut : fondation livrée, encaissement réel non implémenté.** Détaille le
chantier n°2 de `docs/ROADMAP.md`. Ce qui suit décrit le flux **visé** ;
la partie réellement construite (schéma, verrouillage RLS, fonction Edge de
réception de webhook) est marquée explicitement à chaque étape concernée.
Aucun compte marchand Wave/Orange Money réel n'est branché : ne pas
présenter ce document comme une intégration de paiement fonctionnelle.
Détail d'implémentation : `supabase/functions/payment-webhook/README.md`.

## Pourquoi un acompte, pas le paiement complet

Le marché cible reste majoritairement en espèces (`docs/PRODUCT.md`,
section « Contexte marché »). Imposer le tout-numérique ferait fuir. On ne
capture par voie électronique que l'acompte (proposition : 20 %) ; le solde
reste réglable en espèces à la livraison. Ce choix n'est pas une limite
technique — c'est une décision produit à ne pas « corriger » en implémentant
un paiement intégral sans validation préalable du marché.

## Pourquoi ça ne peut pas vivre dans cette SPA

Un webhook de paiement doit vérifier une signature avec un secret qui ne doit
**jamais** atteindre le navigateur (`docs/SECURITY.md`, section « Acompte
(chantier n°2) »). Cela suppose un service serveur : ici une fonction Edge
Supabase, `supabase/functions/payment-webhook/` — voir `prisma/README.md`
pour la vue d'ensemble de cette couche.

## Le flux

```
Client confirme la demande
        │
        ▼
Service serveur crée une intention de paiement            ← PAS ENCORE CONSTRUIT
(montant = 20 % du total, devise XOF)                        (suppose un compte marchand réel)
        │
        ▼
Client redirigé vers Wave / Orange Money                   ← PAS ENCORE CONSTRUIT
        │
        ▼
Provider de paiement notifie le service serveur (webhook)
        │
        ▼
   Vérifications obligatoires, dans cet ordre :             ← CONSTRUIT
   1. Signature du webhook (secret serveur uniquement)         (supabase/functions/payment-webhook/)
   2. Idempotence — un même identifiant d'événement rejoué n'a aucun effet
      la seconde fois (table d'événements traités, contrainte UNIQUE)
   3. Montant reçu = montant attendu (jamais fait confiance au frontend)
   4. Devise = XOF
   5. La demande référencée existe et est encore dans un état où un
      paiement est attendu (pas déjà annulée entre-temps)
        │
        ▼
Transition payment_status → 'paid'                          ← CONSTRUIT (chaîne séparée de
(booking_status n'est pas touché — voir                        booking_status, voir BOOKING-LIFECYCLE.md,
BOOKING-LIFECYCLE.md)                                           « Migration »)
        │
        ▼
Notification WhatsApp au client et au prestataire (chantier 3)  ← PAS ENCORE CONSTRUIT
```

Sans l'étape « Service serveur crée une intention de paiement » (qui suppose
un compte marchand réel), aucune demande n'a de `payment_reference` : le
webhook reçoit alors un événement mais ne trouve aucune correspondance et le
rejette proprement (journalisé dans `payment_events`) — c'est le
comportement correct de cette fondation, pas un bug.

## Ce que le frontend a le droit de faire

- Afficher l'état courant lu depuis la base : `booking_status`
  (`pending`/`accepted`/...) et `payment_status`
  (`none`/`pending`/`paid`/...), deux chaînes séparées — voir
  `docs/specs/BOOKING-LIFECYCLE.md`.
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

## Traçabilité — construit

Chaque webhook reçu — accepté ou rejeté — est journalisé (`payment_events`)
avec son horodatage, son identifiant d'événement, et la raison d'un rejet
éventuel. Sans cette journalisation, un litige de paiement ne peut pas être
instruit. Lisible par un administrateur uniquement (`docs/SECURITY.md`).

## Rattachement à la sécurité

Ce flux ne fait qu'appliquer, à un sous-système précis, la même philosophie
que RLS applique déjà à toute la base : *la confirmation vient toujours d'un
endroit que l'utilisateur ne contrôle pas.* Voir `docs/SECURITY.md`.
