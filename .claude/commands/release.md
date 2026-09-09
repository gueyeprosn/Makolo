---
description: Prépare une livraison — vérifie l'état du dépôt avant de pousser, sans processus de version formel absent du projet
---

Ce dépôt n'a pas de versionnage sémantique ni de changelog automatisé
aujourd'hui. Ne pas en inventer un à la volée (numéro de version dans
`package.json`, tag Git) sans que l'utilisateur l'ait demandé explicitement —
ce serait introduire un processus qui n'existe pas plutôt que de préparer un
livrable réel.

Avant de pousser un ensemble de changements comme une livraison cohérente :

1. `npm run verify` intégralement vert.
2. `git status` propre — rien d'inattendu non suivi ou non stagé qui
   partirait par erreur dans le commit.
3. Relire `git diff --cached --stat` : la liste des fichiers correspond-elle
   exactement à ce qui a été demandé, sans fichier oublié ni modification
   accidentelle (`tsconfig.*.tsbuildinfo`, `coverage/` — déjà exclus par
   `.gitignore`, mais vérifier qu'aucun secret ne s'est glissé, voir
   `.claude/rules/security.md`).
4. Message de commit en français, qui explique le *pourquoi* et pas
   seulement le *quoi* — voir les messages de commit déjà présents dans
   l'historique du dépôt comme référence de niveau de détail attendu.
5. Si le changement touche une règle métier ou le schéma, confirme que
   `docs/BUSINESS-RULES.md`, `docs/DATABASE.md` ou `docs/ROADMAP.md` ont été
   mis à jour dans le même commit, pas dans un commit séparé « docs » qui
   laisserait une fenêtre où le code et sa documentation divergent.
6. Ne pousser qu'après confirmation explicite de l'utilisateur si l'action
   est demandée sans qu'il ait validé le contenu — jamais par réflexe en fin
   de tâche.

Termine par un résumé du commit préparé (titre, fichiers, résultat de
`npm run verify`) avant de pousser.
