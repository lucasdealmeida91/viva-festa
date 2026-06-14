-- M6-T2 — Escolha de presente pelo convidado (RN-13.2). Público via RPCs
-- security definer (AD-5). Item escolhido some da lista pública; o anfitrião
-- vê quem escolheu (já coberto pela leitura do cliente em T1).

-- Lista pública: apenas itens NÃO escolhidos (evita presentes repetidos).
create function public.list_gifts(p_slug text, p_token text)
returns table (id uuid, name text, external_url text)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.external_url
  from public.gift_items g
  where g.party_id = private.resolve_invite_party(p_slug, p_token)
    and g.claimed_by_guest_id is null
  order by g.created_at;
$$;

-- Reivindica um presente; só convidado CONFIRMADO (RN-13.2).
create function public.claim_gift(
  p_slug text, p_token text, p_gift_id uuid, p_guest_name text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_party uuid := private.resolve_invite_party(p_slug, p_token);
  v_guest uuid;
begin
  if v_party is null then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  select id into v_guest from public.guests
    where party_id = v_party
      and name ilike trim(p_guest_name)
      and rsvp_status = 'confirmed'
    limit 1;
  if v_guest is null then
    raise exception 'guest_not_confirmed' using errcode = '23514';
  end if;

  update public.gift_items
    set claimed_by_guest_id = v_guest
    where id = p_gift_id and party_id = v_party and claimed_by_guest_id is null;
  if not found then
    raise exception 'already_claimed' using errcode = '23514';
  end if;
end;
$$;

revoke execute on function public.list_gifts(text, text) from public;
revoke execute on function public.claim_gift(text, text, uuid, text) from public;
grant execute on function public.list_gifts(text, text) to anon, authenticated;
grant execute on function public.claim_gift(text, text, uuid, text) to anon, authenticated;
