# Provenance

Ce skill est **vendoré depuis un projet tiers**, pas écrit pour MAKALO.

| | |
|---|---|
| Source | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| Commit vendoré | `4aad0584d92131626b16d4ff4d77f0455385013c` (2026-09-06) |
| Version | 2.13.0 |
| Licence | MIT — © 2024 Next Level Builder |

Contenu inchangé par rapport à la source, à l'exception du retrait des
fichiers `__pycache__` (artefacts de compilation, non versionnés en amont
non plus). `SKILL.md`, `data/`, `references/` et `scripts/` sont recopiés
tels quels — ne pas les modifier ici sans les remonter en amont, sous peine
de diverger silencieusement d'une source de vérité qu'on ne maintient pas.

## Pourquoi lui, et pas les 6 autres skills du même dépôt

Le dépôt source contient sept skills (`banner-design`, `brand`, `design`,
`design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`). Seul celui-ci a été
vendoré :

- `slides`, `banner-design` : MAKALO est une marketplace web, pas un outil de
  présentation ni de bannières publicitaires — aucune pertinence.
- `design`, `brand` : génération de logos/icônes et gouvernance de marque.
  L'identité MAKALO est déjà fixée (`src/components/common/Logo.tsx`,
  `docs/UX.md`) ; un générateur de nouvelle identité créerait une deuxième
  source de vérité concurrente.
- `design-system` : génère des jetons de design. MAKALO a déjà les siens
  (`tailwind.config.js`, `src/index.css`, documentés dans `docs/UX.md`) —
  l'installer ferait doublon et risquerait l'incohérence entre deux systèmes
  de tokens.
- `ui-ux-pro-max` : une base de recherche locale (styles, palettes,
  typographies, graphiques, règles UX) avec un guide **spécifique aux
  stacks `react`, `html-tailwind` et `shadcn`** — exactement la stack de
  MAKALO (`docs/ARCHITECTURE.md`). Vérifié par exécution réelle avant
  intégration (deux requêtes test sur une palette de marketplace de
  confiance et sur les états de survol en Tailwind — résultats concrets et
  exploitables, pas des platitudes).

## Comment l'utiliser sur ce dépôt

Ne pas relancer `--design-system` pour réinventer la palette MAKALO : elle
est fixée (`docs/UX.md`). Utiliser cet outil pour des décisions **nouvelles**
qui n'existent pas encore dans `docs/UX.md` — une page marketing, un
composant de tableau de bord, une question de typographie ou d'accessibilité
sur un écran précis — avec `--domain` ou `--stack html-tailwind` /
`--stack react`, jamais `--design-system` sur l'ensemble du produit.

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<requête>" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<requête>" --stack react
```

Toute recommandation reste une suggestion à vérifier contre `docs/UX.md` et
`.claude/rules/ui-consistency.md` — jamais une autorité qui prime sur les
choix déjà faits pour MAKALO.
