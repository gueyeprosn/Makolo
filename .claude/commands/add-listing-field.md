---
description: Ajoute un champ à la table listings, de bout en bout
argument-hint: <nom_du_champ> <type> <description>
---

Ajoute le champ `$ARGUMENTS` à `listings` en suivant `.claude/rules/data-layer.md`.
Dans l'ordre, sans sauter d'étape :

1. **SQL** — `scripts/sql/01_schema.sql` : colonne + `CHECK` si pertinent
   + index si le champ sert à filtrer/trier. Vérifier si `02_rls.sql` a besoin
   d'un ajustement (le champ doit-il être visible par un visiteur ? modifiable
   uniquement par le propriétaire ?).
2. **Types** — `src/types/index.ts` (`Listing`, et `ListingWithRelations` si
   pertinent).
3. **Validation** — `src/lib/validations.ts` (`listingSchema`), avec un
   message d'erreur en français.
4. **Les deux backends** — `demo-backend.ts` ET `supabase-backend.ts` :
   création, mise à jour, mapping de lecture. Rappelle-toi : si un seul des
   deux backends gère le champ, l'autre mode ment silencieusement à
   l'utilisateur.
5. **Interface** — `ListingFormPage` (formulaire), `ListingCard` ou
   `ListingDetailPage` si le champ doit être visible.
6. **Données de démonstration** — `src/services/demo/data.ts` si le champ est
   attendu sur les annonces existantes du jeu de démo.
7. **Documentation** — `docs/DATABASE.md` (tableau des tables ou des
   contraintes) et `docs/BUSINESS-RULES.md` si le champ porte une règle
   métier.
8. **Tests** — étendre `tests/unit/validations.test.ts` a minima.

Termine par `npm run verify`.
