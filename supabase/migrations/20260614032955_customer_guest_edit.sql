-- M5-T2 — Cliente final edita a própria lista até o início da festa (RN-5.4/12.2).
-- Permitido quando a festa é dele, está confirmada e ainda não passou.

create function private.customer_can_edit_party(p_party_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.parties p
    where p.id = p_party_id
      and p.customer_id = private.customer_id_for_user()
      and p.status = 'confirmed'
      and p.party_date >= (now() at time zone 'America/Sao_Paulo')::date
  );
$$;

grant execute on function private.customer_can_edit_party(uuid) to authenticated;

create policy guests_insert_customer on public.guests
  for insert to authenticated
  with check (
    private.customer_can_edit_party(party_id)
    and tenant_id in (select p.tenant_id from public.parties p where p.id = party_id)
  );

create policy guests_update_customer on public.guests
  for update to authenticated
  using (private.customer_can_edit_party(party_id))
  with check (private.customer_can_edit_party(party_id));

create policy guests_delete_customer on public.guests
  for delete to authenticated
  using (private.customer_can_edit_party(party_id));

create policy guest_groups_insert_customer on public.guest_groups
  for insert to authenticated
  with check (
    private.customer_can_edit_party(party_id)
    and tenant_id in (select p.tenant_id from public.parties p where p.id = party_id)
  );

create policy guest_groups_delete_customer on public.guest_groups
  for delete to authenticated
  using (private.customer_can_edit_party(party_id));

-- Cliente lê o turno da própria festa (para exibir horário).
create policy shifts_select_customer on public.shifts
  for select to authenticated
  using (
    id in (
      select shift_id from public.parties
      where customer_id = private.customer_id_for_user()
    )
  );

-- RN-12.2 — URL do convite da própria festa (cliente não lê tenants direto).
create function public.customer_invite_path(p_party_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select t.slug || '/' || p.invite_token
  from public.parties p
  join public.tenants t on t.id = p.tenant_id
  where p.id = p_party_id
    and p.customer_id = private.customer_id_for_user()
    and p.invite_published = true
    and p.invite_token is not null;
$$;

grant execute on function public.customer_invite_path(uuid) to authenticated;
