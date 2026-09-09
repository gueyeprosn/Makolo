# Règle — Couche de données

1. Aucun composant ni hook ne référence `supabase-backend.ts` ou
   `demo-backend.ts` directement. Seul point d'entrée :
   `import { api } from '@/services'`.

2. Toute règle de disponibilité passe par `buildAvailability()`
   (`src/services/demo-backend.ts`), utilisée par les deux backends. Ne pas
   réimplémenter le calcul ailleurs.

3. Un champ ajouté au schéma SQL (`scripts/sql/01_schema.sql`) se répercute,
   dans le même changement, dans : `src/types/index.ts`, le schéma Zod
   concerné (`lib/validations.ts`), les deux backends, et
   `prisma/schema.prisma` si la couche serveur en dépend déjà.

4. Ne jamais utiliser `prisma migrate` sur ce projet. La source de vérité du
   schéma est `scripts/sql/`. Prisma se réaligne par `prisma db pull` (voir
   `prisma/README.md`).
