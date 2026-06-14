-- M6-T1 — Lista de presentes mínima (RN-13). Sem pagamento/PIX (RN-13.3).
-- O cliente final (host) cadastra itens; o convidado confirmado escolhe (T2).

create table public.gift_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  party_id uuid not null references public.parties (id) on delete cascade,
  name text not null,
  external_url text,
  claimed_by_guest_id uuid references public.guests (id) on delete set null,
  created_at timestamptz not null default now()
);

create index gift_items_party_idx on public.gift_items (party_id);

grant select, insert, update, delete on public.gift_items to service_role;
grant select on public.gift_items to anon, authenticated;
grant insert, update, delete on public.gift_items to authenticated;

alter table public.gift_items enable row level security;

-- Gestor: tudo do tenant.
create policy gift_items_manager on public.gift_items
  for all to authenticated
  using (private.has_role(tenant_id, 'manager'))
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

-- Cliente final: gerencia os presentes da própria festa confirmada.
create policy gift_items_customer_select on public.gift_items
  for select to authenticated
  using (
    party_id in (
      select id from public.parties where customer_id = private.customer_id_for_user()
    )
  );

create policy gift_items_customer_write on public.gift_items
  for insert to authenticated
  with check (
    party_id in (
      select id from public.parties
      where customer_id = private.customer_id_for_user() and status = 'confirmed'
    )
  );

create policy gift_items_customer_delete on public.gift_items
  for delete to authenticated
  using (
    party_id in (
      select id from public.parties
      where customer_id = private.customer_id_for_user() and status = 'confirmed'
    )
  );
