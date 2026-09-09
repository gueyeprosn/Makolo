-- ===========================================================================
-- MAKALO — 01_schema.sql
-- Schéma de base de données : types, tables, index, triggers et fonctions.
--
-- À exécuter EN PREMIER dans l'éditeur SQL de Supabase
-- (Dashboard → SQL Editor → New query), avant 02_rls.sql.
-- Le script est idempotent : il peut être rejoué sans erreur.
-- ===========================================================================

create extension if not exists "pgcrypto";
-- Permet une exclusion GiST mêlant égalité (listing_id, client_id) et
-- chevauchement de plages de dates dans une même contrainte (voir la table
-- `booking_requests` : contrainte `bookings_no_duplicate_pending`).
create extension if not exists "btree_gist";

-- ---------------------------------------------------------------------------
-- 1. Types énumérés
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('client', 'provider', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'listing_status') then
    create type public.listing_status as enum ('draft', 'pending', 'published', 'archived', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type public.booking_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
  end if;
  -- Chaîne d'engagement (`booking_status`) et chaîne d'argent
  -- (`payment_status`) restent deux machines d'état séparées : un échec de
  -- paiement ne doit jamais forcer une transition de réservation invalide.
  -- Voir docs/specs/PAYMENT-FLOW.md.
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('none', 'pending', 'paid', 'failed', 'refunded');
  end if;
  if not exists (select 1 from pg_type where typname = 'price_unit') then
    create type public.price_unit as enum ('jour', 'evenement', 'unite', 'heure', 'semaine');
  end if;
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'booking_request', 'booking_accepted', 'booking_rejected',
      'booking_cancelled', 'listing_published', 'listing_rejected'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Fonction utilitaire : mise à jour automatique de `updated_at`
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Table `profiles` — profil applicatif lié à auth.users
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null check (char_length(full_name) between 3 and 80),
  phone       text check (phone is null or char_length(phone) between 6 and 20),
  avatar_url  text,
  role        public.user_role not null default 'client',
  city        text,
  bio         text check (bio is null or char_length(bio) <= 600),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx    on public.profiles (role);
create index if not exists profiles_city_idx    on public.profiles (city);
create index if not exists profiles_active_idx  on public.profiles (active);
create index if not exists profiles_created_idx on public.profiles (created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Création automatique du profil à l'inscription
--
-- SÉCURITÉ : le rôle envoyé par le client n'est accepté que s'il vaut
-- 'client' ou 'provider'. Le rôle 'admin' ne peut donc JAMAIS être obtenu
-- par auto-inscription — il est attribué uniquement par un administrateur.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'client');
  safe_role public.user_role;
begin
  if requested_role = 'provider' then
    safe_role := 'provider';
  else
    safe_role := 'client';
  end if;

  insert into public.profiles (id, email, full_name, phone, city, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'city'), ''),
    safe_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2 bis. Fonctions d'aide aux autorisations
--
-- Définies ici car elles sont utilisées à la fois par les triggers ci-dessous
-- et par les policies RLS de 02_rls.sql.
-- `security definer` : indispensable pour éviter une récursion infinie entre
-- les policies de `profiles` et la lecture de `profiles` qu'elles impliquent.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

create or replace function public.current_role_is(target public.user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = target and active = true
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.current_role_is(public.user_role) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Table `categories`
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 50),
  slug        text not null unique,
  description text check (description is null or char_length(description) <= 240),
  icon        text,
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists categories_active_idx on public.categories (active);
create index if not exists categories_slug_idx   on public.categories (slug);

-- ---------------------------------------------------------------------------
-- 6. Table `listings`
-- ---------------------------------------------------------------------------

create table if not exists public.listings (
  id                  uuid primary key default gen_random_uuid(),
  provider_id         uuid not null references public.profiles(id) on delete cascade,
  category_id         uuid not null references public.categories(id) on delete restrict,
  title               text not null check (char_length(title) between 5 and 90),
  slug                text not null unique,
  description         text not null check (char_length(description) between 30 and 2000),
  price               numeric(12, 2) not null check (price > 0),
  price_unit          public.price_unit not null default 'jour',
  city                text not null,
  address             text,
  conditions          text check (conditions is null or char_length(conditions) <= 1000),
  availability_status boolean not null default true,
  quantity            integer not null default 1 check (quantity >= 1),
  cover_image         text,
  status              public.listing_status not null default 'draft',
  moderation_reason   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Index requis par les filtres et le tri de la marketplace.
create index if not exists listings_category_idx     on public.listings (category_id);
create index if not exists listings_provider_idx     on public.listings (provider_id);
create index if not exists listings_city_idx         on public.listings (city);
create index if not exists listings_status_idx       on public.listings (status);
create index if not exists listings_created_idx      on public.listings (created_at desc);
create index if not exists listings_price_idx        on public.listings (price);
-- Index composite : cas le plus fréquent (annonces publiées, les plus récentes).
create index if not exists listings_public_idx       on public.listings (status, created_at desc)
  where status = 'published';
-- Recherche plein texte simple sur le titre et la description.
create index if not exists listings_search_idx on public.listings
  using gin (to_tsvector('french', title || ' ' || description));

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Table `listing_images`
-- ---------------------------------------------------------------------------

create table if not exists public.listing_images (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_url  text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_idx on public.listing_images (listing_id, sort_order);

-- ---------------------------------------------------------------------------
-- 8. Table `favorites`
-- ---------------------------------------------------------------------------

create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_unique unique (user_id, listing_id)
);

create index if not exists favorites_user_idx    on public.favorites (user_id);
create index if not exists favorites_listing_idx on public.favorites (listing_id);

-- ---------------------------------------------------------------------------
-- 9. Table `booking_requests`
-- ---------------------------------------------------------------------------

create table if not exists public.booking_requests (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  client_id      uuid not null references public.profiles(id) on delete cascade,
  provider_id    uuid not null references public.profiles(id) on delete cascade,
  -- Période complète pendant laquelle le matériel est chez le client (de la
  -- livraison à la reprise), pas seulement la date de l'événement : voir
  -- docs/specs/BOOKING-LIFECYCLE.md. Une location d'un seul jour a
  -- requested_from = requested_to.
  requested_from date not null,
  requested_to   date not null,
  quantity       integer not null check (quantity >= 1),
  message        text check (message is null or char_length(message) <= 600),
  status         public.booking_status not null default 'pending',
  -- Acompte (chantier n°2, docs/specs/PAYMENT-FLOW.md) : chaîne d'argent
  -- séparée de `status`, jamais écrite par un client authentifié (voir les
  -- GRANT/REVOKE colonne par colonne dans 02_rls.sql) — seul le service
  -- serveur qui traite les webhooks Wave / Orange Money peut la modifier.
  payment_status    public.payment_status not null default 'none',
  payment_provider  text check (payment_provider is null or payment_provider in ('wave', 'orange_money')),
  deposit_amount    integer check (deposit_amount is null or deposit_amount >= 0),
  payment_reference text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Un client ne peut pas être son propre prestataire.
  constraint booking_not_self check (client_id <> provider_id),
  constraint booking_valid_range check (requested_to >= requested_from)
);

create index if not exists bookings_listing_idx  on public.booking_requests (listing_id);
create index if not exists bookings_client_idx   on public.booking_requests (client_id);
create index if not exists bookings_provider_idx on public.booking_requests (provider_id);
create index if not exists bookings_status_idx   on public.booking_requests (status);
-- Ordre des colonnes pensé pour la requête de chevauchement de
-- `listing_availability()` / `check_booking_capacity()` : égalité sur
-- listing_id et status, puis parcours par intervalle sur les dates.
create index if not exists bookings_range_idx
  on public.booking_requests (listing_id, status, requested_from, requested_to);
-- Un identifiant de transaction fourni par le provider ne doit jamais être
-- réutilisé pour deux demandes différentes.
create unique index if not exists bookings_payment_reference_idx
  on public.booking_requests (payment_reference) where payment_reference is not null;

-- Empêche deux demandes EN ATTENTE du même client, sur la même annonce, avec
-- des périodes qui se chevauchent (pas seulement une date identique : deux
-- plages qui se recouvrent partiellement doivent être bloquées de la même
-- façon). Une exclusion GiST est la seule contrainte SQL native capable
-- d'exprimer « pas de chevauchement », y compris combinée à une égalité.
alter table public.booking_requests drop constraint if exists bookings_no_duplicate_pending;
alter table public.booking_requests
  add constraint bookings_no_duplicate_pending
  exclude using gist (
    listing_id with =,
    client_id with =,
    daterange(requested_from, requested_to, '[]') with &&
  )
  where (status = 'pending');

drop trigger if exists bookings_set_updated_at on public.booking_requests;
create trigger bookings_set_updated_at
  before update on public.booking_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. Table `notifications`
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  message    text not null,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx   on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read = false;

-- ---------------------------------------------------------------------------
-- 11. Disponibilité — fonction agrégée exposée au client
--
-- `security definer` : un client doit pouvoir savoir combien d'unités restent
-- disponibles sur une période donnée SANS pouvoir lire les demandes des
-- autres utilisateurs. La fonction ne renvoie donc que des totaux.
--
-- Le calcul est fait JOUR PAR JOUR sur la période demandée, puis on garde le
-- pire jour : deux réservations acceptées sur des sous-périodes disjointes
-- (ex. 1-5 et 10-15) ne doivent pas se cumuler pour une période qui les
-- couvre toutes les deux (1-15) sans jamais les chevaucher elles-mêmes.
-- Cette logique est identique à celle de `check_booking_capacity()` : les
-- deux doivent toujours s'accorder, sous peine d'afficher un stock que
-- l'acceptation refuserait ensuite (ou l'inverse).
-- ---------------------------------------------------------------------------

drop function if exists public.listing_availability(uuid, date);

create or replace function public.listing_availability(p_listing_id uuid, p_from date, p_to date)
returns table (
  total_quantity    integer,
  accepted_quantity integer,
  pending_quantity  integer,
  is_active         boolean,
  listing_status    public.listing_status
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.quantity as total_quantity,
    coalesce((
      select max(day_usage)::int from (
        select coalesce(sum(b.quantity), 0) as day_usage
        from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as d(day)
        left join public.booking_requests b
          on b.listing_id = l.id
          and b.status = 'accepted'
          and b.requested_from <= d.day::date
          and b.requested_to   >= d.day::date
        group by d.day
      ) per_day
    ), 0) as accepted_quantity,
    coalesce((
      select max(day_usage)::int from (
        select coalesce(sum(b.quantity), 0) as day_usage
        from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as d(day)
        left join public.booking_requests b
          on b.listing_id = l.id
          and b.status = 'pending'
          and b.requested_from <= d.day::date
          and b.requested_to   >= d.day::date
        group by d.day
      ) per_day
    ), 0) as pending_quantity,
    l.availability_status as is_active,
    l.status as listing_status
  from public.listings l
  where l.id = p_listing_id
    -- Une annonce non publiée n'est interrogeable que par son propriétaire ou un admin.
    and (
      l.status = 'published'
      or l.provider_id = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    );
$$;

revoke all on function public.listing_availability(uuid, date, date) from public;
grant execute on function public.listing_availability(uuid, date, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 12. Garde-fou serveur : on n'accepte jamais plus que le stock disponible
--
-- Vérifie CHAQUE JOUR de la période demandée, pas seulement son ensemble :
-- deux réservations acceptées sur des sous-périodes disjointes ne doivent
-- pas se cumuler à tort pour une période qui les couvre sans les chevaucher
-- elles-mêmes. Doit rester en accord avec `listing_availability()`, qui
-- affiche au client exactement ce que cette fonction acceptera ou non.
-- ---------------------------------------------------------------------------

create or replace function public.check_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stock integer;
  worst_day_usage integer;
begin
  if new.status <> 'accepted' then
    return new;
  end if;

  select quantity into stock from public.listings where id = new.listing_id;

  select coalesce(max(day_usage), 0) into worst_day_usage
  from (
    select coalesce(sum(b.quantity), 0) as day_usage
    from generate_series(new.requested_from::timestamp, new.requested_to::timestamp, interval '1 day') as d(day)
    left join public.booking_requests b
      on b.listing_id = new.listing_id
      and b.status = 'accepted'
      and b.id <> new.id
      and b.requested_from <= d.day::date
      and b.requested_to   >= d.day::date
    group by d.day
  ) per_day;

  if new.quantity > (stock - worst_day_usage) then
    raise exception 'Stock insuffisant sur cette periode : il reste au maximum % unite(s) selon les jours.', greatest(stock - worst_day_usage, 0)
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_check_capacity on public.booking_requests;
create trigger bookings_check_capacity
  before insert or update of status on public.booking_requests
  for each row execute function public.check_booking_capacity();

-- ---------------------------------------------------------------------------
-- 13. Notifications automatiques
--
-- Créées côté base : un utilisateur ne peut jamais écrire dans la table
-- `notifications` d'un autre compte (voir 02_rls.sql).
-- ---------------------------------------------------------------------------

create or replace function public.notify_booking_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_title text;
  client_name   text;
begin
  select title into listing_title from public.listings where id = new.listing_id;
  select full_name into client_name from public.profiles where id = new.client_id;

  insert into public.notifications (user_id, type, title, message, link)
  values (
    new.provider_id,
    'booking_request',
    'Nouvelle demande de réservation',
    format('%s souhaite réserver « %s » (%s unité(s)).', client_name, listing_title, new.quantity),
    '/prestataire/demandes'
  );

  return new;
end;
$$;

drop trigger if exists bookings_notify_created on public.booking_requests;
create trigger bookings_notify_created
  after insert on public.booking_requests
  for each row execute function public.notify_booking_created();

create or replace function public.notify_booking_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_title text;
begin
  if new.status = old.status then
    return new;
  end if;

  select title into listing_title from public.listings where id = new.listing_id;

  if new.status = 'accepted' then
    insert into public.notifications (user_id, type, title, message, link)
    values (new.client_id, 'booking_accepted', 'Votre demande a été acceptée',
            format('Votre demande pour « %s » a été acceptée.', listing_title), '/demandes');

  elsif new.status = 'rejected' then
    insert into public.notifications (user_id, type, title, message, link)
    values (new.client_id, 'booking_rejected', 'Votre demande a été refusée',
            format('Votre demande pour « %s » a été refusée.', listing_title), '/demandes');

  elsif new.status = 'cancelled' then
    insert into public.notifications (user_id, type, title, message, link)
    values (new.provider_id, 'booking_cancelled', 'Demande annulée',
            format('Une demande concernant « %s » a été annulée par le client.', listing_title),
            '/prestataire/demandes');
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_notify_status on public.booking_requests;
create trigger bookings_notify_status
  after update of status on public.booking_requests
  for each row execute function public.notify_booking_status_change();

create or replace function public.notify_listing_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'published' then
    insert into public.notifications (user_id, type, title, message, link)
    values (new.provider_id, 'listing_published', 'Votre annonce est en ligne',
            format('« %s » a été validée et est désormais visible par les clients.', new.title),
            '/prestataire/annonces');

  elsif new.status = 'rejected' then
    insert into public.notifications (user_id, type, title, message, link)
    values (new.provider_id, 'listing_rejected', 'Votre annonce a été refusée',
            format('« %s » n''a pas été validée : %s.', new.title,
                   coalesce(new.moderation_reason, 'motif non précisé')),
            '/prestataire/annonces');
  end if;

  return new;
end;
$$;

drop trigger if exists listings_notify_moderation on public.listings;
create trigger listings_notify_moderation
  after update of status on public.listings
  for each row execute function public.notify_listing_moderation();

-- ---------------------------------------------------------------------------
-- 14. Cohérence : `provider_id` d'une demande = propriétaire de l'annonce
-- ---------------------------------------------------------------------------

create or replace function public.enforce_booking_provider()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select provider_id into owner from public.listings where id = new.listing_id;
  if owner is null then
    raise exception 'Annonce introuvable.' using errcode = '23503';
  end if;
  -- Le prestataire est toujours déduit de l'annonce, jamais du client.
  new.provider_id := owner;
  return new;
end;
$$;

drop trigger if exists bookings_enforce_provider on public.booking_requests;
create trigger bookings_enforce_provider
  before insert on public.booking_requests
  for each row execute function public.enforce_booking_provider();

-- ---------------------------------------------------------------------------
-- 15. Transitions de statut d'une annonce
--
-- La policy RLS garantit qu'un prestataire ne touche QUE ses annonces ; ce
-- trigger garantit qu'il ne peut pas s'auto-publier. La distinction est
-- importante : un prestataire doit pouvoir modifier le prix ou la description
-- d'une annonce DÉJÀ publiée sans en changer le statut — seule la transition
-- vers 'published' ou 'rejected' est réservée à l'administrateur.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_listing_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- L'administrateur modère librement.
  if public.is_admin() then
    return new;
  end if;

  -- Statut inchangé : simple mise à jour du contenu, toujours autorisée.
  if new.status is not distinct from old.status then
    -- Un prestataire ne réécrit pas le motif de modération le concernant.
    new.moderation_reason := old.moderation_reason;
    return new;
  end if;

  if new.status in ('published', 'rejected') then
    raise exception 'Seul un administrateur peut publier ou refuser une annonce.'
      using errcode = '42501';
  end if;

  new.moderation_reason := old.moderation_reason;
  return new;
end;
$$;

drop trigger if exists listings_enforce_status on public.listings;
create trigger listings_enforce_status
  before update on public.listings
  for each row execute function public.enforce_listing_status_transition();

-- ---------------------------------------------------------------------------
-- 16. Table `payment_events` — journal des webhooks de paiement
--
-- Chantier n°2 (docs/ROADMAP.md, docs/specs/PAYMENT-FLOW.md) : fondation
-- seule dans ce dépôt — aucun compte marchand Wave / Orange Money réel n'est
-- branché. Cette table journalise CHAQUE webhook reçu, accepté ou rejeté,
-- avant même de savoir s'il est légitime : sans cette trace, un litige de
-- paiement ne peut pas être instruit.
--
-- Écrite exclusivement par le rôle `service_role` (la fonction Edge qui
-- reçoit les webhooks, jamais le navigateur) : RLS n'autorise même pas la
-- lecture à `anon`/`authenticated`, sur le même principe que `notifications`
-- (aucune policy d'insertion pour ces rôles — voir 02_rls.sql).
-- ---------------------------------------------------------------------------

create table if not exists public.payment_events (
  id                uuid primary key default gen_random_uuid(),
  -- `set null` plutôt que `cascade` : l'événement doit survivre même si la
  -- demande qu'il concernait disparaît, pour rester consultable en cas de
  -- litige (voir plus haut).
  booking_id        uuid references public.booking_requests(id) on delete set null,
  provider          text not null check (provider in ('wave', 'orange_money')),
  provider_event_id text not null,
  event_type        text not null,
  amount            integer,
  currency          text,
  -- Résultat de notre propre traitement du webhook, pas celui du provider :
  -- 'accepted' si toutes les vérifications de PAYMENT-FLOW.md sont passées,
  -- 'rejected' sinon (signature invalide, montant incohérent, demande
  -- introuvable...).
  outcome           text not null check (outcome in ('accepted', 'rejected')),
  rejection_reason  text check (rejection_reason is null or outcome = 'rejected'),
  raw_payload       jsonb not null,
  received_at       timestamptz not null default now(),
  -- Un même événement rejoué par le provider (retry réseau, replay) ne doit
  -- jamais être traité deux fois : c'est l'idempotence exigée par
  -- PAYMENT-FLOW.md, portée ici par une contrainte SQL et non par une
  -- simple vérification applicative.
  constraint payment_events_idempotent unique (provider, provider_event_id)
);

create index if not exists payment_events_booking_idx on public.payment_events (booking_id);
create index if not exists payment_events_received_idx on public.payment_events (received_at desc);
