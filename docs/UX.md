# UX / Design

## Identité

| Jeton | Valeur | Usage |
|---|---|---|
| Bleu Nuit | `#0F2B5B` | Navigation, titres, boutons principaux, confiance |
| Orange | `#FF7A30` | CTA, disponibilité, éléments actifs |
| Ivoire Chaud | `#FFF7ED` | Sections douces, zones promotionnelles |
| Blanc | `#FFFFFF` | Fond, cartes |
| Gris Doux | `#64748B` | Texte secondaire, métadonnées |

Police : Inter (poids Regular / Medium / SemiBold / Bold). Icônes : Lucide
uniquement — ne jamais mélanger une seconde bibliothèque d'icônes.

Jetons Tailwind : `tailwind.config.js` (`nuit`, `orange`, `ivoire`, `doux`) et
variables CSS HSL dans `src/index.css` pour les composants Radix.

## Principe directeur

Mobile d'abord, jamais un desktop réduit. Testé à 320 / 375 / 390 / 430 px,
tablette, desktop. Le corps de page ne défile jamais horizontalement — tout
contenu large (tableaux, filtres) a son propre conteneur `overflow-x: auto`.

## Parcours prioritaires

Les deux CTA suivants doivent rester atteignables en une action depuis
n'importe quelle page publique :

1. **Demander une réservation** (client) — bouton dans `ListingDetailPage`.
2. **Publier une offre** (prestataire) — bouton dans `Header`, adapté au
   contexte (visiteur → inscription prestataire, prestataire connecté →
   nouvelle annonce).

## Composants du design system (`src/components/ui`)

Button, Input/Textarea, Select, Dialog, Drawer, Badge, Card, Avatar,
Dropdown-menu, Tabs, Switch, Checkbox, Pagination, DatePicker, Toast,
ConfirmDialog, Skeleton, EmptyState/ErrorState/UnauthorizedState.

Règle : un nouveau composant d'interface passe d'abord par `ui/` avant d'être
utilisé dans une page. Ne jamais styler un `<button>` brut en dehors de
`Button`.

## États obligatoires

Chaque vue qui dépend d'une requête réseau gère explicitement :

| État | Composant |
|---|---|
| Chargement | `Skeleton`, `ListingGridSkeleton`, `RowSkeleton`, `StatCardSkeleton` |
| Vide | `EmptyState` (+ variantes `NoResultsState`) |
| Erreur | `ErrorState` (message français, jamais un code technique) |
| Non autorisé | `UnauthorizedState` |
| Succès d'une action | `useToast()` — jamais un `alert()` |

Aucun écran ne doit paraître figé pendant une requête : le chargement est
toujours visible sous une des formes ci-dessus.

## Confirmation des actions destructrices

`ConfirmDialog` est obligatoire avant : suppression d'annonce, suppression
d'image, suppression de catégorie, refus de modération. Le texte nomme
explicitement ce qui va disparaître (« *« Chaise Napoléon » sera définitivement
supprimée* », jamais un « êtes-vous sûr ? » générique).

## Accessibilité

- Focus visible homogène (`:focus-visible` avec anneau orange, défini une fois
  dans `src/index.css`).
- Un `<label>` lié à chaque champ (`Field` + `fieldAria()` dans
  `components/ui/field.tsx`) : erreur et aide reliées par `aria-describedby`.
- Rôles ARIA sur les composants interactifs personnalisés (galerie, onglets de
  disponibilité).
- Cibles tactiles ≥ 40px (hauteur des boutons `size="md"`/`"lg"`).
- `prefers-reduced-motion` respecté globalement.

## Confiance, sans invention

Ne jamais afficher « 100 % fiable », « 5000 clients satisfaits » ou
« prestataire vérifié » tant que la donnée réelle n'existe pas. Les signaux de
confiance actuels sont uniquement factuels : disponibilité vérifiée à la date,
localisation, historique des demandes, statut de la commande.

Le score de fiabilité prévu par `ROADMAP.md` (taux de présence, ponctualité,
conformité de quantité) est le premier signal de confiance qui pourra être
affiché sans réserve, car il proviendra de données réellement mesurées par la
plateforme.

## Copy

- Voix active, contrôle explicite (« Publier », puis toast « Offre publiée
  avec succès. »).
- Erreurs qui disent quoi corriger, jamais « Une erreur est survenue » sans
  suite quand une cause précise est connue (`lib/errors.ts`).
- Vocabulaire client, jamais interne (« Vos favoris », pas « votre table
  favorites »).

## SEO

Titre et meta description mis à jour par page via `useDocumentTitle()`. Slugs
lisibles (`/materiel/chaise-napoleon-doree-dakar`), générés par `slugify()` à
partir du titre et de la ville.
