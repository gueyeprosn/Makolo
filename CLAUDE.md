# MAKALO — Contexte d'ingénierie

MAKALO est une marketplace sénégalaise de location de matériel événementiel
(chaises, tables, tentes, sonorisation, éclairage, décoration, accessoires).
Elle met en relation clients et prestataires ; un back-office administre
utilisateurs, annonces et catégories.

**Ce n'est pas un prototype.** Chaque fonctionnalité livrée doit réellement
fonctionner — état, validation, persistance, gestion d'erreur, chargement,
succès, permissions. Une interface soignée dont les boutons ne font rien est un
échec, pas un livrable partiel.

Ce fichier est la porte d'entrée. Le détail vit dans `docs/` ; ne le duplique
pas ici, référence-le.

| Question | Document |
|---|---|
| Que fait le produit, pour qui, avec quelle métrique de succès | `docs/PRODUCT.md` |
| Comment le code est organisé, la couche `services/` | `docs/ARCHITECTURE.md` |
| Schéma, triggers, règle de disponibilité | `docs/DATABASE.md` |
| Design system, états UI, accessibilité | `docs/UX.md` |
| RLS, rôles, ce qui protège quoi | `docs/SECURITY.md` |
| Chaque règle métier et où elle est appliquée | `docs/BUSINESS-RULES.md` |
| Prochains chantiers, dans quel ordre et pourquoi | `docs/ROADMAP.md` |
| Ce que chaque rôle peut réellement faire aujourd'hui, route par route | `docs/USER-JOURNEYS.md` |
| Conception détaillée d'un chantier non livré (statuts étendus, paiement) | `docs/specs/` |

## Principes fondamentaux

1. **Inspecter avant de modifier.** Lire le fichier concerné, chercher ses
   dépendances, comprendre l'existant avant d'écrire une ligne. Ne jamais
   spéculer sur du code non lu.
2. **Réutiliser, ne pas dupliquer.** Un nouveau composant d'interface passe
   par `src/components/ui/` avant d'apparaître dans une page. Une nouvelle
   règle métier vérifie d'abord si `lib/permissions.ts`, `lib/validations.ts`
   ou un trigger SQL existant ne la couvre pas déjà.
3. **Préserver ce qui fonctionne.** Ne pas casser un parcours testé pour en
   livrer un nouveau.
4. **Implémenter réellement.** Un bouton « Réserver » réserve. Un badge
   « Disponible » lit la disponibilité réelle (`listing_availability()`). Pas
   de `alert("Bientôt disponible")`, pas de simulation en `useState` local
   pour une donnée métier.
5. **Vérifier systématiquement** : états loading/error/empty/success,
   responsive, permissions, sécurité, performance — voir « Definition of
   done » plus bas.

## Comportement par défaut

```
ANALYSER → PLANIFIER → IMPLÉMENTER → TESTER → AUDITER → CORRIGER → VÉRIFIER
```

Quand la demande est claire, agir plutôt que décrire comment on agirait. Ne
poser une question bloquante que si une hypothèse raisonnable rendrait le
travail inutile ou risqué à défaire.

## Stack réelle (ne pas supposer autre chose)

React 18 + TypeScript strict, Vite, Tailwind, primitives Radix, React Router 6,
TanStack Query, React Hook Form + Zod, Supabase (Auth, Postgres, Storage,
RLS). Détail complet et arborescence : `docs/ARCHITECTURE.md`.

**Il n'existe pas de serveur applicatif séparé aujourd'hui.** La SPA parle
directement à Supabase avec la clé publique `anon`. Postgres — RLS et triggers
`security definer` — *est* la couche serveur. `prisma/` prépare la future
couche serveur (webhooks de paiement, WhatsApp, factures) ; elle n'est pas
branchée et ne doit pas être présentée comme l'étant (`prisma/README.md`).

La couche de données applicative suit un contrat unique
(`src/services/backend.ts`), implémenté à la fois par Supabase
(`supabase-backend.ts`) et par un backend de démonstration en mémoire
(`demo-backend.ts`, actif quand `.env` est absent). **Aucun composant
n'importe Supabase directement** — uniquement `import { api } from
'@/services'`. Toute méthode ajoutée au contrat doit être implémentée dans les
deux backends, avec la même règle métier dans les deux.

## État réel du produit vs. périmètre étendu

`docs/PRODUCT.md` décrit précisément ce qui est construit aujourd'hui : la
marketplace, la disponibilité par date, les demandes de réservation, les
favoris, les notifications in-app, le CRUD d'annonces avec upload d'images, la
modération.

Une vision plus large du produit — paiement, messagerie, avis, vérification
d'identité, géolocalisation, statuts de réservation étendus
(`CONFIRMED`/`PAID`/`IN_PROGRESS`/`COMPLETED`/`DISPUTED`...) — **n'est pas
implémentée**. `docs/ROADMAP.md` fixe l'ordre réel dans lequel ces chantiers
peuvent s'ouvrir, chacun avec ses prérequis. Ne pas construire un chantier
avant que son prérequis soit livré : un webhook de paiement sans acompte
livré n'a rien à confirmer.

Si une demande suppose une fonctionnalité qui n'existe pas (paiement, chat,
avis...), le dire explicitement plutôt que de la simuler, et proposer le
chantier `ROADMAP.md` correspondant.

## Sénégal — contraintes de marché à ne jamais perdre de vue

- Devise unique : FCFA (XOF), sans décimale à l'affichage (`formatPrice()`).
- Villes couvertes : `src/constants/index.ts` (`CITIES`) — Dakar, Thiès,
  Saint-Louis, Touba, Mbour, Kaolack, Ziguinchor, Diourbel.
- Téléphones validés au format sénégalais (préfixes `7[0678]`,
  `registerSchema`).
- Le cash domine : ne jamais concevoir un flux qui impose le tout-numérique.
- WhatsApp est le canal de décision réel, pas l'e-mail (voir `ROADMAP.md`,
  chantier notifications).
- Saisonnalité extrême et calendrier religieux lunaire (Magal, Tabaski,
  Korité) qui se décale chaque année — ne jamais coder un pic de demande sur
  un mois fixe.
- Langue d'interface : français. Le wolof et l'anglais ne sont pas
  implémentés ; ne pas ajouter de sélecteur de langue sans corpus réel.

## Mobile d'abord

Testé à 320 / 375 / 390 / 430 px, tablette, desktop. Aucune page ne défile
horizontalement dans son corps. Détail des composants et des états
obligatoires : `docs/UX.md`.

Pour une décision d'interface non déjà tranchée par `docs/UX.md`
(nouveau composant, page marketing, question d'accessibilité précise) :
`.claude/skills/ui-ux-pro-max/` — outil de recherche local vendoré depuis un
projet tiers (provenance et limites d'usage dans son `NOTICE.md`). Ne
jamais l'utiliser pour rouvrir la palette ou la typographie MAKALO, déjà
fixées.

## Sécurité — la règle qui prime sur toutes les autres

**Aucune donnée venant du navigateur n'est fiable.** Prix, disponibilité,
permissions, rôle, capacité de stock : tout est revérifié en base (RLS +
triggers), jamais seulement dans le composant React. `lib/permissions.ts`
n'est que du confort d'affichage ; s'il autorise quelque chose que la policy
RLS refuse, c'est la policy qui gagne, et l'écart est un bug à corriger.

Ne jamais exposer une clé `service_role`, un secret, un token privé côté
client, ni sous un nom `VITE_*`. Détail des policies, des fonctions
`security definer` et de la checklist de non-régression : `docs/SECURITY.md`.

## Base de données

Source de vérité : `scripts/sql/` (idempotents, dans l'ordre 01→04). Toute
évolution de schéma commence là, jamais par `prisma migrate` (qui écraserait
triggers et policies). Détail : `docs/DATABASE.md`.

## Tests

```
npm run typecheck   # tsc --noEmit
npm run test        # vitest run — tests/unit/
npm run build       # tsc -b && vite build
npm run verify       # les trois, dans l'ordre
```

Après toute modification non triviale, lancer `npm run verify`. Les règles
métier pures (disponibilité, permissions, validations, formats sénégalais)
sont couvertes par `tests/unit/` — étendre ces tests plutôt que de vérifier à
la main à chaque fois. Une règle de `docs/BUSINESS-RULES.md` qui change de
comportement doit changer son test en même temps.

## Actions destructrices — confirmation requise

Avant toute suppression massive, réinitialisation de base, migration
destructive, `git reset --hard`, `git push --force`, ou suppression de fichier
critique : demander confirmation. Ne jamais exécuter par réflexe.

## Definition of done

Une fonctionnalité est terminée quand elle est : fonctionnelle, testée,
responsive, accessible, sécurisée (revérifiée côté base), cohérente avec le
design system, et intégrée au produit — pas seulement à une page isolée.

## Règle d'or

Si un bouton dit « Réserver », il réserve réellement. Si un badge dit
« Disponible », il lit la disponibilité réelle. Ne jamais simuler une
fonctionnalité métier avec un état local qui s'oublie au rechargement.

## Philosophie d'ingénierie

Construire la solution la plus simple qui résout le problème posé maintenant.
Ne pas créer d'abstraction pour un besoin hypothétique, ne pas coder en dur une
valeur qui devrait venir de la configuration ou de la base, ne pas écrire de
script de contournement temporaire pour un problème qui doit être résolu dans
l'architecture.

## Avant de déclarer une tâche terminée

1. Relire les fichiers modifiés.
2. `npm run verify`.
3. Vérifier les permissions du changement (qui peut faire quoi, maintenant).
4. Vérifier les états UI (chargement, erreur, vide, succès).
5. Vérifier le mobile si l'interface a changé.
6. Vérifier qu'aucun parcours existant n'a régressé.
7. Résumer précisément ce qui a changé — pas ce qui était prévu de changer.
