-- F0-T7 — Multi-tenant foundation: tenants, profiles, memberships (RN-1, NF-1)
-- Every table ships with RLS in the same migration that creates it.

-- ---------------------------------------------------------------------------
-- Private schema: RLS helper functions live here, out of PostgREST's reach.
-- ---------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create function private.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
-- RN-11 subscription state machine (see docs/02-modelo-de-dados.md)
create type public.subscription_status as enum
  ('trialing', 'active', 'past_due', 'read_only', 'blocked', 'canceled');

-- RN-1.2 roles
create type public.membership_role as enum ('manager', 'receptionist');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text,
  phone text,
  -- RN-10.4 template, placeholders {nome} {aniversariante} {buffet}
  rebooking_message text,
  subscription_status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz not null default now() + interval '14 days',
  read_only_since timestamptz,
  block_at timestamptz,
  delete_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- RN-1.4: public URL slug; reserved words collide with app routes (doc 01 §4)
  constraint tenants_slug_format
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$'),
  constraint tenants_slug_reserved check (slug not in (
    'app', 'checkin', 'cliente', 'admin', 'login', 'cadastro', 'onboarding',
    'api', 'convite', 'www', 'assets', 'public', 'static'))
);

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function private.set_updated_at();

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_tenant_id_idx on public.memberships (tenant_id);

-- ---------------------------------------------------------------------------
-- RLS helper functions (security definer: they bypass RLS, which both scopes
-- the data correctly and avoids policy recursion on memberships)
-- ---------------------------------------------------------------------------
create function private.user_tenant_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select tenant_id from public.memberships
  where user_id = (select auth.uid());
$$;

create function private.has_role(t uuid, r public.membership_role)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where tenant_id = t
      and user_id = (select auth.uid())
      and role = r
  );
$$;

-- AD-3: read-only mode enforced by the database. past_due stays writable;
-- the Stripe webhook moves it to read_only after the 10-day window (RN-11.3).
create function private.tenant_is_writable(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenants
    where id = t
      and (
        (subscription_status = 'trialing' and trial_ends_at > now())
        or subscription_status in ('active', 'past_due')
      )
  );
$$;

grant execute on function
  private.user_tenant_ids(),
  private.has_role(uuid, public.membership_role),
  private.tenant_is_writable(uuid)
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Role grants. This postgres image does NOT auto-grant DML on new tables, so
-- every table-creating migration must grant explicitly. Grants are the outer
-- gate; RLS policies below do the actual per-row scoping.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete
  on public.tenants, public.profiles, public.memberships
  to service_role;

-- SELECT for app roles (empty results come from RLS, not permission errors)
grant select
  on public.tenants, public.profiles, public.memberships
  to anon, authenticated;

-- tenants: managers update profile-ish columns only — billing/status columns
-- are webhook/service-role territory (a manager must not flip their own
-- subscription). No insert/delete: onboarding RPC (M0-T2) / platform admin.
grant update (name, address, phone, rebooking_message)
  on public.tenants to authenticated;

grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.memberships to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;

-- tenants: members read; managers update profile-ish columns only (see column
-- grants below — billing/status columns are webhook/service-role territory).
-- No INSERT policy: tenant creation goes through the onboarding RPC (M0-T2).
create policy tenants_select_members on public.tenants
  for select to authenticated
  using (id in (select private.user_tenant_ids()));

create policy tenants_update_managers on public.tenants
  for update to authenticated
  using (private.has_role(id, 'manager') and private.tenant_is_writable(id))
  with check (private.has_role(id, 'manager'));

-- profiles: own row only. is_platform_admin can never be self-granted.
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and is_platform_admin = false);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and is_platform_admin = false);

-- memberships: visible to fellow members; managed by managers (RN-1.2).
create policy memberships_select_tenant_members on public.memberships
  for select to authenticated
  using (tenant_id in (select private.user_tenant_ids()));

create policy memberships_insert_managers on public.memberships
  for insert to authenticated
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy memberships_update_managers on public.memberships
  for update to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (private.has_role(tenant_id, 'manager'));

create policy memberships_delete_managers on public.memberships
  for delete to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );
