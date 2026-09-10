-- Run first in Supabase SQL Editor as postgres.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.admin_users enable row level security;
revoke all on private.admin_users from anon, authenticated;

-- Membership is managed only through SQL Editor, never user-editable metadata.
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- Panel may call this RPC after login to check its access.
create function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.is_admin();
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public;

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2}$'),
  slug text not null unique,
  name_id text not null,
  name_en text not null,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete restrict,
  slug text not null unique,
  name_id text not null,
  name_en text not null,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cities_country_idx on public.cities(country_id);

-- Metadata only. Upload actual files through Supabase Storage API / dashboard.
-- source_path supports existing repo images until they are uploaded to Storage.
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  bucket_id text not null default 'website-media' check (bucket_id = 'website-media'),
  object_path text unique,
  source_path text,
  alt_id text not null default '',
  alt_en text not null default '',
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(object_path, '') is not null or nullif(source_path, '') is not null)
);

create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_id text not null,
  name_en text not null,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description_id text not null default '',
  description_en text not null default '',
  logo_id uuid references public.media_assets(id) on delete restrict,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_id text not null,
  title_en text not null,
  description_id text not null default '',
  description_en text not null default '',
  service_type_id uuid not null references public.service_types(id) on delete restrict,
  provider_id uuid not null references public.providers(id) on delete restrict,
  image_id uuid not null references public.media_assets(id) on delete restrict,
  thumbnail_id uuid references public.media_assets(id) on delete restrict,
  valid_until date,
  period_id text not null default '',
  period_en text not null default '',
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posters_service_idx on public.posters(service_type_id);
create index posters_provider_idx on public.posters(provider_id);

create table public.poster_countries (
  poster_id uuid not null references public.posters(id) on delete cascade,
  country_id uuid not null references public.countries(id) on delete restrict,
  primary key (poster_id, country_id)
);
create index poster_countries_country_idx on public.poster_countries(country_id);
create table public.poster_cities (
  poster_id uuid not null references public.posters(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete restrict,
  primary key (poster_id, city_id)
);
create index poster_cities_city_idx on public.poster_cities(city_id);

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  country_id uuid not null references public.countries(id) on delete restrict,
  city_id uuid references public.cities(id) on delete restrict,
  title_id text not null,
  title_en text not null,
  description_id text not null default '',
  description_en text not null default '',
  badge_id text not null default '',
  badge_en text not null default '',
  image_id uuid references public.media_assets(id) on delete restrict,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  image_id uuid not null references public.media_assets(id) on delete restrict,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public presentation settings only: contacts, navigation, section visibility,
-- carousel timing, bilingual copy. Never put secrets or customer data here.
create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS and explicit grants for all editable content tables.
do $$
declare t text;
begin
  foreach t in array array['countries','cities','media_assets','service_types',
    'providers','posters','destinations','hero_slides','site_content'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy published_read on public.%I for select to anon, authenticated using (is_published)', t);
    execute format('create policy admin_manage on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()', t);
    execute format('create index %I on public.%I (sort_order, id) where is_published', t || '_published_order_idx', t);
  end loop;
  foreach t in array array['poster_countries','poster_cities'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy admin_manage on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
  end loop;
end;
$$;

create policy published_read on public.poster_countries for select to anon, authenticated
using (exists (select 1 from public.posters p where p.id = poster_id and p.is_published)
  and exists (select 1 from public.countries c where c.id = country_id and c.is_published));
create policy published_read on public.poster_cities for select to anon, authenticated
using (exists (select 1 from public.posters p where p.id = poster_id and p.is_published)
  and exists (select 1 from public.cities c where c.id = city_id and c.is_published));

commit;
