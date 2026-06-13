-- M3-T1 — Guests and guest groups (RN-5).
-- Classification (exempt/child/adult) is NEVER stored: it is derived from the
-- party's frozen rules by lib/domain/classify. Only `age` is persisted.

create type public.rsvp_status as enum ('invited', 'confirmed', 'declined');
create type public.attendance_status as enum ('present', 'absent');
create type public.guest_origin as enum
  ('host', 'companion', 'self_registered', 'walk_in');

create table public.guest_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  party_id uuid not null references public.parties (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index guest_groups_party_idx on public.guest_groups (party_id);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  party_id uuid not null references public.parties (id) on delete cascade,
  group_id uuid references public.guest_groups (id) on delete set null,
  name text not null,
  age smallint check (age is null or (age >= 0 and age <= 120)),
  phone text,
  note text,
  rsvp_status public.rsvp_status not null default 'invited',
  attendance public.attendance_status,
  origin public.guest_origin not null default 'host',
  companion_of uuid references public.guests (id) on delete cascade,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guests_party_idx on public.guests (party_id);
create index guests_group_idx on public.guests (group_id);

create trigger guests_set_updated_at
  before update on public.guests
  for each row execute function private.set_updated_at();

-- RN-5.4: após o encerramento a lista congela (só reabertura RN-3.4 libera).
create function private.guard_frozen_guest_list() returns trigger
language plpgsql as $$
declare
  v_status public.party_status;
  v_party uuid := coalesce(new.party_id, old.party_id);
begin
  select status into v_status from public.parties where id = v_party;
  if v_status = 'completed' then
    raise exception 'guest_list_frozen' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guests_guard_frozen
  before insert or update or delete on public.guests
  for each row execute function private.guard_frozen_guest_list();

-- Grants (no auto-grants — docs/02 §4)
grant select, insert, update, delete
  on public.guest_groups, public.guests to service_role;
grant select on public.guest_groups, public.guests to anon, authenticated;
grant insert, update, delete
  on public.guest_groups, public.guests to authenticated;

alter table public.guest_groups enable row level security;
alter table public.guests enable row level security;

-- Gestor: tudo do tenant. Recepcionista: convidados de festas hoje/amanhã
-- (preparado para o check-in do M4). Cliente final entra no M5.
create policy guest_groups_select on public.guest_groups
  for select to authenticated
  using (tenant_id in (select private.user_tenant_ids()));

create policy guest_groups_write_managers on public.guest_groups
  for all to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy guests_select_managers on public.guests
  for select to authenticated
  using (private.has_role(tenant_id, 'manager'));

create policy guests_select_receptionists on public.guests
  for select to authenticated
  using (
    private.has_role(tenant_id, 'receptionist')
    and exists (
      select 1 from public.parties p
      where p.id = party_id
        and p.party_date between (now() at time zone 'America/Sao_Paulo')::date
          and (now() at time zone 'America/Sao_Paulo')::date + 1
    )
  );

create policy guests_write_managers on public.guests
  for all to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );
