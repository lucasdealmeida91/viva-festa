-- M3-T4/T5 — RSVP RPCs (RN-6.3/6.5/6.6/6.7). Public, security definer.
-- The anon visitor sees only their own match/group (RN-6.4).

-- Resolve a published+confirmed party from slug+token, or null.
create function private.resolve_invite_party(p_slug text, p_token text)
returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id
  from public.parties p
  join public.tenants t on t.id = p.tenant_id
  where t.slug = p_slug
    and p.invite_token = p_token
    and p.invite_published = true
    and p.status = 'confirmed';
$$;

-- find_guest: busca do próprio nome (RN-6.3). Retorna apenas os matches e o
-- nome do grupo — sem telefone, sem status de terceiros (RN-6.4).
create function public.find_guest(p_slug text, p_token text, p_name text)
returns table (guest_id uuid, guest_name text, group_name text, rsvp_status public.rsvp_status)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, gg.name, g.rsvp_status
  from public.guests g
  left join public.guest_groups gg on gg.id = g.group_id
  where g.party_id = private.resolve_invite_party(p_slug, p_token)
    and g.companion_of is null
    and g.name ilike '%' || trim(p_name) || '%'
  order by g.name
  limit 20;
$$;

-- submit_rsvp: confirma/recusa + acompanhantes (RN-6.3/6.7). Em lista aberta
-- (RN-6.5) cria o próprio convidado quando p_guest_id é null. Respeita o
-- prazo de RSVP (RN-6.6).
create function public.submit_rsvp(
  p_slug text,
  p_token text,
  p_response public.rsvp_status,
  p_guest_id uuid default null,
  p_guest_name text default null,
  p_companions jsonb default '[]'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_party uuid := private.resolve_invite_party(p_slug, p_token);
  v_tenant uuid;
  v_mode public.list_mode;
  v_deadline date;
  v_group uuid;
  v_guest uuid := p_guest_id;
  v_companion jsonb;
begin
  if v_party is null then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  select tenant_id, list_mode, rsvp_deadline
    into v_tenant, v_mode, v_deadline
    from public.parties where id = v_party;

  -- RN-6.6: após o prazo, nenhuma ação de confirmação é aceita.
  if v_deadline is not null
     and v_deadline < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'rsvp_closed' using errcode = '23514';
  end if;

  if v_guest is null then
    -- Auto-cadastro só em lista aberta (RN-6.5).
    if v_mode <> 'open' then
      raise exception 'guest_not_found' using errcode = 'P0002';
    end if;
    if coalesce(trim(p_guest_name), '') = '' then
      raise exception 'name_required' using errcode = '23514';
    end if;
    insert into public.guests (tenant_id, party_id, name, rsvp_status, origin)
    values (v_tenant, v_party, trim(p_guest_name), p_response, 'self_registered')
    returning id into v_guest;
  else
    -- O convidado precisa pertencer a esta festa.
    update public.guests
      set rsvp_status = p_response
      where id = v_guest and party_id = v_party and companion_of is null;
    if not found then
      raise exception 'guest_not_found' using errcode = 'P0002';
    end if;
  end if;

  select group_id into v_group from public.guests where id = v_guest;

  -- Reescreve os acompanhantes do titular (RN-5.3): entram no grupo dele.
  delete from public.guests where companion_of = v_guest;
  if p_response = 'confirmed' then
    for v_companion in select * from jsonb_array_elements(p_companions) loop
      insert into public.guests
        (tenant_id, party_id, group_id, name, age, rsvp_status, origin, companion_of)
      values (
        v_tenant, v_party, v_group,
        trim(v_companion ->> 'name'),
        nullif(v_companion ->> 'age', '')::smallint,
        'confirmed', 'companion', v_guest
      );
    end loop;
  end if;

  return v_guest;
end;
$$;

revoke execute on function public.find_guest(text, text, text) from public;
revoke execute on function
  public.submit_rsvp(text, text, public.rsvp_status, uuid, text, jsonb) from public;
grant execute on function public.find_guest(text, text, text) to anon, authenticated;
grant execute on function
  public.submit_rsvp(text, text, public.rsvp_status, uuid, text, jsonb)
  to anon, authenticated;
