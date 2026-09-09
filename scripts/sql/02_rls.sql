-- ===========================================================================
-- MAKALO — 02_rls.sql
-- Row Level Security : la sécurité réelle de la plateforme.
--
-- À exécuter APRÈS 01_schema.sql.
--
-- Principe : le frontend n'a AUCUNE autorité. Même si un utilisateur
-- modifiait le code JavaScript ou appelait l'API directement avec la clé
-- publique `anon`, les règles ci-dessous s'appliqueraient toujours.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0. Fonctions d'aide
--
-- `public.is_admin()` et `public.current_role_is(role)` sont définies dans
-- 01_schema.sql : elles y servent déjà aux triggers de transition de statut.
-- Exécutez donc bien 01_schema.sql avant ce script.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Activation de RLS sur TOUTES les tables applicatives
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.listings         enable row level security;
alter table public.listing_images   enable row level security;
alter table public.favorites        enable row level security;
alter table public.booking_requests enable row level security;
alter table public.notifications    enable row level security;

-- ---------------------------------------------------------------------------
-- 2. profiles
--
--  • Visiteur      : lit les profils prestataires actifs (vitrine publique).
--  • Utilisateur   : lit et modifie SON profil, sans pouvoir changer son rôle.
--  • Administrateur: lit et modifie tous les profils.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_public_providers"  on public.profiles;
drop policy if exists "profiles_select_own"        on public.profiles;
drop policy if exists "profiles_admin_select"      on public.profiles;
drop policy if exists "profiles_update_own"        on public.profiles;
drop policy if exists "profiles_admin_update"      on public.profiles;
drop policy if exists "profiles_insert_self"       on public.profiles;

create policy "profiles_public_providers" on public.profiles
  for select to anon, authenticated
  using (role = 'provider' and active = true);

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_admin_select" on public.profiles
  for select to authenticated
  using (public.is_admin());

-- Un utilisateur modifie son profil, mais NI son rôle NI son statut actif :
-- les deux valeurs doivent rester identiques à l'existant.
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and active = (select p.active from public.profiles p where p.id = auth.uid())
  );

create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Filet de sécurité : le profil est normalement créé par le trigger.
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role in ('client', 'provider'));

-- ---------------------------------------------------------------------------
-- 3. categories — lecture publique, écriture réservée à l'administrateur
-- ---------------------------------------------------------------------------

drop policy if exists "categories_public_read" on public.categories;
drop policy if exists "categories_admin_read"  on public.categories;
drop policy if exists "categories_admin_write" on public.categories;

create policy "categories_public_read" on public.categories
  for select to anon, authenticated
  using (active = true);

create policy "categories_admin_read" on public.categories
  for select to authenticated
  using (public.is_admin());

create policy "categories_admin_write" on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. listings
--
--  • Visiteur      : ne voit QUE les annonces publiées.
--  • Prestataire   : voit et gère UNIQUEMENT ses propres annonces.
--  • Administrateur: voit et gère tout.
--
-- Le prestataire ne peut pas s'auto-publier : il ne choisit qu'entre
-- 'draft', 'pending' et 'archived'. Seul l'admin passe à 'published' ou
-- 'rejected'.
-- ---------------------------------------------------------------------------

drop policy if exists "listings_public_read"     on public.listings;
drop policy if exists "listings_owner_read"      on public.listings;
drop policy if exists "listings_admin_read"      on public.listings;
drop policy if exists "listings_provider_insert" on public.listings;
drop policy if exists "listings_provider_update" on public.listings;
drop policy if exists "listings_provider_delete" on public.listings;
drop policy if exists "listings_admin_write"     on public.listings;

create policy "listings_public_read" on public.listings
  for select to anon, authenticated
  using (status = 'published');

create policy "listings_owner_read" on public.listings
  for select to authenticated
  using (provider_id = auth.uid());

create policy "listings_admin_read" on public.listings
  for select to authenticated
  using (public.is_admin());

create policy "listings_provider_insert" on public.listings
  for insert to authenticated
  with check (
    provider_id = auth.uid()
    and public.current_role_is('provider')
    and status in ('draft', 'pending')
  );

-- Le prestataire modifie ses annonces (y compris publiées : prix, description…)
-- sans pouvoir les réattribuer à quelqu'un d'autre. Les transitions de statut
-- réservées à l'administrateur sont bloquées par le trigger
-- `enforce_listing_status_transition()` défini dans 01_schema.sql.
create policy "listings_provider_update" on public.listings
  for update to authenticated
  using (provider_id = auth.uid() and public.current_role_is('provider'))
  with check (provider_id = auth.uid());

create policy "listings_provider_delete" on public.listings
  for delete to authenticated
  using (provider_id = auth.uid() and public.current_role_is('provider'));

create policy "listings_admin_write" on public.listings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. listing_images — suivent les droits de l'annonce parente
-- ---------------------------------------------------------------------------

drop policy if exists "listing_images_public_read"  on public.listing_images;
drop policy if exists "listing_images_owner_read"   on public.listing_images;
drop policy if exists "listing_images_owner_write"  on public.listing_images;
drop policy if exists "listing_images_admin_write"  on public.listing_images;

create policy "listing_images_public_read" on public.listing_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.status = 'published'
    )
  );

create policy "listing_images_owner_read" on public.listing_images
  for select to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.provider_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "listing_images_owner_write" on public.listing_images
  for all to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.provider_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.provider_id = auth.uid()
    )
  );

create policy "listing_images_admin_write" on public.listing_images
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. favorites — strictement privés à leur propriétaire
-- ---------------------------------------------------------------------------

drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;

create policy "favorites_select_own" on public.favorites
  for select to authenticated
  using (user_id = auth.uid());

create policy "favorites_insert_own" on public.favorites
  for insert to authenticated
  with check (
    user_id = auth.uid()
    -- On ne met en favori qu'une annonce réellement visible.
    and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'published')
  );

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. booking_requests
--
--  • Le client voit ses demandes ; le prestataire voit celles qui le concernent.
--  • Le client crée une demande pour lui-même sur une annonce publiée.
--  • Le prestataire accepte ou refuse ; le client annule. Personne d'autre.
-- ---------------------------------------------------------------------------

drop policy if exists "bookings_select_client"   on public.booking_requests;
drop policy if exists "bookings_select_provider" on public.booking_requests;
drop policy if exists "bookings_admin_select"    on public.booking_requests;
drop policy if exists "bookings_insert_client"   on public.booking_requests;
drop policy if exists "bookings_update_provider" on public.booking_requests;
drop policy if exists "bookings_update_client"   on public.booking_requests;
drop policy if exists "bookings_admin_write"     on public.booking_requests;

create policy "bookings_select_client" on public.booking_requests
  for select to authenticated
  using (client_id = auth.uid());

create policy "bookings_select_provider" on public.booking_requests
  for select to authenticated
  using (provider_id = auth.uid());

create policy "bookings_admin_select" on public.booking_requests
  for select to authenticated
  using (public.is_admin());

-- `requested_to >= requested_from` est déjà garanti pour toute écriture par
-- la contrainte `booking_valid_range` (01_schema.sql) : pas besoin de le
-- revérifier ici, seule l'autorisation d'écrire est du ressort de RLS.
create policy "bookings_insert_client" on public.booking_requests
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and requested_from >= current_date
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.status = 'published'
        and l.availability_status = true
        and l.provider_id <> auth.uid()
    )
  );

-- Le prestataire ne peut que passer une demande 'pending' à 'accepted'/'rejected'.
create policy "bookings_update_provider" on public.booking_requests
  for update to authenticated
  using (provider_id = auth.uid() and status = 'pending')
  with check (provider_id = auth.uid() and status in ('accepted', 'rejected'));

-- Le client ne peut qu'annuler sa propre demande encore en attente.
create policy "bookings_update_client" on public.booking_requests
  for update to authenticated
  using (client_id = auth.uid() and status = 'pending')
  with check (client_id = auth.uid() and status = 'cancelled');

create policy "bookings_admin_write" on public.booking_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. notifications
--
-- Lecture et marquage comme lu par le destinataire uniquement.
-- AUCUNE policy d'insertion : les notifications sont créées exclusivement par
-- les triggers `security definer` de 01_schema.sql. Un utilisateur ne peut
-- donc pas fabriquer de fausse notification pour quelqu'un d'autre.
-- ---------------------------------------------------------------------------

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 9. Vérification rapide
--
-- Après exécution, toutes les tables ci-dessous doivent afficher rowsecurity = true.
-- ---------------------------------------------------------------------------

-- select tablename, rowsecurity from pg_tables
-- where schemaname = 'public'
--   and tablename in ('profiles','categories','listings','listing_images',
--                     'favorites','booking_requests','notifications');
