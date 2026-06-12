-- M0-T4 — Team management (RN-1.2/RN-1.3).

-- FK to profiles enables PostgREST embedding (memberships -> profiles).
-- Safe: handle_new_user creates the profile in the same transaction that
-- creates the auth user.
alter table public.memberships
  add constraint memberships_user_profile_fk
  foreign key (user_id) references public.profiles (user_id) on delete cascade;

-- Managers need to see teammates' names.
create function private.shares_tenant_with(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.tenant_id = mine.tenant_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = target
  );
$$;

grant execute on function private.shares_tenant_with(uuid) to authenticated;

create policy profiles_select_same_tenant on public.profiles
  for select to authenticated
  using (private.shares_tenant_with(user_id));
