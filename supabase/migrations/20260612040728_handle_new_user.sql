-- M0-T1 — Auto-create a profile for every new auth user.
-- full_name comes from signUp metadata; invited users (M0-T4) get it from the
-- invite payload. Works for every auth flow, including future magic links.

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
