// Local PostgreSQL (PGlite) smoke test; never connects to the Supabase project.
// Pass the path to an installed @electric-sql/pglite/dist/index.js as argument.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

if (!process.argv[2]) throw new Error('Pass the path to @electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const db = new PGlite();
const root = fileURLToPath(new URL('../../', import.meta.url));
const scalar = async sql => Object.values((await db.query(sql)).rows[0])[0];
async function denied(sql) {
  await assert.rejects(db.exec(sql), /permission denied|row-level security/);
}

try {
  // Minimal Supabase-owned schemas. This exercises PostgreSQL SQL/RLS, not the
  // hosted Auth service, Storage HTTP upload API, MIME checks, or PostgREST.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create schema storage;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, storage, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets(id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `);
  for (const name of readdirSync(path.join(root, 'supabase/migrations')).filter(n => n.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(path.join(root, 'supabase/migrations', name), 'utf8'));
    console.log(`PASS migration ${name}`);
  }
  assert.equal(await scalar('select count(*)::int from public.posters'), 13);
  assert.equal(await scalar('select count(*)::int from public.cities'), 5);
  for (const { source_path } of (await db.query('select source_path from public.media_assets')).rows) {
    assert.ok(existsSync(path.join(root, source_path)), `Missing seed image: ${source_path}`);
  }
  const admin = '00000000-0000-0000-0000-000000000001';
  const member = '00000000-0000-0000-0000-000000000002';
  const bootstrap = readFileSync(path.join(root, 'supabase/setup/admin.sql'), 'utf8');
  const testBootstrap = bootstrap.replace(/admin_email text := '[^']+'/, "admin_email text := 'admin@example.test'");
  await assert.rejects(db.exec(testBootstrap), /Buat akun admin@example.test/);
  await db.exec(`insert into auth.users values ('${admin}', 'admin@example.test'), ('${member}', 'member@example.test');`);
  await db.exec(testBootstrap);
  await db.exec(testBootstrap); // Assigning the same admin twice is safe.
  await db.exec("insert into public.countries(code, slug, name_id, name_en) values ('ZZ','draft','Draft','Draft');");
  await db.exec('set role anon;');
  assert.equal(await scalar('select count(*)::int from public.countries'), 3);
  assert.equal(await scalar('select count(*)::int from public.posters'), 13);
  await denied("insert into public.countries(code,slug,name_id,name_en) values ('XX','bad','Bad','Bad')");
  await denied("insert into storage.objects(bucket_id,name) values ('website-media','bad.png')");
  await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub', '${member}', false);`);
  assert.equal(await scalar('select public.is_admin()'), false);
  assert.equal(await scalar('select count(*)::int from public.countries'), 3);
  await denied("insert into public.countries(code,slug,name_id,name_en) values ('XX','bad','Bad','Bad')");
  await denied(`insert into private.admin_users(user_id) values ('${member}')`);
  await denied("insert into storage.objects(bucket_id,name) values ('website-media','bad.png')");
  assert.equal((await db.query("update public.countries set name_id = 'Bad' returning id")).rows.length, 0);
  assert.equal((await db.query('delete from public.posters returning id')).rows.length, 0);
  await db.exec(`select set_config('request.jwt.claim.sub', '${admin}', false);`);
  assert.equal(await scalar('select public.is_admin()'), true);
  assert.equal(await scalar('select count(*)::int from public.countries'), 4);
  await db.exec("update public.countries set name_id = 'Edited' where slug = 'draft';");
  assert.equal(await scalar("select name_id from public.countries where slug = 'draft'"), 'Edited');
  await db.exec("insert into storage.objects(bucket_id,name) values ('website-media','test.png'); update storage.objects set name = 'changed.png'; delete from storage.objects;");
  await denied("insert into storage.objects(bucket_id,name) values ('another-bucket','bad.png')");
  await db.exec("update public.posters set is_published = false where slug = 'assetsbaru-image1';");
  await db.exec('reset role; set role anon;');
  assert.equal(await scalar('select count(*)::int from public.posters'), 12);
  assert.equal(await scalar("select count(*)::int from public.poster_countries where poster_id = (select id from public.posters where slug = 'assetsbaru-image1')"), 0);
  console.log('PASS seed images, admin bootstrap, draft visibility, anonymous/member restrictions, admin edits and Storage policies');
} finally {
  await db.close();
}
