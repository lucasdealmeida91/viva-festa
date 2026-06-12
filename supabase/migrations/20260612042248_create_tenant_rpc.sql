-- M0-T2 — Onboarding RPC: creates the tenant + manager membership atomically.
-- There is deliberately no INSERT policy on tenants/first membership: this
-- security definer function is the only door (RN-1.1, RN-1.4, RN-11.1).

create function public.create_tenant(p_name text, p_slug text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant_id uuid;
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if length(trim(p_name)) < 2 then
    raise exception 'invalid_name' using errcode = '23514';
  end if;

  -- slug format + reserved words enforced by tenants table constraints;
  -- trial_ends_at = now() + 14 days via column default (RN-11.1)
  insert into public.tenants (name, slug)
  values (trim(p_name), p_slug)
  returning id into v_tenant_id;

  insert into public.memberships (tenant_id, user_id, role)
  values (v_tenant_id, v_user_id, 'manager');

  return v_tenant_id;
end;
$$;

revoke execute on function public.create_tenant(text, text) from public, anon;
grant execute on function public.create_tenant(text, text) to authenticated;
