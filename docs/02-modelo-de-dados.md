# 02 — Modelo de dados e RLS

> Schema em inglês; domínio em pt-BR. O glossário bilíngue está no fim deste documento.
> Convenções: PKs `uuid default gen_random_uuid()`, timestamps `timestamptz` (`created_at`/`updated_at`), dinheiro em **centavos** (`integer`), enums Postgres nativos.

## 1. Diagrama de entidades

```
tenants ─┬─ memberships ──── auth.users
         ├─ shifts
         ├─ packages
         ├─ customers ──── birthday_children
         ├─ parties ─┬─ guest_groups ── guests
         │           ├─ contracts ── installments
         │           └─ gift_items            [M6]
         ├─ rebooking_alerts
         └─ audit_logs
```

Toda tabela (exceto `tenants`) carrega `tenant_id` **denormalizado**, mesmo quando derivável pela cadeia de FKs — é o que torna as policies de RLS simples e baratas (RN-1.1, NF-1).

## 2. Tabelas

### tenants
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| name, slug | text | `slug` unique, válido para URL, fora da lista de slugs reservados ([01-arquitetura.md](01-arquitetura.md) §4) |
| address, phone | text | |
| rebooking_message | text | Modelo da mensagem de recompra (RN-10.4), com placeholders `{nome}`, `{aniversariante}`, `{buffet}` |
| subscription_status | enum `trialing · active · past_due · read_only · blocked · canceled` | Máquina de estados da RN-11 |
| trial_ends_at | timestamptz | RN-11.1 |
| read_only_since, block_at, delete_at | timestamptz | Janelas da RN-11.2/11.3 |
| stripe_customer_id, stripe_subscription_id | text | Preenchidos pelo webhook (AD-6) |

### memberships — usuários do buffet (RN-1.2)
| Coluna | Tipo | Notas |
|---|---|---|
| tenant_id, user_id | uuid | FK `auth.users`; unique (tenant_id, user_id) |
| role | enum `manager · receptionist` | Recepcionista: só check-in (RN-1.3) |

### profiles — dados globais do usuário
`user_id` (FK auth.users, PK), `full_name`, `is_platform_admin boolean default false` (painel `/admin`).

### shifts — turnos (RN-2.1)
`tenant_id`, `weekday smallint (0–6)`, `label text` ("Sábado tarde"), `starts_at time`, `ends_at time`, `active boolean`. Turno é a unidade de reserva; 1 festa por turno/data no MVP (RN-2.2, D-2).

### customers — cliente final (RN-10.1)
`tenant_id`, `name`, `phone`, `email`, `auth_user_id uuid null` (FK auth.users — preenchido no primeiro acesso por magic link). Unique parcial em `(tenant_id, email)`.

### birthday_children — aniversariantes (RN-10.1, LGPD/NF-4)
`tenant_id`, `customer_id`, `name`, `birth_month smallint (1–12)`, `birth_year smallint`. **Nunca armazenar a data completa de nascimento.**

### packages — pacotes (RN-4)
| Coluna | Tipo | Notas |
|---|---|---|
| tenant_id, name | | |
| adult_capacity, child_capacity | integer | |
| base_price_cents | integer | |
| exempt_age | smallint | `idade < exempt_age` → isento; pode ser 0 (RN-4.2) |
| adult_age | smallint | `idade ≥ adult_age` → adulto |
| extra_adult_price_cents, extra_child_price_cents | integer | |
| archived | boolean | Pacote não se apaga (festas históricas o referenciam); arquiva |

`CHECK (exempt_age >= 0 AND exempt_age < adult_age)` — RN-4.2.

### parties — festas (RN-3)
| Coluna | Tipo | Notas |
|---|---|---|
| tenant_id, customer_id, birthday_child_id, package_id | uuid | |
| party_date | date | Sempre interpretada em `America/Sao_Paulo` (NF-5) |
| shift_id | uuid | |
| status | enum `budget · reserved · confirmed · completed · canceled` | Transições da RN-3 validadas em Server Action + trigger |
| turning_age | smallint | Idade que o aniversariante completa (RN-6.2) |
| **Regras congeladas (RN-4.5)** — preenchidas na confirmação: | | |
| rule_exempt_age, rule_adult_age | smallint | |
| rule_adult_capacity, rule_child_capacity | integer | |
| rule_extra_adult_price_cents, rule_extra_child_price_cents | integer | |
| **Convite (RN-6):** | | |
| invite_token | text unique | Curto e não adivinhável (nanoid 8+ chars), gerado na confirmação |
| invite_published | boolean | |
| host_message | text | Mensagem do anfitrião |
| list_mode | enum `closed · open` | RN-6.5, padrão `closed` |
| rsvp_deadline | date null | RN-6.6 |
| **Encerramento (RN-8.1):** | | |
| completed_at | timestamptz | |
| closing_snapshot | jsonb | Contagens finais por categoria + lista nominal com classificação (imutável) |
| overage_adults, overage_children | integer | Calculados no encerramento |
| overage_total_cents | integer | Recomendação (RN-8.4) |
| overage_decision | enum `pending · confirmed · adjusted · waived` | RN-8.4 |
| report_shared_with_customer | boolean | RN-12.2 — gestor libera o relatório |

**Bloqueio de double-booking (RN-2.4):**
```sql
create unique index parties_no_double_booking
  on parties (tenant_id, party_date, shift_id)
  where status in ('reserved', 'confirmed');
```
Orçamentos coexistem no mesmo turno; reservadas/confirmadas não.

### guest_groups — grupos/famílias (RN-5.3)
`tenant_id`, `party_id`, `name`.

### guests — convidados (RN-5)
| Coluna | Tipo | Notas |
|---|---|---|
| tenant_id, party_id, group_id | uuid | `group_id` null = sem grupo |
| name | text | Único campo obrigatório (RN-5.2) |
| age | smallint null | Sem idade ⇒ classificado adulto + sinalizado na UI (RN-4.3) |
| phone, note | text | |
| rsvp_status | enum `invited · confirmed · declined` | Antes da festa (RN-5.1) |
| attendance | enum null `present · absent` | No dia; `absent` em massa no encerramento |
| origin | enum `host · companion · self_registered · walk_in` | RN-5.3, RN-6.5, RN-7.3 |
| companion_of | uuid null | FK guests — titular que informou o acompanhante |
| checked_in_at | timestamptz null | |

A classificação isento/criança/adulto **não tem coluna**: é derivada por `lib/domain/classify.ts` com as regras congeladas da festa (RN-5.2). Materializada apenas dentro de `closing_snapshot`.

### contracts — contratos (RN-9.1)
`tenant_id`, `party_id unique`, `total_cents`, `down_payment_cents`, `notes`. Festa só entra em `confirmed` com contrato (constraint validada na Server Action de transição + teste).

### installments — parcelas (RN-9.2)
| Coluna | Tipo | Notas |
|---|---|---|
| tenant_id, contract_id | | |
| kind | enum `down_payment · regular · overage` | `overage` criada via RN-9.5 |
| due_date | date | |
| amount_cents | integer | |
| paid_at | timestamptz null | null + `due_date < hoje` ⇒ **vencida** (derivado, nunca coluna — RN-9.2) |
| payment_method, payment_note | text | Registro manual (RN-9.3) |

### rebooking_alerts — alertas de recompra (RN-10.3)
`tenant_id`, `birthday_child_id`, `source_party_id`, `alert_date date` (90 dias antes do aniversário seguinte), `status enum pending · dismissed · converted`, `converted_party_id uuid null`. Gerados por job/función ao encerrar festa; status alimenta a métrica de recompra (seção 8 do PRD).

### audit_logs — auditoria (NF-6)
`tenant_id`, `user_id`, `action text`, `entity text`, `entity_id uuid`, `reason text`, `data jsonb`, `created_at`. Gravado explicitamente pelas Server Actions sensíveis: reabrir festa realizada (RN-3.4), sobrescrever regras congeladas (RN-4.6), ajustar/dispensar excedente (RN-8.4), editar contrato. Append-only (sem policy de UPDATE/DELETE).

### gift_items — lista de presentes [M6, opcional]
`tenant_id`, `party_id`, `name`, `external_url`, `claimed_by_guest_id uuid null` (RN-13.2 — item escolhido some da lista pública, anfitrião vê quem escolheu).

## 3. RLS — estratégia

RLS habilitada em **todas** as tabelas na mesma migration que as cria. Nenhuma exceção.

### Funções auxiliares (schema `private`)

```sql
private.user_tenant_ids() returns setof uuid       -- tenants do usuário logado (via memberships)
private.has_role(t uuid, r role) returns boolean    -- papel no tenant
private.tenant_is_writable(t uuid) returns boolean  -- assinatura permite escrita (AD-3 / RN-11)
private.customer_id_for_user(t uuid) returns uuid   -- customer vinculado ao auth.uid() (cliente final)
```

`tenant_is_writable` retorna `true` para `trialing` (dentro do prazo) e `active`; `past_due` dentro da janela de 10 dias (RN-11.3); `false` para `read_only`/`blocked`. É chamada em **toda policy de INSERT/UPDATE/DELETE** — o modo leitura é imposto pelo Postgres.

### Matriz de acesso por papel

| Papel | SELECT | Escrita |
|---|---|---|
| **Gestor** | Tudo do(s) seu(s) tenant(s) | Tudo, se `tenant_is_writable` |
| **Recepcionista** | `parties` de hoje/amanhã (fuso SP) + seus `guests`/`guest_groups` + dados mínimos de `shifts`/regras congeladas | Apenas `guests` dessas festas: `attendance`, `checked_in_at` e INSERT de walk-in (RN-1.3, RN-7) |
| **Cliente final** | Suas `parties`, `guests`, `contracts`/`installments` (leitura), relatório quando `report_shared_with_customer` (RN-12.2/12.3) | `guests`/`guest_groups` das suas festas **até o início da festa** (RN-5.4) |
| **Convidado (anon)** | **Nada direto.** Só RPCs `security definer` (AD-5) | Só RPCs |
| **Admin plataforma** | Via service role no painel `/admin` (não passa por RLS) | Idem |

"Hoje/amanhã" do recepcionista: `party_date between (now() at time zone 'America/Sao_Paulo')::date and (now() at time zone 'America/Sao_Paulo')::date + 1`.

### RPCs públicas (anon) — convite e RSVP

| Função | Faz | Retorna / proíbe |
|---|---|---|
| `get_invite(slug, token)` | Carrega a página do convite (RN-6.2) | Festa, aniversariante, data/turno, endereço, mensagem. **Nunca** lista de convidados ou telefones (RN-6.4) |
| `find_guest(slug, token, name)` | Busca do próprio nome (RN-6.3) | Apenas matches de nome + o grupo do match; sem status nem telefone de terceiros |
| `submit_rsvp(...)` | Confirma/recusa + acompanhantes (RN-6.3/6.7) | Valida `rsvp_deadline` (RN-6.6), `list_mode` (RN-6.5) e festa publicada |
| `claim_gift(...)` [M6] | Marca presente (RN-13.2) | |

Todas `security definer`, com `search_path` fixado, validando token + slug juntos, e **testadas via API** no M3 (critério de aceite).

## 4. Migrations e tipos

- Migrations versionadas pelo Supabase CLI em `supabase/migrations/` (fluxo no [07-setup.md](07-setup.md)).
- Tipos TypeScript gerados: `npm run db:types` → `lib/supabase/database.types.ts` (commitado).
- Ordem de criação acompanha as fases do [03-fases-e-tarefas.md](03-fases-e-tarefas.md) — nada de criar o schema inteiro no dia 1.

## 5. Glossário bilíngue (domínio ↔ schema)

| PRD (pt-BR) | Schema/código (EN) |
|---|---|
| Tenant / casa de festas | `tenants` |
| Usuário do buffet (gestor, recepcionista) | `memberships` (`manager`, `receptionist`) |
| Cliente final | `customers` |
| Aniversariante | `birthday_children` |
| Festa | `parties` |
| Turno | `shifts` |
| Pacote | `packages` |
| Regra de contagem por idade | `rule_*` congeladas em `parties` |
| Convidado / acompanhante / walk-in | `guests` (`origin`: `host · companion · self_registered · walk_in`) |
| Grupo/família | `guest_groups` |
| RSVP | `rsvp_status` (`invited · confirmed · declined`) |
| Check-in / presente / ausente | `attendance` (`present · absent`), `checked_in_at` |
| Excedente | overage (`overage_*`) |
| Contrato | `contracts` |
| Parcela / entrada | `installments` (`kind`: `down_payment · regular · overage`) |
| Orçamento → reservada → confirmada → realizada → cancelada | `budget · reserved · confirmed · completed · canceled` |
| Alerta de recompra | `rebooking_alerts` |
| Lista de presentes | `gift_items` |
