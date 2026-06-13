-- M4-T1/T2 — Check-in RPCs (RN-7). Security definer with explicit role
-- checks: manager of the tenant, OR receptionist limited to today/tomorrow
-- parties (RN-1.3). Receptionists touch only attendance via these RPCs.

create function private.can_checkin(p_party_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.parties p
    where p.id = p_party_id
      and (
        private.has_role(p.tenant_id, 'manager')
        or (
          private.has_role(p.tenant_id, 'receptionist')
          and p.party_date between
            (now() at time zone 'America/Sao_Paulo')::date
            and (now() at time zone 'America/Sao_Paulo')::date + 1
        )
      )
  );
$$;

-- RN-7.1/7.4 — marca presente (true) ou desfaz (false → volta a não-marcado).
-- Permitido apenas enquanto a festa não foi encerrada.
create function public.checkin_set_present(p_guest_id uuid, p_present boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_party uuid;
  v_status public.party_status;
begin
  select party_id into v_party from public.guests where id = p_guest_id;
  if v_party is null or not private.can_checkin(v_party) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select status into v_status from public.parties where id = v_party;
  if v_status = 'completed' then
    raise exception 'party_closed' using errcode = '23514';
  end if;

  update public.guests
  set attendance = case when p_present then 'present'::public.attendance_status else null end,
      checked_in_at = case when p_present then now() else null end
  where id = p_guest_id;
end;
$$;

-- RN-7.2 — marca o grupo inteiro de uma vez.
create function public.checkin_group(p_group_id uuid, p_present boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_party uuid;
begin
  select party_id into v_party from public.guest_groups where id = p_group_id;
  if v_party is null or not private.can_checkin(v_party) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.guests
  set attendance = case when p_present then 'present'::public.attendance_status else null end,
      checked_in_at = case when p_present then now() else null end
  where group_id = p_group_id;
end;
$$;

-- RN-7.3 — walk-in: pessoa fora da lista, entra já presente.
create function public.checkin_add_walkin(
  p_party_id uuid, p_name text, p_age smallint default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_guest uuid;
begin
  if not private.can_checkin(p_party_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'name_required' using errcode = '23514';
  end if;
  select tenant_id into v_tenant from public.parties where id = p_party_id;

  insert into public.guests
    (tenant_id, party_id, name, age, attendance, checked_in_at, origin)
  values (v_tenant, p_party_id, trim(p_name), p_age, 'present', now(), 'walk_in')
  returning id into v_guest;
  return v_guest;
end;
$$;

grant execute on function private.can_checkin(uuid) to authenticated;
grant execute on function public.checkin_set_present(uuid, boolean) to authenticated;
grant execute on function public.checkin_group(uuid, boolean) to authenticated;
grant execute on function public.checkin_add_walkin(uuid, text, smallint) to authenticated;
