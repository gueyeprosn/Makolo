---
description: Vérifie une modification de schéma SQL (au-delà de RLS) — contraintes, index, migrations, cohérence avec les backends
argument-hint: <description du changement de schéma>
---

Un changement de schéma qui touche `scripts/sql/01_schema.sql` (colonnes,
contraintes, index — pas uniquement les policies, pour lesquelles `/audit-rls`
existe déjà) : `$ARGUMENTS`.

Vérifie, dans cet ordre :

1. **Contraintes.** Toute borne exprimée côté Zod (`src/lib/validations.ts`)
   a-t-elle son miroir en `CHECK` SQL ? Voir `docs/BUSINESS-RULES.md`,
   tableau « Validation (Zod ↔ SQL) » — c'est la référence à tenir à jour.
2. **Index.** Le nouveau champ sert-il à filtrer, trier ou joindre
   (`MarketplacePage`, une requête admin) ? Si oui, ajoute l'index
   correspondant dans `01_schema.sql` et documente-le dans le tableau
   « Index » de `docs/DATABASE.md`.
3. **Cascade et intégrité.** Une suppression doit-elle cascader
   (`on delete cascade`) ou être bloquée (`on delete restrict`, comme
   `categories → listings`) ? Vérifie que le comportement choisi correspond à
   ce que `ConfirmDialog` annonce à l'utilisateur avant suppression.
4. **Les deux backends.** `src/services/demo-backend.ts` et
   `src/services/supabase-backend.ts` reflètent-ils le nouveau champ de façon
   identique (mêmes règles de lecture, d'écriture, de valeur par défaut) ?
   Voir `.claude/rules/data-layer.md`.
5. **Prisma.** Si `prisma/schema.prisma` doit suivre (il ne le fait que si la
   couche serveur en dépend déjà — voir `prisma/README.md`), note-le
   explicitement plutôt que de le laisser diverger silencieusement.
6. **Test de non-régression.** Une modification de contrainte ou d'index ne
   se contente pas de compiler : exécute `npm run test` et, si la
   modification touche une policy ou un trigger, invoque `/audit-rls` en plus.

Termine par la liste des fichiers touchés et confirme que
`docs/DATABASE.md` reste une description exacte du schéma après le
changement — pas une photographie d'avant.
