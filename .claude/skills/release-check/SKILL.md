---
name: release-check
description: Checklist de fin de tâche pour MAKALO — vérifie typecheck, tests, build, permissions, états UI, responsive et absence de régression avant de déclarer une fonctionnalité terminée. Utiliser avant de clore toute tâche non triviale sur ce dépôt.
---

# Vérification de fin de tâche — MAKALO

Cette checklist opérationnalise la section « Definition of done » de
`CLAUDE.md`. Ne déclare une tâche terminée qu'après l'avoir parcourue.

## 1. Vérification technique

```
npm run verify
```

équivaut à `typecheck` → `test` → `build` dans l'ordre. Si une étape échoue,
corrige la cause réelle (jamais un `@ts-ignore`, un test commenté, ou un
assouplissement de configuration sans le justifier explicitement dans la
réponse à l'utilisateur).

## 2. Permissions

Si le changement touche une annonce, une demande de réservation, un profil ou
une catégorie : relis `docs/SECURITY.md` et `docs/BUSINESS-RULES.md` pour la
ressource concernée. Demande-toi explicitement : *qui, avec ce changement, peut
maintenant faire quelque chose qu'il ne pouvait pas faire avant ?* Si la
réponse touche RLS ou un trigger, invoque l'agent `rls-auditor` plutôt que de
relire le SQL à l'œil.

## 3. États d'interface

Pour toute vue modifiée qui dépend d'une requête réseau, vérifie que les
quatre états existent réellement dans le code, pas seulement dans l'intention :
chargement (`Skeleton*`), vide (`EmptyState`), erreur (`ErrorState`), succès
(`useToast`). Une page qui affiche juste les données sans ces états n'est pas
terminée — voir `docs/UX.md`.

## 4. Responsive

Si un composant ou une page a changé visuellement, vérifie mentalement (ou par
capture si l'outillage le permet) qu'aucun conteneur ne déborde à 320 px et
que rien ne dépend d'un survol souris pour être utilisable sur mobile.

## 5. Cohérence des deux backends

Si le changement touche `src/services/`, confirme que
`demo-backend.ts` et `supabase-backend.ts` produisent le même résultat pour
les mêmes entrées. Un écart entre les deux modes est un bug silencieux :
personne ne le voit tant que quelqu'un ne teste pas les deux.

## 6. Non-régression

Relis les parcours qui touchent le même fichier ou la même table que le
changement (`docs/BUSINESS-RULES.md` indexe les règles par table). Un ajout
qui casse une règle existante n'est pas acceptable même si le nouveau
comportement demandé fonctionne.

## 7. Documentation

Si le changement introduit ou modifie une règle métier, un chantier de
`docs/ROADMAP.md`, ou une décision de sécurité, mets à jour le document
correspondant dans le même changement — pas dans une tâche séparée « à
faire plus tard ».

## 8. Résumé final

Termine par un résumé factuel de ce qui a réellement changé : fichiers
touchés, résultat de `npm run verify`, et tout écart volontairement laissé de
côté avec sa raison. Ne pas présenter un travail partiel comme terminé.
