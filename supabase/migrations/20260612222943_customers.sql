-- M2-T1 — Customers (cliente final) and birthday children (RN-10.1).
-- LGPD/NF-4: birthday children carry ONLY month/year of birth. There is no
-- full birth date column anywhere, by design.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  -- preenchido no primeiro acesso por magic link (M5, RN-12.1)
  auth_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_tenant_idx on public.customers (tenant_id);
create unique index customers_tenant_email_unique
  on public.customers (tenant_id, email)
  where email is not null;

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function private.set_updated_at();

create table public.birthday_children (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  birth_month smallint not null check (birth_month between 1 and 12),
  birth_year smallint not null check (birth_year between 1900 and 2100),
  created_at timestamptz not null default now()
);

create index birthday_children_customer_idx
  on public.birthday_children (customer_id);
create index birthday_children_tenant_idx
  on public.birthday_children (tenant_id);

-- Grants (no auto-grants — docs/02 §4)
grant select, insert, update, delete
  on public.customers, public.birthday_children to service_role;
grant select on public.customers, public.birthday_children
  to anon, authenticated;
grant insert, update, delete
  on public.customers, public.birthday_children to authenticated;

alter table public.customers enable row level security;
alter table public.birthday_children enable row level security;

-- Dados de clientes são do gestor; recepcionista não acessa (matriz docs/02).
-- Policies do papel cliente final chegam no M5 (auth_user_id).
create policy customers_select_managers on public.customers
  for select to authenticated
  using (private.has_role(tenant_id, 'manager'));

create policy customers_write_managers on public.customers
  for insert to authenticated
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy customers_update_managers on public.customers
  for update to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (private.has_role(tenant_id, 'manager'));

create policy customers_delete_managers on public.customers
  for delete to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy birthday_children_select_managers on public.birthday_children
  for select to authenticated
  using (private.has_role(tenant_id, 'manager'));

create policy birthday_children_write_managers on public.birthday_children
  for insert to authenticated
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy birthday_children_update_managers on public.birthday_children
  for update to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (private.has_role(tenant_id, 'manager'));

create policy birthday_children_delete_managers on public.birthday_children
  for delete to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );
