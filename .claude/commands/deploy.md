---
description: Prépare une mise en production de la SPA (Vercel/Netlify) avec la checklist réelle du projet
---

MAKALO est une SPA statique (Vite) sans serveur applicatif à ce jour — le
déploiement consiste à publier `dist/` sur un hébergeur de fichiers statiques
avec réécriture SPA, et à connecter Supabase. Pas de conteneur, pas de
migration de service à orchestrer.

Avant de préparer un déploiement :

1. `npm run verify` doit passer intégralement (typecheck, tests, build). Ne
   jamais déployer sur un échec, même partiel.
2. Vérifie que `.env` (ou les variables d'environnement de l'hébergeur)
   contient `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` — **jamais** une
   clé `service_role` sous un nom `VITE_*` (voir `docs/SECURITY.md`).
3. Confirme que les scripts `scripts/sql/01_schema.sql` → `02_rls.sql` →
   `03_storage.sql` ont été exécutés sur le projet Supabase visé, dans cet
   ordre, avant le premier déploiement pointant dessus (README, section 8).
4. Vérifie la réécriture SPA selon l'hébergeur :
   - Vercel : `vercel.json` (déjà présent, rewrite `/(.*)` → `/index.html`).
   - Netlify : `public/_redirects` (déjà présent).
   Sans cette réécriture, un rechargement sur `/materiel` renvoie une 404
   serveur — vérifie-le après déploiement, pas seulement en local.
5. Si l'environnement cible est une démonstration (pas de Supabase configuré),
   confirme que c'est intentionnel : `DemoBanner` s'affichera et les comptes
   `client@makalo.sn` / `prestataire@makalo.sn` / `admin@makalo.sn`
   (mot de passe `Makalo2026`) seront utilisables — jamais souhaitable en
   production réelle.

Ne demande jamais moins que ces cinq points avant de considérer un
déploiement prêt. S'il manque une étape côté infrastructure (nom de domaine,
compte hébergeur), dis-le explicitement plutôt que de supposer qu'elle est
faite.
