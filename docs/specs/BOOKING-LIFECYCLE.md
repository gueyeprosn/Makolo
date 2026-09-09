# Spécification — Cycle de vie étendu de la réservation

**Statut : non implémenté.** Ce document détaille le chantier n°1 de
`docs/ROADMAP.md` (réservation sur une période) et prépare le terrain du
chantier n°2 (paiement). Il ne décrit rien de ce qui tourne aujourd'hui — le
cycle réellement implémenté est dans `docs/DATABASE.md` (« Cycle de vie d'une
demande ») et `docs/BUSINESS-RULES.md`.

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

- **Ne pas** introduire ces statuts avant le chantier 1 (réservation sur une
  période). `fulfilled` n'a pas de sens tant que « la date de l'événement »
  reste une date unique ambiguë entre livraison et reprise.
- **Ne pas** introduire `deposit_paid` avant le chantier 2 (encaissement).
  Un statut de paiement sans paiement réel est une simulation — voir la
  Règle d'or de `CLAUDE.md`.
- **Ne pas** fusionner ce statut avec un champ libre `payment_status` sans
  y réfléchir : garder les deux machines d'état séparées
  (`booking_status` pour l'engagement, `payment_status` pour l'argent) évite
  qu'un échec de paiement ne force une transition de réservation invalide.

## Migration, quand ce chantier s'ouvre

1. Étendre l'enum `booking_status` (`ALTER TYPE ... ADD VALUE`, irréversible
   en une seule transaction sous Postgres — prévoir une fenêtre de
   maintenance ou une double-écriture).
2. Ajouter la colonne `payment_status` séparée plutôt que de surcharger
   `booking_status`.
3. Étendre `enforce_booking_provider()` et ajouter un nouveau trigger
   `enforce_booking_lifecycle_transition()` sur le même modèle que
   `enforce_listing_status_transition()` (`docs/SECURITY.md`) : chaque
   transition a une autorité précise (client, prestataire, tâche planifiée,
   jamais le frontend seul pour `deposit_paid`).
4. Étendre `tests/unit/` avec un test par transition autorisée et par
   transition refusée, sur le modèle de `tests/unit/permissions.test.ts`.
