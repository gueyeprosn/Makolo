# Règle — Cohérence d'interface

1. Un nouveau contrôle d'interface (bouton, champ, modale...) passe d'abord
   par `src/components/ui/` avant d'être utilisé dans une page. Ne pas styler
   un élément HTML brut en dehors de ce dossier.

2. Toute vue qui dépend d'une requête réseau gère explicitement les quatre
   états : chargement (`Skeleton*`), vide (`EmptyState`), erreur
   (`ErrorState`), succès. Une page qui « a l'air chargée » sans squelette ni
   message d'erreur explicite n'est pas terminée.

3. Toute action destructrice (suppression, refus, désactivation) passe par
   `ConfirmDialog`, avec un texte qui nomme l'élément concerné — jamais un
   « êtes-vous sûr ? » générique.

4. Icônes : Lucide uniquement. Ne jamais introduire une seconde bibliothèque
   d'icônes.

5. Un message d'erreur affiché à l'utilisateur passe par `lib/errors.ts`
   (`errorMessage()`). Un code technique brut (`PostgrestError`, `23505`,
   stack trace) ne doit jamais atteindre l'écran.
