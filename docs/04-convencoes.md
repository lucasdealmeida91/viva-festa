# 04 — Convenções de código e processo

## 1. Idiomas

| Onde | Idioma |
|---|---|
| UI (textos, labels, mensagens de erro) | **pt-BR** — sem exceção (PRD §0.5) |
| Código, schema, variáveis, funções, comentários | Inglês |
| Commits e PRs | Inglês, referenciando RNs e tarefas |
| Documentação (`docs/`) | pt-BR |

Tradução domínio ↔ schema: glossário no [02-modelo-de-dados.md](02-modelo-de-dados.md) §5. Use-o — não invente um segundo nome em inglês para um termo que já tem mapeamento.

## 2. Localização (NF-5)

- Fuso: `America/Sao_Paulo` em toda lógica de data (agenda, "hoje/amanhã" do check-in, vencimentos, alertas).
- Datas: armazenar `date` para dias de festa/vencimentos; exibir `dd/mm/aaaa`.
- Dinheiro: **centavos `integer`** no banco e no domínio; formatar com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` apenas na borda da UI.
- Helpers centralizados em `lib/format.ts` — proibido `toLocaleString` espalhado.

## 3. Next.js 16 — padrões obrigatórios

Antes de implementar qualquer área nova, consulte o guia correspondente em `node_modules/next/dist/docs/` (instrução do AGENTS.md). Padrões fixados para este projeto:

- **`proxy.ts`** na raiz (não `middleware.ts`) — refresh de sessão Supabase e redirecionamentos por papel. Runtime Node.js.
- **`await` em APIs de request**: `cookies()`, `headers()`, `params`, `searchParams`. Tipar páginas com os helpers globais `PageProps<'/rota'>` / `LayoutProps` / `RouteContext` (rodar `next typegen`).
- **Mutações via Server Actions** (`'use server'`), uma action por caso de uso, em `app/<área>/actions.ts`. Route Handlers só para webhooks, exportação CSV e endpoints chamados por terceiros.
- **Revalidação**: preferir `updateTag` (read-your-writes) em Server Actions; `revalidateTag(tag, profile)` exige o 2º argumento; `refresh()` para atualizar o router.
- **Server Components por padrão**; `'use client'` só onde há interatividade (check-in, formulários ricos, realtime).
- **Lint**: ESLint CLI com flat config (`next lint` não existe mais); `npm run lint` + typecheck no CI.
- **Cache Components desligado** (AD-7) — não usar `'use cache'` sem decisão registrada.

## 4. Acesso a dados

- Sempre via `supabase-js` tipado (`Database` gerado). Proibido SQL ad-hoc na aplicação — SQL vive em migrations e RPCs.
- **Client por contexto:** `lib/supabase/server.ts` (Server Components/Actions, cookies da sessão), `lib/supabase/browser.ts` (client components/realtime). Service role **somente** em webhook Stripe, `/admin` e jobs — nunca importável de código de UI (usar `server-only`).
- Regra de ouro: se uma query precisa "lembrar de filtrar por tenant", a modelagem está errada — RLS é quem filtra (AD-1).
- Lógica de negócio não entra em componente nem em Server Action: entra em `lib/domain/` (puro, testável) e a action orquestra.

## 5. UI

- Componentes shadcn em `components/ui/` (gerados — não editar à mão sem necessidade); componentes do produto em `components/<feature>/`.
- Mobile-first nas superfícies de celular: check-in, convite, espaço do cliente (NF-2). Painel do gestor: desktop-first, utilizável no mobile.
- Ícones: Hugeicons (já instalado).
- Formulários: validação com mensagens pt-BR; valores monetários com máscara BRL.

## 6. Git e commits

- Branch principal: `main` *(o repo está em `master` — renomear no F0-T1)*. Trabalho em branches curtas `feat/...`, `fix/...`, PR para `main`.
- Conventional Commits **com referência a RN e tarefa**:

```
feat(parties): freeze package rules on confirmation (RN-4.5) [M1-T6]
fix(checkin): keep retry queue visible after reconnect (RN-7.6) [M4-T3]
test(domain): canonical overage case returns R$360 (RN-4, RN-8.2) [M1-T1]
```

- Testes acompanham o commit da feature, não um commit posterior.
- PR só verde no CI (lint, typecheck, unit, integração).

## 7. Variáveis de ambiente

Catálogo completo no [07-setup.md](07-setup.md). Regras:
- Segredos nunca commitados; `.env.local.example` sempre atualizado no mesmo PR que cria a variável.
- Prefixo `NEXT_PUBLIC_` apenas para o que o browser realmente precisa (URL/anon key do Supabase, key do PostHog, DSN do Sentry).
- `SUPABASE_SECRET_KEY` (service role) e `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` jamais com prefixo público.

## 8. Auditoria e dados sensíveis

- Ações sensíveis (NF-6) gravam `audit_logs` **na mesma Server Action**, com motivo obrigatório no formulário: reabrir festa, sobrescrever regras congeladas, ajustar/dispensar excedente, editar contrato.
- LGPD (NF-4): idade aproximada e mês/ano de nascimento — nunca colete além disso; nada de PII em logs, Sentry ou PostHog ([06-observabilidade.md](06-observabilidade.md) §3).

## 9. Quando o PRD não cobre um caso

Diretriz 3 do PRD §9: **pergunte ao fundador e proponha atualização do PRD**. Não invente regra silenciosamente. Registre a decisão tomada como ADR no [01-arquitetura.md](01-arquitetura.md) §3 quando for técnica, ou como nova RN no PRD quando for de produto.
