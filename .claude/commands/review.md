---
description: Revue senior d'un changement — correction, cohérence architecturale, sécurité, absence de simulation
argument-hint: [fichiers ou diff à relire ; par défaut, les changements non commités]
---

Relis le changement (`$ARGUMENTS`, ou `git diff` si rien n'est précisé) comme
le ferait un ingénieur senior qui n'a pas écrit le code, sans le modifier sauf
demande explicite.

Vérifie, dans cet ordre de gravité :

1. **Simulation.** Une donnée métier est-elle stockée dans un `useState` local
   qui s'oublie au rechargement, alors qu'elle devrait persister ? Un bouton
   déclenche-t-il réellement l'action que son libellé annonce ? C'est la
   Règle d'or de `CLAUDE.md` — la seule catégorie de défaut qui bloque
   systématiquement une revue, quelle que soit la qualité du reste.
2. **Autorité de la règle.** Si le changement introduit une règle métier,
   est-elle appliquée côté base (contrainte, policy, trigger) et pas
   seulement dans `lib/permissions.ts` ou un composant ? Voir
   `.claude/rules/security.md`.
3. **Cohérence des deux backends.** Si `src/services/` est touché, les deux
   implémentations produisent-elles le même résultat pour les mêmes entrées ?
4. **États d'interface.** Chargement, vide, erreur, succès — les quatre
   sont-ils gérés pour toute vue qui dépend d'une requête réseau ? Voir
   `.claude/rules/ui-consistency.md`.
5. **Cohérence avec l'existant.** Le changement duplique-t-il un composant de
   `src/components/ui/` déjà disponible ? Casse-t-il un parcours documenté
   dans `docs/USER-JOURNEYS.md` ?
6. **Tests.** Une règle métier qui change de comportement change-t-elle son
   test dans `tests/unit/` au même endroit ?
7. **Documentation.** `docs/BUSINESS-RULES.md`, `docs/DATABASE.md` ou
   `docs/ROADMAP.md` doivent-ils être mis à jour dans ce même changement ?

Rapporte chaque écart trouvé avec le fichier et la ligne concernés, classé
par gravité (bloquant / à corriger / remarque). Si le changement est propre,
dis-le en une phrase — ne fabrique pas une remarque pour justifier la revue.
