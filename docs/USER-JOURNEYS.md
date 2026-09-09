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

Il n'existe **pas** de vérification d'identité prestataire, pas de tableau de
revenus, pas d'agenda de blocage manuel — ce sont des chantiers de
`docs/ROADMAP.md` (points 4 et 7), pas des étapes de ce parcours aujourd'hui.

## Administrateur

```
/admin → /admin/annonces?statut=pending → /admin/utilisateurs → /admin/categories → /admin/demandes
```

| Étape | Route | Ce qui s'y passe réellement |
|---|---|---|
| Tableau de bord | `/admin` | Statistiques globales, répartition des comptes |
| Modération | `/admin/annonces` | Publier / refuser avec motif obligatoire / archiver / supprimer |
| Utilisateurs | `/admin/utilisateurs` | Recherche, changement de rôle, activation/désactivation |
| Catégories | `/admin/categories` | CRUD complet |
| Demandes | `/admin/demandes` | Lecture seule — la décision reste au prestataire concerné |

## Ce qui protège chaque parcours de sortir de son rôle

`ProtectedRoute` (`src/routes/ProtectedRoute.tsx`) redirige silencieusement
vers l'espace du rôle réel de l'utilisateur si l'URL demandée ne correspond
pas — un client qui force `/admin` atterrit sur `/dashboard`, jamais sur une
page d'erreur qui confirmerait l'existence de la route. Le détail des
policies qui font autorité derrière cette redirection : `docs/SECURITY.md`.
