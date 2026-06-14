-- M5-T1 — Customer final access (RN-12). Magic link by email; on first
-- access the auth user is linked to the customer row by matching email.
-- Customers see ONLY their own data (RN-12.3).

-- customer vinculado ao usuário logado (auth.uid()), ou null.
create function private.customer_id_for_user() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.customers where auth_user_id = (select auth.uid());
$$;

grant execute on function private.customer_id_for_user() to authenticated;

-- RN-12.1 — vincula a conta logada ao customer com o mesmo e-mail (idempotente).
create function public.link_customer_account() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := (select email from auth.users where id = (select auth.uid()));
  v_customer uuid;
begin
  if v_email is null then return null; end if;
  -- já vinculado?
  select id into v_customer from public.customers
    where auth_user_id = (select auth.uid());
  if v_customer is not null then return v_customer; end if;
  -- vincula pelo e-mail, se houver customer sem conta
  update public.customers
    set auth_user_id = (select auth.uid())
    where lower(email) = lower(v_email) and auth_user_id is null
    returning id into v_customer;
  return v_customer;
end;
$$;

grant execute on function public.link_customer_account() to authenticated;

-- Policies de leitura do cliente final (own data only — RN-12.3).
create policy customers_select_self on public.customers
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy birthday_children_select_customer on public.birthday_children
  for select to authenticated
  using (customer_id = private.customer_id_for_user());

create policy parties_select_customer on public.parties
  for select to authenticated
  using (customer_id = private.customer_id_for_user());

create policy guests_select_customer on public.guests
  for select to authenticated
  using (
    party_id in (
      select id from public.parties
      where customer_id = private.customer_id_for_user()
    )
  );

create policy guest_groups_select_customer on public.guest_groups
  for select to authenticated
  using (
    party_id in (
      select id from public.parties
      where customer_id = private.customer_id_for_user()
    )
  );

create policy contracts_select_customer on public.contracts
  for select to authenticated
  using (
    party_id in (
      select id from public.parties
      where customer_id = private.customer_id_for_user()
    )
  );

create policy installments_select_customer on public.installments
  for select to authenticated
  using (
    contract_id in (
      select c.id from public.contracts c
      join public.parties p on p.id = c.party_id
      where p.customer_id = private.customer_id_for_user()
    )
  );
