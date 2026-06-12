-- M0-T3 — Shifts (turnos): the booking unit of the agenda (RN-2.1).

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  label text not null,
  starts_at time not null,
  ends_at time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_time_order check (starts_at < ends_at)
);

create index shifts_tenant_id_idx on public.shifts (tenant_id);

create trigger shifts_set_updated_at
  before update on public.shifts
  for each row execute function private.set_updated_at();

-- Grants (no auto-grants on new tables — see docs/02 §4)
grant select, insert, update, delete on public.shifts to service_role;
grant select on public.shifts to anon, authenticated;
grant insert, update, delete on public.shifts to authenticated;

alter table public.shifts enable row level security;

-- Members read (receptionists need shift data for check-in context);
-- managers write while the subscription allows it (AD-3).
create policy shifts_select_members on public.shifts
  for select to authenticated
  using (tenant_id in (select private.user_tenant_ids()));

create policy shifts_insert_managers on public.shifts
  for insert to authenticated
  with check (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );

create policy shifts_update_managers on public.shifts
  for update to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  )
  with check (private.has_role(tenant_id, 'manager'));

create policy shifts_delete_managers on public.shifts
  for delete to authenticated
  using (
    private.has_role(tenant_id, 'manager')
    and private.tenant_is_writable(tenant_id)
  );
