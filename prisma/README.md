# prisma/

Ce dossier prépare la **couche serveur** de MAKALO. Il n'est pas utilisé par
l'application front-end actuelle.

## Pourquoi il n'est pas branché

L'application est une SPA Vite qui parle à Supabase via la clé publique `anon`.
La sécurité repose sur les policies RLS (`scripts/sql/02_rls.sql`), évaluées par
Postgres à chaque requête.

Prisma ne tourne pas dans un navigateur et ignore RLS. L'utiliser côté client
supposerait d'exposer une connexion Postgres complète : toutes les garanties de
cloisonnement entre prestataires tomberaient d'un coup.

## À quoi il servira

Un service Node distinct (Fastify, Express ou route API Next.js), qui portera ce
que le navigateur ne peut pas faire :

| Besoin | Pourquoi côté serveur |
|---|---|
| Webhooks Wave / Orange Money | La signature du webhook doit être vérifiée avec un secret jamais exposé |
| Messages WhatsApp Business | Jeton d'API confidentiel |
| Factures PDF (NINEA / TVA) | Numérotation séquentielle fiable, archivage légal |
| Relances et rapprochements | Tâches planifiées, hors session utilisateur |

## Règle d'évolution du schéma

La source de vérité reste **`scripts/sql/01_schema.sql`**.

1. Modifier le SQL et l'appliquer sur Supabase.
2. `npx prisma db pull` pour réaligner `schema.prisma`.
3. `npx prisma generate`.

Ne jamais faire l'inverse : `prisma migrate` écraserait les triggers, les
fonctions `security definer` et les policies RLS, qui sont l'essentiel de la
logique de sécurité et n'existent pas dans le modèle Prisma.

## Variables d'environnement (service serveur uniquement)

```env
DATABASE_URL="postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@...supabase.com:5432/postgres"
SUPABASE_SERVICE_ROLE_KEY="..."
```

`SUPABASE_SERVICE_ROLE_KEY` **contourne RLS**. Toute requête du service serveur
doit filtrer explicitement par utilisateur. Cette clé ne doit jamais être
préfixée `VITE_` ni atteindre le navigateur.
