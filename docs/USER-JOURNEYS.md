# Parcours utilisateurs

Ce document décrit les parcours **tels qu'ils existent réellement** dans
`src/App.tsx` aujourd'hui — chaque étape est une route qui répond, pas une
intention. Pour ce qui n'existe pas encore (paiement, avis, litiges),
voir `docs/ROADMAP.md` : ne pas les ajouter ici avant qu'ils soient livrés.

## Visiteur

```
/  →  /materiel  →  /materiel/:slug  →  /prestataire/:id
```

| Étape | Route | Ce qui s'y passe réellement |
|---|---|---|
| Accueil | `/` | Recherche, catégories, offres récentes (`HomePage`) |
| Marketplace | `/materiel` | Recherche, filtres (catégorie/ville/prix/disponibilité), tri, pagination — état porté par l'URL |
| Fiche annonce | `/materiel/:slug` | Galerie, description, vérification de disponibilité par date, bouton de réservation |
| Profil prestataire | `/prestataire/:id` | Ses annonces publiées ; téléphone masqué (voir `docs/SECURITY.md`) |

Un visiteur qui clique « Demander une réservation » ou le bouton favori est
redirigé vers `/connexion` avec un toast explicite — jamais un bouton inerte.

## Client

```
/inscription (role=client) → /connexion → /materiel/:slug → réservation → /demandes → /profil
```

| Étape | Route | Ce qui s'y passe réellement |
|---|---|---|
| Inscription | `/inscription` | `RegisterPage` — rôle `client` par défaut |
| Connexion | `/connexion` | Redirige vers `/dashboard` (ou la page demandée avant redirection) |
| Tableau de bord | `/dashboard` | Statistiques (`useClientStats`), demandes et favoris récents |
| Réservation | modale sur `/materiel/:slug` | `BookingDialog` : date → vérification de stock réel → quantité → message → envoi |
| Suivi | `/demandes` | Onglets par statut, annulation d'une demande `pending` |
| Favoris | `/favoris` | Ajout/retrait avec mise à jour optimiste |
| Profil | `/profil` | Coordonnées, ville, mot de passe |

Ce que ce parcours **ne fait pas** encore : aucun paiement, aucun avis après
l'événement, aucune messagerie. Le contact avec le prestataire se fait par le
téléphone révélé après acceptation (`BookingCard`).

## Prestataire

```
/inscription (role=provider) → /prestataire/annonces/nouveau → modération admin → /prestataire/demandes
```

| Étape | Route | Ce qui s'y passe réellement |
|---|---|---|
| Inscription | `/inscription?role=prestataire` | Rôle `provider` |
| Tableau de bord | `/prestataire` | Annonces publiées/en attente, demandes en attente |
| Créer une annonce | `/prestataire/annonces/nouveau` | Formulaire → `draft` ou soumission → `pending` |
| Modifier | `/prestataire/annonces/:id/modifier` | Une annonce `rejected` corrigée repasse en `pending` |
| Gérer les annonces | `/prestataire/annonces` | Onglets par statut, archivage, suppression avec confirmation |
| Répondre aux demandes | `/prestataire/demandes` | Accepter (vérifie le stock réel) ou refuser |
| Profil | `/profil` | Le champ « bio » y est présenté comme la présentation publique de l'activité |
| Vérification du profil | `/prestataire` (carte dédiée) | Demande de vérification d'identité (`requestProviderVerification`) ; décision réservée à l'admin |

Il n'existe **pas** de tableau de revenus (suppose un encaissement réel,
chantier 2, pas seulement sa fondation), pas d'agenda de blocage manuel
(chantier 7) — ce sont des chantiers de `docs/ROADMAP.md`, pas des étapes de
ce parcours aujourd'hui. La vérification d'identité, elle, est réellement construite
(voir ci-dessous) — c'est un signal de confiance affiché sur le profil, pas
une condition pour publier une annonce.

## Administrateur

Trois espaces, par audience plutôt qu'un back-office unique : **Direction**
(pilotage), **Opérations** (travail quotidien de validation), **Contenu**
(CMS). Les entrées non encore construites (litiges, support, pages, FAQ,
bannières, articles, SEO, promotions, médias) restent visibles dans le menu
mais désactivées, marquées « Bientôt disponible » — jamais masquées en
silence, jamais simulées.

```
/admin → /admin/operations/prestataires → /admin/operations/utilisateurs
       → /admin/operations/annonces → /admin/operations/reservations
       → /admin/operations/calendrier → /admin/cms/categories
```

| Étape | Route | Ce qui s'y passe réellement |
|---|---|---|
| Tableau de bord (Direction) | `/admin` | KPI (dont l'activité estimée GMV, une estimation, pas un revenu confirmé), panneau « Action requise », fil d'activité à horodatage fiable |
| Prestataires (Opérations) | `/admin/operations/prestataires` | Vérifier / rejeter (motif obligatoire) une demande de vérification d'identité — distinct de la modération d'annonce |
| Utilisateurs (Opérations) | `/admin/operations/utilisateurs` | Recherche, changement de rôle, activation/désactivation |
| Annonces (Opérations) | `/admin/operations/annonces` | Publier / refuser avec motif obligatoire / archiver / supprimer |
| Réservations (Opérations) | `/admin/operations/reservations` | Lecture seule — la décision reste au prestataire concerné |
| Calendrier (Opérations) | `/admin/operations/calendrier` | Vue mensuelle réelle de l'occupation du matériel, construite depuis les demandes acceptées/en attente |
| Catégories (Contenu) | `/admin/cms/categories` | CRUD complet |

## Ce qui protège chaque parcours de sortir de son rôle

`ProtectedRoute` (`src/routes/ProtectedRoute.tsx`) redirige silencieusement
vers l'espace du rôle réel de l'utilisateur si l'URL demandée ne correspond
pas — un client qui force `/admin` atterrit sur `/dashboard`, jamais sur une
page d'erreur qui confirmerait l'existence de la route. Le détail des
policies qui font autorité derrière cette redirection : `docs/SECURITY.md`.
