-- M3-T3 — Digital invite (RN-6). Public access goes ONLY through security
-- definer RPCs (AD-5): the anon role has no SELECT policy on any table.

create type public.list_mode as enum ('closed', 'open');

alter table public.parties
  add column invite_token text unique,
  add column invite_published boolean not null default false,
  add column host_message text,
  add column list_mode public.list_mode not null default 'closed',
  add column rsvp_deadline date,
  add column turning_age smallint check (turning_age is null or turning_age >= 0);

-- get_invite: dados públicos do convite (RN-6.2). NUNCA retorna lista de
-- convidados, telefones ou status de terceiros (RN-6.4). Verificado por teste
-- de API no M3-T6.
create function public.get_invite(p_slug text, p_token text)
returns table (
  party_id uuid,
  buffet_name text,
  buffet_address text,
  birthday_child_name text,
  turning_age smallint,
  party_date date,
  shift_label text,
  shift_starts_at time,
  shift_ends_at time,
  host_message text,
  list_mode public.list_mode,
  rsvp_deadline date,
  rsvp_open boolean
)
language sql stable security definer set search_path = '' as $$
  select
    p.id,
    t.name,
    t.address,
    bc.name,
    p.turning_age,
    p.party_date,
    s.label,
    s.starts_at,
    s.ends_at,
    p.host_message,
    p.list_mode,
    p.rsvp_deadline,
    (p.rsvp_deadline is null
       or p.rsvp_deadline >= (now() at time zone 'America/Sao_Paulo')::date)
  from public.parties p
  join public.tenants t on t.id = p.tenant_id
  join public.shifts s on s.id = p.shift_id
  left join public.birthday_children bc on bc.id = p.birthday_child_id
  where t.slug = p_slug
    and p.invite_token = p_token
    and p.invite_published = true
    and p.status = 'confirmed';
$$;

revoke execute on function public.get_invite(text, text) from public;
grant execute on function public.get_invite(text, text) to anon, authenticated;
