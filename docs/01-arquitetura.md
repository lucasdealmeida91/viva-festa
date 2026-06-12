# 01 — Arquitetura

> **Fonte da verdade do produto:** [guia-mvp-vivafesta.md](../guia-mvp-vivafesta.md). Este documento define **como** implementar; aquele define **o quê** e **por quê**. Em conflito, o PRD vence.

## 1. Visão geral

Um único app Next.js 16 (App Router) servindo cinco superfícies, com Supabase como banco/auth/realtime e o isolamento multi-tenant imposto **no banco** via Row Level Security (RLS).

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 16 (Vercel)                      │
│                                                              │
│  /app/...        Painel do gestor (desktop-first)            │
│  /checkin        Check-in da recepção (mobile-first)         │
│  /cliente        Espaço do cliente final (mobile-first)      │
│  /{slug}/{token} Convite público, sem login (mobile-first)   │
│  /admin          Painel admin da plataforma (mínimo)         │
│                                                              │
│  lib/domain/     Regras de negócio puras (RN-4, RN-8)        │
│  Server Actions  Mutações autenticadas                       │
│  Route Handlers  Webhooks Stripe, exportação CSV             │
└──────────────┬───────────────────────────────────────────────┘
               │ supabase-js (tipos gerados) — RLS sempre ativa
┌──────────────▼───────────────────────────────────────────────┐
│  Supabase: Postgres + RLS · Auth · Realtime                  │
│  Local (CLI/Docker) em dev · Projeto cloud em produção       │
└──────────────────────────────────────────────────────────────┘
   Stripe (assinatura SaaS) · PostHog (analytics) · Sentry (erros)
```

## 2. Stack

| Camada | Ferramenta | Notas |
|---|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) + React 19.2 | Já instalado |
| UI | Tailwind v4 + shadcn (Base UI) + Hugeicons | Já instalado |
| Banco / Auth / Realtime | Supabase (Postgres 15+, RLS, Auth, Realtime) | CLI local em dev, cloud em prod |
| Billing do SaaS | Stripe (Checkout + Billing + webhooks) | Somente assinatura do buffet (RN-9.3) |
| Analytics de produto | PostHog — projeto **VivaFesta** na org SLJC LTDA (criar) | Plano de eventos em [06-observabilidade.md](06-observabilidade.md) |
| Erros / crashes | Sentry (`@sentry/nextjs`) | Client + server |
| Hosting | Vercel | Preview por PR + produção |
| Testes | Vitest (unit/integração) + Playwright (e2e) | Estratégia em [05-testes.md](05-testes.md) |

**Firebase foi removido da stack** (decisão de 11/06/2026): PostHog cobre analytics, Sentry cobre erros e Supabase cobre auth/banco — Firebase só duplicaria instrumentação.

## 3. Decisões de arquitetura (ADRs resumidos)

### AD-1 — RLS-first: autorização vive no banco
Toda tabela tem RLS habilitada desde a primeira migration (NF-1). O app acessa o banco com `supabase-js` usando a sessão do usuário (anon key + JWT); a service-role key é restrita a webhooks do Stripe, painel admin e RPCs públicas controladas. **Consequência:** mesmo um bug no app não vaza dados entre tenants. Detalhes das policies em [02-modelo-de-dados.md](02-modelo-de-dados.md).

### AD-2 — Regras de negócio em funções puras
Classificação por idade (RN-4.1) e cálculo de excedente (RN-8.2) vivem em `lib/domain/` como funções TypeScript puras, sem dependência de banco ou framework. São o núcleo do produto e exigem testes com o caso canônico (R$ 360). A classificação **nunca é armazenada** no cadastro do convidado — é derivada (RN-5.2); só entra em banco no snapshot de encerramento (RN-8.1).

### AD-3 — Modo leitura imposto no banco
O estado da assinatura (trial, ativa, inadimplente, modo leitura — RN-11) é avaliado por uma função SQL usada nas policies de **escrita** de todas as tabelas do tenant. Trial expirado = INSERT/UPDATE/DELETE negados pelo próprio Postgres; leitura continua liberada. Sem espalhar `if (subscription...)` pela aplicação.

### AD-4 — Check-in: retry em memória com estado visível (NF-3)
Decisão do fundador (11/06/2026): marcações de check-in usam UI otimista + fila de retry **em memória** com backoff exponencial e indicador visível de "X marcações não sincronizadas" (RN-7.6).
**Limitação conhecida e aceita:** refresh da página durante queda de rede perde a fila pendente.
**Caminho de evolução:** persistir a fila em `localStorage`/IndexedDB sem mudar a interface do módulo — reavaliar após o piloto do M4.

### AD-5 — Páginas públicas nunca leem tabelas diretamente
O convite público (RN-6) e o RSVP rodam sobre **RPCs Postgres `security definer`** que recebem o token da festa e retornam apenas os campos permitidos (RN-6.4). O cliente anônimo não tem policy de SELECT em nenhuma tabela. Privacidade verificada por teste de API, não só de UI (critério do M3).

### AD-6 — Billing isolado atrás de interface (D-1 do PRD)
Todo contato com Stripe fica em `lib/billing/` atrás de uma interface mínima (`createCheckout`, `getSubscriptionStatus`, `cancelAtPeriodEnd`, webhook handler). O resto do app só conhece o status da assinatura na tabela `tenants`. Trocar/adicionar gateway (Asaas, Mercado Pago) depois não toca o restante do código.

### AD-7 — Sem Cache Components no MVP
O app é quase todo autenticado e dinâmico; `cacheComponents`/PPR ficam **desligados** (NF-7 — simplicidade antes de escala). Única exceção candidata a cache: a página pública do convite — decidir no M3 se necessário.

### AD-8 — Autenticação por papel
- **Gestor / recepcionista:** Supabase Auth com e-mail + senha; vínculo e papel na tabela `memberships`.
- **Cliente final:** magic link por e-mail (Supabase Auth OTP) — RN-12.1 / decisão D-3.
- **Convidado:** sem login; só o token da festa na URL (RN-6.1).
- **Admin da plataforma:** flag `is_platform_admin` no perfil, rota `/admin` protegida.

## 4. Roteamento e superfícies

| Rota | Superfície | Quem acessa | Prioridade de tela |
|---|---|---|---|
| `/login`, `/cadastro`, `/onboarding` | Auth e criação do tenant | Público → gestor | Desktop e mobile |
| `/app/...` | Painel do gestor (agenda, festas, pacotes, clientes, financeiro, configurações) | Gestor | Desktop-first, utilizável no mobile (NF-2) |
| `/checkin` | Check-in das festas de hoje/amanhã | Recepcionista e gestor | **Mobile-first** |
| `/cliente/...` | Espaço do cliente final | Cliente final (magic link) | **Mobile-first** |
| `/[tenantSlug]/[inviteToken]` | Convite público + RSVP | Qualquer pessoa com o link | **Mobile-first** |
| `/admin` | Painel admin da plataforma | Fundador | Desktop |
| `/api/webhooks/stripe` | Webhook | Stripe | — |

**Slugs reservados:** como o convite vive na raiz (`/{slug}/{token}`, RN-6.1), a validação do slug do tenant rejeita uma lista de palavras reservadas (`app`, `checkin`, `cliente`, `admin`, `login`, `cadastro`, `api`, `onboarding`, etc.). Rotas estáticas têm precedência sobre segmentos dinâmicos no App Router, mas a lista evita confusão e colisões futuras.

## 5. Estrutura de pastas

```
app/
  (auth)/login, (auth)/cadastro, (auth)/onboarding
  app/            # painel do gestor (agenda, festas, pacotes, clientes, financeiro, config)
  checkin/        # módulo de check-in
  cliente/        # espaço do cliente final
  admin/          # painel da plataforma
  [tenantSlug]/[inviteToken]/   # convite público
  api/webhooks/stripe/route.ts
components/
  ui/             # shadcn (gerado)
  <feature>/      # componentes por funcionalidade (agenda/, checkin/, convite/...)
lib/
  domain/         # regras puras: classify.ts, overage.ts, installments.ts (+ testes)
  supabase/       # createServerClient, createBrowserClient, tipos gerados (database.types.ts)
  billing/        # interface do gateway + implementação Stripe (AD-6)
  analytics/      # wrapper PostHog (allowlist de propriedades — LGPD)
supabase/
  migrations/     # SQL versionado (CLI)
  seed.sql        # buffet fictício completo (NF-8)
  tests/          # testes de RLS/isolamento
e2e/              # Playwright
docs/             # esta documentação
proxy.ts          # (Next 16: substitui middleware.ts) refresh de sessão + guards de rota
```

## 6. Particularidades do Next.js 16 que afetam este projeto

Esta versão tem mudanças relevantes em relação ao conhecimento comum sobre Next.js. **Consulte `node_modules/next/dist/docs/` antes de implementar.** Resumo do que nos afeta:

- **`proxy.ts` substitui `middleware.ts`** (deprecado). Roda em runtime Node.js. Usaremos para refresh da sessão Supabase e redirecionamentos por papel.
- **APIs de request são assíncronas**: `cookies()`, `headers()`, `params` e `searchParams` exigem `await`. Usar os helpers globais `PageProps`/`LayoutProps`/`RouteContext` (gerados por `next typegen`).
- **Turbopack é o default** em dev e build; dev escreve em `.next/dev`.
- **`next lint` foi removido**: ESLint roda via CLI própria, flat config (`eslint.config.mjs`).
- **`revalidateTag` exige perfil** (`revalidateTag(tag, 'max')`); para read-your-writes em Server Actions usar `updateTag`; `refresh()` atualiza o router do cliente.
- **Cache Components** (`cacheComponents: true`) existe mas fica desligado (AD-7).

## 7. Tempo real

Duas telas usam Supabase Realtime (canal por festa):
1. **Painel de contagem do check-in** (RN-7.5) — atualiza a cada marcação.
2. **RSVPs em tempo real no espaço do cliente** (RN-12.2) — lista e totalizadores.

Fallback: refetch ao focar a aba. Realtime é melhoria de experiência, nunca requisito de consistência (a verdade está no banco).

## 8. O que este documento não cobre

- Schema e policies → [02-modelo-de-dados.md](02-modelo-de-dados.md)
- Ordem de execução e tarefas → [03-fases-e-tarefas.md](03-fases-e-tarefas.md)
- Convenções de código e commits → [04-convencoes.md](04-convencoes.md)
- Estratégia de testes → [05-testes.md](05-testes.md)
- Eventos PostHog e Sentry → [06-observabilidade.md](06-observabilidade.md)
- Setup de ambiente e deploy → [07-setup.md](07-setup.md)
