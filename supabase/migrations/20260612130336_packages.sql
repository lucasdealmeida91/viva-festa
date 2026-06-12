-- M1-T2 — Packages: the buffet's commercial product (RN-4).
-- Age rules live here but are FROZEN onto the party at confirmation (RN-4.5);
-- the application never reads these values for a confirmed party.

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  adult_capacity integer not null check (adult_capacity >= 0),
  child_capacity integer not null check (child_capacity >= 0),
  base_price_cents integer not null check (base_price_cents >= 0),
  -- RN-4.1/4.2: idade < exempt_age → isento; idade ≥ adult_age → adulto
  exempt_age smallint not null,
  adult_age smallint not null,
  extra_adult_price_cents integer not null check (extra_adult_price_cents >= 0),
  extra_child_price_cents integer not null check (extra_child_price_cents >= 0),
  -- Pacote não se apaga (festas históricas o referenciam); arquiva.
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packages_age_rules check (exempt_age >= 0 and exempt_age < adult_age)
);

create index packages_tenant_id_idx on public.packages (tenant_id);

create trigger packages_set_updated_at
  before update on public.packages
  for each row execute function private.set_updated_at();

-- Grants (no auto-grants on new tables — docs/02 §4)
grant select, insert, update, delete on public.packages to service_role;
grant select on public.packages to anon, authenticated;
grant insert, update on public.packages to authenticated; -- no delete: archive only

alter table public.packages enable row level security;

create policy packages_select_members on public.packages
  for select to authenticated
  using (tenant_id in (select private.user_tenant_ids()));

create policy packages_insert_managers on public.packages
  for insert to authenticated
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy packages_update_managers on public.packages
  for update to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (private.has_role(tenant_id, 'manager'));
