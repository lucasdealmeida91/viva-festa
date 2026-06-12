-- M2-T2 — Contracts and installments (RN-9.1, RN-3.3).
-- A party can only reach 'confirmed' with a contract: enforced by trigger.
-- Confirmation is atomic via the confirm_party_with_contract RPC
-- (security INVOKER: runs as the caller, RLS fully applied, one transaction).

-- Festa ganha o vínculo comercial (nullable: orçamento pode existir sem cliente)
alter table public.parties
  add column customer_id uuid references public.customers (id) on delete set null,
  add column birthday_child_id uuid
    references public.birthday_children (id) on delete set null;

create type public.installment_kind as enum ('down_payment', 'regular', 'overage');

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  party_id uuid not null unique references public.parties (id) on delete cascade,
  total_cents integer not null check (total_cents >= 0),
  down_payment_cents integer not null default 0
    check (down_payment_cents >= 0 and down_payment_cents <= total_cents),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function private.set_updated_at();

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  contract_id uuid not null references public.contracts (id) on delete cascade,
  kind public.installment_kind not null default 'regular',
  due_date date not null,
  amount_cents integer not null check (amount_cents >= 0),
  -- RN-9.2: "vencida" é derivado (due_date < hoje e paid_at null) — nunca coluna
  paid_at timestamptz,
  payment_method text,
  payment_note text,
  created_at timestamptz not null default now()
);

create index installments_contract_idx on public.installments (contract_id);
create index installments_tenant_due_idx
  on public.installments (tenant_id, due_date);

-- RN-3.3: confirmar exige contrato (reserved -> confirmed apenas).
create function private.require_contract_on_confirm() returns trigger
language plpgsql as $$
begin
  if new.status = 'confirmed' and old.status = 'reserved'
     and not exists (select 1 from public.contracts c where c.party_id = new.id)
  then
    raise exception 'contract_required' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger parties_require_contract
  before update of status on public.parties
  for each row execute function private.require_contract_on_confirm();

-- Grants (no auto-grants — docs/02 §4)
grant select, insert, update, delete
  on public.contracts, public.installments to service_role;
grant select on public.contracts, public.installments to anon, authenticated;
grant insert, update on public.contracts, public.installments to authenticated;

alter table public.contracts enable row level security;
alter table public.installments enable row level security;

create policy contracts_select_managers on public.contracts
  for select to authenticated
  using (private.has_role(tenant_id, 'manager'));

create policy contracts_insert_managers on public.contracts
  for insert to authenticated
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy contracts_update_managers on public.contracts
  for update to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (private.has_role(tenant_id, 'manager'));

create policy installments_select_managers on public.installments
  for select to authenticated
  using (private.has_role(tenant_id, 'manager'));

create policy installments_insert_managers on public.installments
  for insert to authenticated
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy installments_update_managers on public.installments
  for update to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (private.has_role(tenant_id, 'manager'));

-- Confirmação atômica: contrato + parcelas + cliente + status numa transação.
create function public.confirm_party_with_contract(
  p_party_id uuid,
  p_customer_id uuid,
  p_total_cents integer,
  p_down_payment_cents integer,
  p_installments jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_tenant uuid;
  v_contract uuid;
  v_sum integer;
begin
  select tenant_id into v_tenant from public.parties where id = p_party_id;
  if v_tenant is null then
    raise exception 'party_not_found' using errcode = '23514';
  end if;

  select coalesce(sum((i ->> 'amount_cents')::integer), 0) into v_sum
    from jsonb_array_elements(p_installments) i;
  if v_sum <> p_total_cents then
    raise exception 'installments_sum_mismatch' using errcode = '23514';
  end if;

  insert into public.contracts (tenant_id, party_id, total_cents, down_payment_cents)
  values (v_tenant, p_party_id, p_total_cents, p_down_payment_cents)
  returning id into v_contract;

  insert into public.installments (tenant_id, contract_id, kind, due_date, amount_cents)
  select v_tenant, v_contract,
         (i ->> 'kind')::public.installment_kind,
         (i ->> 'due_date')::date,
         (i ->> 'amount_cents')::integer
  from jsonb_array_elements(p_installments) i;

  update public.parties
  set customer_id = p_customer_id, status = 'confirmed'
  where id = p_party_id;

  return v_contract;
end;
$$;

revoke execute on function
  public.confirm_party_with_contract(uuid, uuid, integer, integer, jsonb)
  from public, anon;
grant execute on function
  public.confirm_party_with_contract(uuid, uuid, integer, integer, jsonb)
  to authenticated;
