-- M1-T4 — Parties: lifecycle state machine + double-booking block (RN-2.4, RN-3)
-- and audit_logs for sensitive actions (NF-6).
-- customer/birthday-child columns arrive in M2; frozen rule_* columns in M1-T6.

create type public.party_status as enum
  ('budget', 'reserved', 'confirmed', 'completed', 'canceled');

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  package_id uuid not null references public.packages (id),
  -- restrict: turno com festa não pode ser excluído, apenas desativado
  shift_id uuid not null references public.shifts (id) on delete restrict,
  party_date date not null, -- interpretada em America/Sao_Paulo (NF-5)
  status public.party_status not null default 'budget',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index parties_tenant_date_idx on public.parties (tenant_id, party_date);

-- RN-2.4: orçamentos coexistem; reservada/confirmada bloqueiam o turno/data.
create unique index parties_no_double_booking
  on public.parties (tenant_id, party_date, shift_id)
  where status in ('reserved', 'confirmed');

create trigger parties_set_updated_at
  before update on public.parties
  for each row execute function private.set_updated_at();

-- RN-3: transições válidas. completed → confirmed é a reabertura (RN-3.4),
-- sempre acompanhada de audit_log na Server Action.
create function private.validate_party_transition() returns trigger
language plpgsql as $$
begin
  if old.status = new.status then
    return new;
  end if;
  if not (
    (old.status = 'budget' and new.status in ('reserved', 'canceled'))
    or (old.status = 'reserved' and new.status in ('confirmed', 'canceled'))
    or (old.status = 'confirmed' and new.status in ('completed', 'canceled'))
    or (old.status = 'completed' and new.status = 'confirmed')
  ) then
    raise exception 'invalid_party_transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger parties_validate_transition
  before update of status on public.parties
  for each row execute function private.validate_party_transition();

-- Auditoria (NF-6): append-only.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  action text not null,
  entity text not null,
  entity_id uuid not null,
  reason text not null,
  data jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_tenant_idx on public.audit_logs (tenant_id, created_at);

-- Grants (no auto-grants — docs/02 §4)
grant select, insert, update, delete on public.parties to service_role;
grant select on public.parties to anon, authenticated;
grant insert, update on public.parties to authenticated; -- sem delete: cancela

grant select, insert, update, delete on public.audit_logs to service_role;
grant select, insert on public.audit_logs to authenticated; -- append-only

alter table public.parties enable row level security;
alter table public.audit_logs enable row level security;

-- Gestor: tudo do tenant. Recepcionista: só hoje/amanhã (RN-1.3, fuso SP).
create policy parties_select_managers on public.parties
  for select to authenticated
  using (private.has_role(tenant_id, 'manager'));

create policy parties_select_receptionists on public.parties
  for select to authenticated
  using (
    private.has_role(tenant_id, 'receptionist')
    and party_date between (now() at time zone 'America/Sao_Paulo')::date
      and (now() at time zone 'America/Sao_Paulo')::date + 1
  );

create policy parties_insert_managers on public.parties
  for insert to authenticated
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy parties_update_managers on public.parties
  for update to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (private.has_role(tenant_id, 'manager'));

create policy audit_logs_select_managers on public.audit_logs
  for select to authenticated
  using (private.has_role(tenant_id, 'manager'));

create policy audit_logs_insert_members on public.audit_logs
  for insert to authenticated
  with check (
    tenant_id in (select private.user_tenant_ids())
    and user_id = (select auth.uid())
  );
