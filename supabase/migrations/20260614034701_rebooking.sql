-- M5-T3 — Alertas de recompra (RN-10.3/10.4/10.5). Gerados ao encerrar a
-- festa: 90 dias antes do próximo aniversário do aniversariante.

create type public.rebooking_status as enum ('pending', 'dismissed', 'converted');

create table public.rebooking_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  birthday_child_id uuid not null references public.birthday_children (id) on delete cascade,
  source_party_id uuid not null references public.parties (id) on delete cascade,
  alert_date date not null,
  status public.rebooking_status not null default 'pending',
  converted_party_id uuid references public.parties (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_party_id)
);

create index rebooking_alerts_tenant_idx
  on public.rebooking_alerts (tenant_id, status, alert_date);

grant select, insert, update, delete on public.rebooking_alerts to service_role;
grant select, update on public.rebooking_alerts to authenticated;

alter table public.rebooking_alerts enable row level security;

create policy rebooking_select_managers on public.rebooking_alerts
  for select to authenticated
  using (private.has_role(tenant_id, 'manager'));

create policy rebooking_update_managers on public.rebooking_alerts
  for update to authenticated
  using (private.has_role(tenant_id, 'manager') and private.tenant_is_writable(tenant_id))
  with check (private.has_role(tenant_id, 'manager'));

-- Gera o alerta ao encerrar (status → completed), se houver aniversariante.
create function private.generate_rebooking_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_month smallint;
  v_next_bday date;
begin
  if new.status = 'completed' and new.birthday_child_id is not null then
    select birth_month into v_month from public.birthday_children
      where id = new.birthday_child_id;
    if v_month is not null then
      -- próximo aniversário (dia 1 do mês) estritamente após a data da festa
      v_next_bday := make_date(extract(year from new.party_date)::int, v_month, 1);
      if v_next_bday <= new.party_date then
        v_next_bday := v_next_bday + interval '1 year';
      end if;
      insert into public.rebooking_alerts
        (tenant_id, birthday_child_id, source_party_id, alert_date)
      values (new.tenant_id, new.birthday_child_id, new.id,
              v_next_bday - interval '90 days')
      on conflict (source_party_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger parties_generate_rebooking
  after update of status on public.parties
  for each row execute function private.generate_rebooking_alert();
