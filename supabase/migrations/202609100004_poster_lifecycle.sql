-- Additional migration for the admin panel. Run after 001–003.
begin;
alter table public.posters
  add column kind text not null default 'price' check (kind in ('promo', 'price')),
  add column status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  add column valid_from date,
  add column expiry_action text not null default 'label' check (expiry_action in ('label', 'hide')),
  add constraint posters_valid_period check (valid_from is null or valid_until is null or valid_from <= valid_until);
update public.posters set status = case when is_published then 'published' else 'draft' end;

create function private.sync_poster_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.is_published = new.status = 'published';
  return new;
end;
$$;
revoke all on function private.sync_poster_publication() from public;
create trigger sync_poster_publication before insert or update on public.posters
for each row execute function private.sync_poster_publication();

drop policy published_read on public.posters;
create policy published_read on public.posters for select to anon, authenticated
using (is_published and status = 'published'
  and (valid_from is null or valid_from <= (now() at time zone 'Asia/Jakarta')::date)
  and (expiry_action = 'label' or valid_until is null or valid_until >= (now() at time zone 'Asia/Jakarta')::date));

-- Save a poster and its country/city selections in one transaction.
-- Security invoker preserves RLS; checking admin also prevents empty/no-op calls.
create function public.save_poster(payload jsonb, country_ids uuid[], city_ids uuid[])
returns uuid language plpgsql security invoker set search_path = '' as $$
declare item public.posters;
begin
  if not private.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  item := jsonb_populate_record(null::public.posters, payload);
  item.id := coalesce(item.id, gen_random_uuid());
  insert into public.posters (id, slug, title_id, title_en, description_id, description_en,
    service_type_id, provider_id, image_id, thumbnail_id, valid_until, period_id, period_en,
    sort_order, kind, status, valid_from, expiry_action)
  values (item.id, item.slug, item.title_id, item.title_en,
    coalesce(item.description_id,''), coalesce(item.description_en,''),
    item.service_type_id, item.provider_id, item.image_id, item.thumbnail_id,
    item.valid_until, coalesce(item.period_id,''), coalesce(item.period_en,''),
    coalesce(item.sort_order,0), coalesce(item.kind,'price'), coalesce(item.status,'draft'),
    item.valid_from, coalesce(item.expiry_action,'label'))
  on conflict (id) do update set slug=excluded.slug, title_id=excluded.title_id,
    title_en=excluded.title_en, description_id=excluded.description_id,
    description_en=excluded.description_en, service_type_id=excluded.service_type_id,
    provider_id=excluded.provider_id, image_id=excluded.image_id,
    thumbnail_id=excluded.thumbnail_id, valid_until=excluded.valid_until,
    period_id=excluded.period_id, period_en=excluded.period_en, sort_order=excluded.sort_order,
    kind=excluded.kind, status=excluded.status, valid_from=excluded.valid_from,
    expiry_action=excluded.expiry_action;
  delete from public.poster_countries where poster_id=item.id;
  insert into public.poster_countries(poster_id,country_id)
    select item.id, value from (select distinct unnest(country_ids) as value) ids;
  delete from public.poster_cities where poster_id=item.id;
  insert into public.poster_cities(poster_id,city_id)
    select item.id, value from (select distinct unnest(city_ids) as value) ids;
  return item.id;
end;
$$;
revoke all on function public.save_poster(jsonb,uuid[],uuid[]) from public, anon;
grant execute on function public.save_poster(jsonb,uuid[],uuid[]) to authenticated;
commit;
