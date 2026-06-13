-- M4-T4 — Encerramento e excedente (RN-8). O cálculo do excedente vive em
-- lib/domain/overage (AD-2, testado com R$360); a server action computa e a
-- RPC persiste transacionalmente. close_party é manager-only.

create type public.overage_decision as enum
  ('pending', 'confirmed', 'adjusted', 'waived');

alter table public.parties
  add column completed_at timestamptz,
  add column closing_snapshot jsonb,
  add column overage_adults integer,
  add column overage_children integer,
  add column overage_total_cents integer,
  add column overage_decision public.overage_decision not null default 'pending',
  add column report_shared_with_customer boolean not null default false;

-- RN-8.1 — encerra: ausência em massa + snapshot + excedente + status.
create function public.close_party(
  p_party_id uuid,
  p_snapshot jsonb,
  p_overage_adults integer,
  p_overage_children integer,
  p_overage_total_cents integer
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_status public.party_status;
begin
  select tenant_id, status into v_tenant, v_status
    from public.parties where id = p_party_id;
  if v_tenant is null or not private.has_role(v_tenant, 'manager') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_status <> 'confirmed' then
    raise exception 'party_not_confirmed' using errcode = '23514';
  end if;

  -- (a) ausência em massa: quem não recebeu check-in (status ainda confirmed,
  -- o guard de lista congelada só atua em 'completed').
  update public.guests
    set attendance = 'absent'
    where party_id = p_party_id and attendance is null;

  -- (b)(c)(d) snapshot + excedente + status realizada.
  update public.parties set
    status = 'completed',
    completed_at = now(),
    closing_snapshot = p_snapshot,
    overage_adults = p_overage_adults,
    overage_children = p_overage_children,
    overage_total_cents = p_overage_total_cents,
    overage_decision = 'pending'
  where id = p_party_id;
end;
$$;

-- RN-8.4 — decisão do excedente (confirmar/ajustar/dispensar) com auditoria.
create function public.decide_overage(
  p_party_id uuid,
  p_decision public.overage_decision,
  p_amount_cents integer,
  p_reason text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
begin
  select tenant_id into v_tenant from public.parties where id = p_party_id;
  if v_tenant is null or not private.has_role(v_tenant, 'manager') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_decision = 'adjusted' and coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required' using errcode = '23514';
  end if;

  update public.parties set
    overage_decision = p_decision,
    overage_total_cents = case when p_decision = 'adjusted'
      then p_amount_cents else overage_total_cents end
  where id = p_party_id;

  -- NF-6: ajuste/dispensa do excedente são auditados.
  if p_decision in ('adjusted', 'waived') then
    insert into public.audit_logs
      (tenant_id, user_id, action, entity, entity_id, reason, data)
    values (v_tenant, (select auth.uid()), 'decide_overage', 'parties',
            p_party_id, coalesce(p_reason, ''),
            jsonb_build_object('decision', p_decision, 'amount_cents', p_amount_cents));
  end if;
end;
$$;

grant execute on function
  public.close_party(uuid, jsonb, integer, integer, integer) to authenticated;
grant execute on function
  public.decide_overage(uuid, public.overage_decision, integer, text)
  to authenticated;
