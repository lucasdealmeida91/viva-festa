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
