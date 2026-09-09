-- ===========================================================================
-- MAKOLO — 03_storage.sql
-- Bucket de stockage des photos d'annonces et policies associées.
--
-- À exécuter APRÈS 02_rls.sql.
--
-- Convention de chemin (imposée par les policies) :
--     <auth.uid()>/<listing_id>/<horodatage>-<aléatoire>.<ext>
-- Le premier segment étant l'identifiant du propriétaire, un prestataire ne
-- peut ni écrire ni supprimer dans le dossier d'un autre.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Création du bucket public `listing-images`
--
-- Le bucket est public en LECTURE (les photos d'annonces doivent s'afficher
-- pour les visiteurs non connectés), mais l'écriture reste protégée.
-- Taille maximale et types MIME sont appliqués côté serveur, en plus de la
-- validation réalisée dans l'interface.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5242880, -- 5 Mo
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. Policies Storage
-- ---------------------------------------------------------------------------

drop policy if exists "listing_images_public_select"  on storage.objects;
drop policy if exists "listing_images_owner_insert"   on storage.objects;
drop policy if exists "listing_images_owner_update"   on storage.objects;
drop policy if exists "listing_images_owner_delete"   on storage.objects;
drop policy if exists "listing_images_admin_all"      on storage.objects;

-- Lecture publique : nécessaire pour afficher les annonces aux visiteurs.
create policy "listing_images_public_select" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'listing-images');

-- Écriture : uniquement dans son propre dossier, et uniquement pour un prestataire.
create policy "listing_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_role_is('provider')
  );

create policy "listing_images_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "listing_images_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- L'administrateur peut retirer un contenu non conforme.
create policy "listing_images_admin_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'listing-images' and public.is_admin())
  with check (bucket_id = 'listing-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Vérification
-- ---------------------------------------------------------------------------

-- select id, public, file_size_limit, allowed_mime_types
-- from storage.buckets where id = 'listing-images';
