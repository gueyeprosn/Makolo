# payment-webhook

Fonction Edge Supabase (Deno) — chantier n°2 de `docs/ROADMAP.md`, détaillé
dans `docs/specs/PAYMENT-FLOW.md`. **Fondation uniquement : aucun compte
marchand Wave / Orange Money réel n'est branché**, ce code n'a jamais reçu de
trafic d'un provider réel. Ne pas présenter ce dossier comme une intégration
de paiement fonctionnelle.

## Pourquoi une fonction Edge, et pas le service Node de `prisma/README.md`

`prisma/README.md` envisageait un service Node séparé pour toute la future
couche serveur. Pour ce webhook précis, une fonction Edge Supabase remplit
exactement le même rôle (un secret de signature qui ne quitte jamais le
navigateur, un rôle qui contourne RLS) sans ajouter un service à héberger et
surveiller séparément : elle vit dans le même projet Supabase que la base.
Les autres besoins serveur listés dans `prisma/README.md` (WhatsApp, factures,
rapprochements) restent ouverts entre service Node et fonctions Edge
additionnelles — ce choix n'est tranché que pour le webhook de paiement.

## Ce qui est réellement fait ici

- Vérification de signature réelle : `Wave-Signature` (`t=...,v1=...`,
  HMAC-SHA256, fenêtre de rejeu de 5 minutes) selon la documentation
  publique de Wave (`signature.ts`, testé par
  `tests/unit/payment-webhook-signature.test.ts`).
- Idempotence : un `provider_event_id` déjà journalisé dans `payment_events`
  ne déclenche aucun second traitement.
- Vérification du montant et de la devise face à ce que la demande attend
  (`booking_requests.deposit_amount`), jamais face à une valeur reçue du
  frontend.
- Écriture de `payment_status` via `service_role` — la seule voie autorisée
  par `scripts/sql/02_rls.sql` (verrou colonne par colonne).
- Journalisation systématique, acceptée ou rejetée, dans `payment_events`.

## Ce qui manque encore (voir aussi la note en bas de `index.ts`)

1. **Un compte marchand réel** et les secrets d'environnement
   correspondants — sans eux, cette fonction ne reçoit jamais de requête
   d'un vrai provider.
2. **L'endpoint de création d'intention de paiement**, appelé quand le
   client confirme sa demande : calcule `deposit_amount`, appelle l'API
   Wave/Orange Money pour ouvrir une session de paiement, pose
   `payment_reference` + `payment_status = 'pending'` sur la demande, puis
   redirige le client. Sans cette étape, aucune demande n'a de
   `payment_reference` à faire correspondre — le webhook rejette alors
   proprement (« demande introuvable »), ce qui est le comportement correct
   tant que cette étape n'existe pas.
3. **Le schéma exact des webhooks Orange Money** n'a pas de documentation
   publique canonique trouvée au moment de l'écriture ; `signature.ts`
   implémente un schéma HMAC générique explicitement marqué comme à
   confirmer avant toute mise en production.
4. **Séquestre et reversement au prestataire** (`docs/specs/PAYMENT-FLOW.md`).

## Variables d'environnement (à définir sur le projet Supabase, jamais côté client)

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
WAVE_WEBHOOK_SECRET=...
ORANGE_MONEY_WEBHOOK_SECRET=...
```

`SUPABASE_SERVICE_ROLE_KEY` contourne RLS : ne jamais la préfixer `VITE_`, ne
jamais la faire atteindre le navigateur (voir `docs/SECURITY.md`).

## Déploiement (une fois les prérequis ci-dessus réunis)

```
supabase functions deploy payment-webhook --no-verify-jwt
supabase secrets set WAVE_WEBHOOK_SECRET=... ORANGE_MONEY_WEBHOOK_SECRET=...
```

`--no-verify-jwt` : ces requêtes viennent du provider de paiement, pas d'un
utilisateur Supabase Auth — l'authenticité est garantie par la vérification
de signature ci-dessus, pas par un jeton Supabase.

## Tester la logique sans compte marchand

```
npm run test -- payment-webhook-signature
```

Ce test construit de vraies signatures HMAC-SHA256 (avec un secret de test)
et vérifie que `signature.ts` les accepte ou les rejette correctement — y
compris le rejeu hors fenêtre et la rotation de clé (plusieurs `v1=`). Il ne
teste pas `index.ts` lui-même, qui suppose un client Supabase et un vrai
projet déployé.
