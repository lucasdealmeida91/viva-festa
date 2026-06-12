-- NF-8: demo seed — buffet fictício completo para dev e demos de venda.
-- Cresce a cada marco (docs/03-fases-e-tarefas.md). Nunca roda em produção.
-- Login demo: demo@vivafesta.dev / recepcao@vivafesta.dev · senha: demo-vivafesta-123

-- Usuários auth (o trigger handle_new_user cria os profiles)
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
   confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000',
   '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
   'demo@vivafesta.dev', crypt('demo-vivafesta-123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Gestora Demo"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
   'recepcao@vivafesta.dev', crypt('demo-vivafesta-123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Recepção Demo"}',
   now(), now(), '', '', '', '');

insert into auth.identities
  (id, user_id, provider_id, identity_data, provider,
   last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), '10000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   '{"sub":"10000000-0000-4000-8000-000000000001","email":"demo@vivafesta.dev","email_verified":true}',
   'email', now(), now(), now()),
  (gen_random_uuid(), '10000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000002',
   '{"sub":"10000000-0000-4000-8000-000000000002","email":"recepcao@vivafesta.dev","email_verified":true}',
   'email', now(), now(), now());

-- Tenant demo
insert into public.tenants (id, name, slug, address, phone)
values ('20000000-0000-4000-8000-000000000001', 'Buffet Alegria (Demo)',
        'buffet-alegria', 'Rua das Festas, 123 — São Paulo/SP', '11 4002-8922');

insert into public.memberships (tenant_id, user_id, role) values
  ('20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'manager'),
  ('20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000002', 'receptionist');

-- Turnos (RN-2.1)
insert into public.shifts (tenant_id, weekday, label, starts_at, ends_at) values
  ('20000000-0000-4000-8000-000000000001', 6, 'Sábado almoço', '12:00', '16:00'),
  ('20000000-0000-4000-8000-000000000001', 6, 'Sábado noite', '18:00', '22:00'),
  ('20000000-0000-4000-8000-000000000001', 0, 'Domingo almoço', '12:00', '16:00');

-- Pacotes (RN-4) — o "Festa Top" é o pacote do exemplo canônico do PRD
insert into public.packages
  (id, tenant_id, name, adult_capacity, child_capacity, base_price_cents,
   exempt_age, adult_age, extra_adult_price_cents, extra_child_price_cents)
values
  ('30000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001', 'Pacote Festa Top',
   50, 30, 550000, 8, 13, 9000, 5500),
  ('30000000-0000-4000-8000-000000000002',
   '20000000-0000-4000-8000-000000000001', 'Pacote Festa Mini',
   30, 20, 350000, 8, 13, 8000, 5000);

-- Festas em vários status (NF-8): datas relativas a hoje, sempre em sábados
-- futuros distintos. Confirmada já com regras congeladas (RN-4.5).
with saturdays as (
  select (current_date + ((6 - extract(dow from current_date)::int + 7) % 7)
          + n * 7) as d, n
  from generate_series(1, 3) n
),
shift as (
  select id from public.shifts
  where tenant_id = '20000000-0000-4000-8000-000000000001' and weekday = 6
  order by starts_at limit 1
)
insert into public.parties
  (tenant_id, package_id, shift_id, party_date, status, notes,
   rule_exempt_age, rule_adult_age, rule_adult_capacity, rule_child_capacity,
   rule_extra_adult_price_cents, rule_extra_child_price_cents)
select
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  shift.id, saturdays.d,
  case saturdays.n when 1 then 'budget'::public.party_status
                   when 2 then 'reserved' else 'confirmed' end,
  case saturdays.n when 1 then 'Interessada via Instagram' else null end,
  case when saturdays.n = 3 then 8 end,
  case when saturdays.n = 3 then 13 end,
  case when saturdays.n = 3 then 50 end,
  case when saturdays.n = 3 then 30 end,
  case when saturdays.n = 3 then 9000 end,
  case when saturdays.n = 3 then 5500 end
from saturdays, shift;
