-- Run AFTER migrations. Create a confirmed user in Authentication > Users first.
-- Panel username: administrator. The panel maps this username to the email below.
-- Set the password in the Supabase dashboard, never in this SQL file.
do $$
declare
  admin_email text := 'andychensaputra@gmail.com';
  admin_id uuid;
begin
  select id into admin_id from auth.users where lower(email) = lower(admin_email);
  if admin_id is null then
    raise exception 'Buat akun % di Authentication > Users terlebih dahulu.', admin_email;
  end if;
  insert into private.admin_users(user_id) values (admin_id) on conflict do nothing;
end;
$$;
