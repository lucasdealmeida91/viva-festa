# 07 — Setup de ambiente e deploy (runbook)

> Objetivo: uma máquina limpa chega a `npm run dev` funcionando só com este documento. Se algum passo falhar ou estiver defasado, **corrija este arquivo no mesmo PR**.

## 1. Pré-requisitos

| Ferramenta | Versão | Nota |
|---|---|---|
| Node.js | ≥ 20.9 (LTS) | Exigência do Next.js 16 |
| Docker Desktop **ou** OrbStack | atual | Para o Supabase local (`npm run db:start`) |
| Supabase CLI | — | **devDependency do projeto** (`npx supabase ...`) — instala junto com `npm install`, sem brew |
| Stripe CLI | atual | Webhooks em dev (a partir do M5) |

Contas/serviços (uma vez, pelo fundador):

| Serviço | O quê | Quando |
|---|---|---|
| Supabase | Projeto cloud `vivafesta-prod` | F0-T1 |
| Vercel | Projeto ligado ao repo GitHub | F0-T1 |
| Sentry | Projeto Next.js | F0-T5 |
| PostHog | **Projeto "VivaFesta" na org SLJC LTDA** | F0-T6 |
| Stripe | Conta + produtos: mensal R$ 197, anual R$ 1.970 | M5-T4 |
| Domínio | `vivafesta.com.br` (pendência D-4 do PRD) | Antes do M3 (URLs públicas do convite) |

## 2. Subir o ambiente local

```bash
git clone <repo> && cd viva-festa
npm install                        # instala também o Supabase CLI (devDependency)
npm run db:start                   # Postgres + Auth + Studio locais (exige Docker rodando)
cp .env.local.example .env.local   # preencher com os valores de `npx supabase status`
npm run dev                        # http://localhost:3000
```

`npm run db:start` imprime URL, anon key e service key locais. Studio local: `http://localhost:54323`.

## 3. Variáveis de ambiente

| Variável | Escopo | Origem |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | `npx supabase status` (dev) / projeto cloud (prod) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pública | idem — formato novo `sb_publishable_...` (substitui a anon key) |
| `SUPABASE_SECRET_KEY` | server | `sb_secret_...` (substitui a service role) — webhooks, `/admin`, seed |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | pública | Projeto VivaFesta (org SLJC), host `https://us.i.posthog.com` |
| `NEXT_PUBLIC_SENTRY_DSN` | pública | Projeto Sentry |
| `SENTRY_AUTH_TOKEN` | CI/build | Upload de source maps |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | server | M5; test mode em dev/preview |
| `NEXT_PUBLIC_APP_URL` | pública | `http://localhost:3000` (dev) / domínio (prod) |

Regra: variável nova ⇒ atualizar `.env.local.example`, esta tabela e as envs da Vercel no mesmo PR.

## 4. Fluxo de migrations

```bash
npm run db:migration <nome>        # cria supabase/migrations/<ts>_<nome>.sql
# escrever o SQL (tabela + RLS na MESMA migration — NF-1)
npm run db:reset                   # recria o banco local: migrations + seed.sql
npm run db:types                   # regenera lib/supabase/database.types.ts (commitar)
```

Para produção: `npx supabase db push` apontando para o projeto cloud (via `npx supabase link`), executado **manualmente pelo fundador** no início; automatizar no CI quando houver staging.

Regras:
- Migration nunca é editada depois de aplicada em prod — crie outra.
- Toda tabela nova nasce com `enable row level security` + policies na mesma migration.
- `supabase/seed.sql` (NF-8) atualizado a cada marco — ver checklist do [03-fases-e-tarefas.md](03-fases-e-tarefas.md).

## 5. Testes

```bash
npm test                  # unit (Vitest) — sem dependências externas
npm run test:integration  # exige `supabase start`
npm run test:e2e          # Playwright (exige app + supabase rodando)
```

## 6. Stripe em dev (a partir do M5)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # imprime o STRIPE_WEBHOOK_SECRET local
stripe trigger customer.subscription.updated                    # simular eventos
```

Ciclo completo de inadimplência simulável com test clocks do Stripe (RN-11.3).

## 7. Deploy (Vercel)

- `main` → produção; PRs → preview deploys automáticos.
- Previews usam o Supabase de **dev/staging**, nunca o de produção (separar envs por ambiente na Vercel).
- Checklist do primeiro deploy de produção:
  1. Projeto cloud do Supabase com migrations aplicadas e RLS verificada (rodar suite de integração apontando para staging antes).
  2. Envs de produção na Vercel (tabela §3) — Stripe em live mode só no go-live do M5.
  3. Domínio `vivafesta.com.br` apontado (D-4) + redirect www.
  4. Sentry recebendo evento de produção; PostHog idem.
  5. E-mail transacional do Supabase Auth configurado com domínio próprio (magic link cai em spam com domínio padrão — resolver antes do M5-T1).

## 8. Problemas conhecidos

- **Homebrew falha sem Command Line Tools** ("Xcode alone is not sufficient on Sequoia") — por isso o Supabase CLI vai como devDependency npm em vez de brew. Se precisar do brew para outra coisa: `xcode-select --install`.
- **Next 16 dev escreve em `.next/dev`** — limpar cache é `rm -rf .next`, e não conflita com builds.
- **Lockfile do Next**: duas instâncias de `next dev` no mesmo diretório falham — feche a anterior.
- **`supabase start` lento na primeira vez**: baixa as imagens Docker; nas seguintes é rápido.
- *(adicione aqui o que for surgindo — este é o lugar, não o chat.)*
