---
description: Lance typecheck, tests et build, et rapporte l'état réel du projet
---

Exécute dans l'ordre et rapporte le résultat de chaque étape sans t'arrêter à
la première réussie :

1. `npm run typecheck`
2. `npm run test`
3. `npm run build`

Si une étape échoue, diagnostique la cause réelle dans le code (ne propose pas
de contourner l'erreur par un `@ts-ignore`, un test désactivé ou un
assouplissement de `tsconfig` sans justification explicite), corrige, puis
relance uniquement les étapes affectées avant de reprendre depuis le début.

Termine par un résumé à trois lignes : typecheck, tests (nombre de tests
passés), build (taille des bundles). Si tout est vert, ne propose pas d'autres
changements non demandés.
