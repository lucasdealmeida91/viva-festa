-- M1-T6 — Frozen age/capacity rules (RN-4.5/RN-4.6).
-- On confirmation the package parameters are COPIED onto the party; editing
-- the package afterwards never affects confirmed parties. The copy happens
-- in a trigger so no application path can skip it.

alter table public.parties
  add column rule_exempt_age smallint,
  add column rule_adult_age smallint,
  add column rule_adult_capacity integer,
  add column rule_child_capacity integer,
  add column rule_extra_adult_price_cents integer,
  add column rule_extra_child_price_cents integer,
  add constraint parties_rule_ages
    check (
      rule_exempt_age is null
      or (rule_exempt_age >= 0 and rule_exempt_age < rule_adult_age)
    );

create function private.freeze_party_rules() returns trigger
language plpgsql as $$
begin
  -- Congela uma única vez: a reabertura (completed -> confirmed) não recopia.
  if new.status = 'confirmed' and new.rule_adult_age is null then
    select p.exempt_age, p.adult_age, p.adult_capacity, p.child_capacity,
           p.extra_adult_price_cents, p.extra_child_price_cents
      into new.rule_exempt_age, new.rule_adult_age, new.rule_adult_capacity,
           new.rule_child_capacity, new.rule_extra_adult_price_cents,
           new.rule_extra_child_price_cents
      from public.packages p
      where p.id = new.package_id;
  end if;
  return new;
end;
$$;

create trigger parties_freeze_rules
  before update of status on public.parties
  for each row execute function private.freeze_party_rules();
