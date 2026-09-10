-- Run once after 004. Files are removed via the Storage API, never by deleting
-- storage.objects rows. The durable queue lets the panel retry interrupted cleanup.
begin;

create table public.media_cleanup (
  object_path text primary key,
  created_at timestamptz not null default now()
);
alter table public.media_cleanup enable row level security;
revoke all on public.media_cleanup from anon, authenticated;
grant select, insert, delete on public.media_cleanup to authenticated;
create policy admin_manage on public.media_cleanup for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create function private.media_in_use(media_id uuid, except_table text default '', except_id uuid default null)
returns boolean language sql stable set search_path = '' as $$
 select exists(select 1 from public.posters where (image_id=media_id or thumbnail_id=media_id) and not (except_table='posters' and id=except_id))
 or exists(select 1 from public.destinations where image_id=media_id and not (except_table='destinations' and id=except_id))
 or exists(select 1 from public.hero_slides where image_id=media_id and not (except_table='hero_slides' and id=except_id))
 or exists(select 1 from public.providers where logo_id=media_id and not (except_table='providers' and id=except_id))
 or exists(select 1 from public.site_content where value->>'logo_id'=media_id::text and not (except_table='site_content' and id=except_id));
$$;
revoke all on function private.media_in_use(uuid,text,uuid) from public;
grant execute on function private.media_in_use(uuid,text,uuid) to authenticated;

create function private.release_media(media_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare file_path text;
begin
 perform pg_advisory_xact_lock(91010,1);
 if private.media_in_use(media_id) then return; end if;
 select object_path into file_path from public.media_assets where id=media_id for update;
 if file_path is not null then
  insert into public.media_cleanup(object_path) values(file_path) on conflict do nothing;
 end if;
 delete from public.media_assets where id=media_id;
end;
$$;
revoke all on function private.release_media(uuid) from public;
grant execute on function private.release_media(uuid) to authenticated;
create function public.discard_unused_media(media_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
 if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 perform private.release_media(media_id);
end;
$$;
revoke all on function public.discard_unused_media(uuid) from public,anon;
grant execute on function public.discard_unused_media(uuid) to authenticated;

create function private.guard_content_image() returns trigger
language plpgsql set search_path = '' as $$
declare media_id uuid; doc jsonb;
begin
 perform pg_advisory_xact_lock(91010,1);
 if tg_table_name='posters' then new.thumbnail_id:=new.image_id; end if;
 doc:=to_jsonb(new);
 media_id:=nullif(coalesce(doc->>'image_id',doc->>'logo_id',doc->'value'->>'logo_id'),'')::uuid;
 if media_id is not null then
  if not exists(select 1 from public.media_assets where id=media_id) then
   raise exception 'Gambar tidak ditemukan.' using errcode='23503';
  end if;
  if private.media_in_use(media_id,tg_table_name,new.id) then
   raise exception 'Satu gambar hanya untuk satu konten. Upload gambar baru.' using errcode='23514';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function private.guard_content_image() from public;

create function private.cleanup_content_image() returns trigger
language plpgsql set search_path = '' as $$
declare old_doc jsonb:=to_jsonb(old); media_id uuid;
begin
 for media_id in select distinct nullif(value,'')::uuid from unnest(array[
  old_doc->>'image_id',old_doc->>'thumbnail_id',old_doc->>'logo_id',old_doc->'value'->>'logo_id'
 ]) value where nullif(value,'') is not null loop
  perform private.release_media(media_id);
 end loop;
 return null;
end;
$$;
revoke all on function private.cleanup_content_image() from public;

create function private.auto_content_slug() returns trigger
language plpgsql set search_path = '' as $$
declare doc jsonb:=to_jsonb(new); base text; candidate text; suffix integer:=1; taken boolean;
begin
 perform pg_advisory_xact_lock(91010,1);
 if tg_op='UPDATE' and
  (doc->>'title_id',doc->>'name_id',doc->>'name',doc->>'provider_id',doc->>'service_type_id')
  is not distinct from
  (to_jsonb(old)->>'title_id',to_jsonb(old)->>'name_id',to_jsonb(old)->>'name',to_jsonb(old)->>'provider_id',to_jsonb(old)->>'service_type_id') then
  new.slug:=old.slug; return new;
 end if;
 base:=coalesce(nullif(doc->>'title_id',''),nullif(doc->>'name_id',''),nullif(doc->>'name',''),'foto-beranda');
 if tg_table_name='posters' then
  select concat_ws('-',p.name,s.name_id,base) into base from public.providers p,public.service_types s
   where p.id=(doc->>'provider_id')::uuid and s.id=(doc->>'service_type_id')::uuid;
 end if;
 base:=trim(both '-' from regexp_replace(lower(coalesce(base,'konten')),'[^a-z0-9]+','-','g'));
 if base='' then base:='konten'; end if;
 candidate:=base;
 loop
  execute format('select exists(select 1 from public.%I where slug=$1 and id<>$2)',tg_table_name) into taken using candidate,new.id;
  exit when not taken;
  suffix:=suffix+1; candidate:=base||'-'||suffix;
 end loop;
 new.slug:=candidate;
 return new;
end;
$$;
revoke all on function private.auto_content_slug() from public;

do $$ declare t text; begin

 foreach t in array array['posters','destinations','hero_slides','providers','countries','cities','service_types'] loop
  execute format('create trigger auto_content_slug before insert or update on public.%I for each row execute function private.auto_content_slug()',t);
  execute format('with ranked as (select id,row_number() over(order by sort_order,created_at,id) n from public.%I) update public.%I t set sort_order=r.n from ranked r where t.id=r.id',t,t);
 end loop;
end; $$;

-- SQL Editor uses postgres; permit this one-time cleanup to resolve old thumbnails.
-- The public RPC still requires an actual admin JWT, so use a migration-only block.

insert into public.media_cleanup(object_path)
 select m.object_path from public.media_assets m where m.object_path is not null
 and exists(select 1 from public.posters p where p.thumbnail_id=m.id and p.image_id<>m.id)
 and not exists(select 1 from public.posters p where p.image_id=m.id)
 and not exists(select 1 from public.destinations d where d.image_id=m.id)
 and not exists(select 1 from public.hero_slides h where h.image_id=m.id)
 and not exists(select 1 from public.providers p where p.logo_id=m.id)
 and not exists(select 1 from public.site_content s where s.value->>'logo_id'=m.id::text)
 on conflict do nothing;
-- Keep metadata until the last reference is removed, then delete only queued rows.
update public.posters set thumbnail_id=image_id;
delete from public.media_assets m where exists(select 1 from public.media_cleanup q where q.object_path=m.object_path) and not private.media_in_use(m.id);
do $$ declare t text; begin
 foreach t in array array['posters','destinations','hero_slides','providers','site_content'] loop
  execute format('create trigger guard_content_image before insert or update on public.%I for each row execute function private.guard_content_image()',t);
  execute format('create trigger cleanup_content_image after update or delete on public.%I for each row execute function private.cleanup_content_image()',t);
 end loop;
end; $$;

create function public.save_content(table_name text,payload jsonb,country_ids uuid[] default '{}',city_ids uuid[] default '{}')
returns uuid language plpgsql security invoker set search_path = '' as $$
declare item_id uuid:=coalesce((payload->>'id')::uuid,gen_random_uuid()); target integer;
 total integer; found_row boolean; columns_sql text; update_sql text;
begin
 if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if table_name not in ('posters','destinations','hero_slides','providers','countries','cities','service_types') then raise exception 'Unsupported content type'; end if;
 perform pg_advisory_xact_lock(91010,1);
 execute format('select exists(select 1 from public.%I where id=$1)',table_name) into found_row using item_id;
 if payload ? 'id' and not found_row then raise exception 'Konten sudah dihapus. Muat ulang daftar.'; end if;
 execute format('select count(*) from public.%I where id<>$1',table_name) into total using item_id;
 target:=greatest(1,least(coalesce((payload->>'sort_order')::integer,total+1),total+1));
 execute format('with ranked as (select id,row_number() over(order by sort_order,created_at,id)::integer n from public.%I where id<>$1) update public.%I t set sort_order=case when r.n >= $2 then r.n+1 else r.n end from ranked r where t.id=r.id',table_name,table_name) using item_id,target;
 payload:=(payload-'slug'-'created_at'-'updated_at')||jsonb_build_object('id',item_id,'sort_order',target);
 if table_name='posters' then
  perform public.save_poster(payload,country_ids,city_ids);
 else
  select string_agg(format('%I',a.attname),',' order by a.attnum),
   string_agg(format('%I=r.%I',a.attname,a.attname),',' order by a.attnum)
  into columns_sql,update_sql from pg_catalog.pg_attribute a
  where a.attrelid=format('public.%I',table_name)::regclass and a.attnum>0 and not a.attisdropped
   and a.attname not in ('id','slug','created_at','updated_at') and payload ? a.attname;
  if found_row then
   execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) r where t.id=$2',table_name,update_sql,table_name) using payload,item_id;
  else
   execute format('insert into public.%I(id,%s) select id,%s from jsonb_populate_record(null::public.%I,$1)',table_name,columns_sql,columns_sql,table_name) using payload;
  end if;
 end if;
 return item_id;
end;
$$;
revoke all on function public.save_content(text,jsonb,uuid[],uuid[]) from public,anon;
grant execute on function public.save_content(text,jsonb,uuid[],uuid[]) to authenticated;

create function public.delete_content(table_name text,item_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
 if not private.is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if table_name not in ('posters','destinations','hero_slides','providers','countries','cities','service_types') then raise exception 'Unsupported content type'; end if;
 perform pg_advisory_xact_lock(91010,1);
 execute format('delete from public.%I where id=$1',table_name) using item_id;
 execute format('with ranked as (select id,row_number() over(order by sort_order,created_at,id) n from public.%I) update public.%I t set sort_order=r.n from ranked r where t.id=r.id',table_name,table_name);
end;
$$;
revoke all on function public.delete_content(text,uuid) from public,anon;
grant execute on function public.delete_content(text,uuid) to authenticated;
commit;
