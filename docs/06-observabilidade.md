# 06 — Observabilidade: PostHog e Sentry

> Decisões (11/06/2026): PostHog para analytics de produto no **projeto 466868 (organização dedicada ao VivaFesta, US Cloud)** — movido da org SLJC em 12/06/2026 para separar os dados; Sentry para erros client+server. **Firebase fora da stack.**
> Implementação: wrapper em `lib/analytics/` (allowlist), init de client em `instrumentation-client.ts`, Sentry server em `sentry.server.config.ts` (F0-T5/T6, 12/06/2026).

## 1. Sentry

- SDK `@sentry/nextjs` com instrumentação client e server (`instrumentation.ts` / `instrumentation-client.ts` conforme o guia da versão instalada do SDK).
- Source maps enviados no build da Vercel (integração Sentry ↔ Vercel).
- Ambientes separados: `development` (sem envio ou projeto próprio), `preview`, `production`.
- `beforeSend`: remover PII (nomes de convidados, telefones, e-mails) de payloads e breadcrumbs — NF-4.
- Contexto útil sem PII: `tenant_id`, papel do usuário, marco/rota.
- Alertas: erro novo em produção → e-mail do fundador.

## 2. PostHog — plano de eventos

Instrumentação **somente** via wrapper `lib/analytics/` (allowlist de propriedades). Identificação:
- `identify(user_id)` com papel — sem nome/e-mail nas propriedades de evento.
- **Group analytics por tenant** (`group('tenant', tenant_id)`) — as métricas do PRD §8 são por buffet.

### Eventos × métricas do PRD

| Evento | Propriedades (allowlist) | Métrica do PRD §8 |
|---|---|---|
| `tenant_created` | plan=trial | Funil de aquisição |
| `onboarding_completed` | shifts_count, packages_count | Ativação |
| `party_created` | status=budget·reserved | North star (funil) |
| `party_confirmed` | guests_expected | **Ativação** (1ª festa confirmada ≥ 10 convidados ≤ 14 dias) |
| `invite_published` | list_mode | Adoção do RSVP |
| `rsvp_submitted` | response, companions_count | Valor p/ cliente final |
| `checkin_marked` | via=search·group·walkin·undo | **Adoção do check-in (aha)** ≥ 80% das festas realizadas |
| `party_completed` | guests_present, overage_total_cents | **North star** (festas realizadas/mês) |
| `overage_decided` | decision=confirmed·adjusted·waived, amount_cents | **Valor comprovado** (Σ excedentes/tenant/mês > mensalidade) |
| `rebooking_alert_actioned` | action=whatsapp·budget·dismissed | **Recompra** ≥ 15% convertidos |
| `trial_warning_shown` / `subscription_started` / `subscription_canceled` | plan | **Conversão trial→pagante ≥ 25%, churn < 4%** |
| `csv_exported` | entity | Sinal de risco de churn |

Valores monetários em centavos; **nunca** enviar nomes, telefones, e-mails ou idades individuais (NF-4 — dados de menores).

### Dashboards iniciais (criar no M5)

1. **North star:** festas `party_completed` por mês, por tenant e total.
2. **Funil de ativação:** `tenant_created → onboarding_completed → party_confirmed` (janela 14 dias).
3. **Aha:** % de `party_completed` com ≥ 1 `checkin_marked`.
4. **Valor comprovado:** soma de `overage_decided.amount_cents` por tenant/mês — este número também aparece **no painel do gestor** ("o sistema identificou R$ X em excedentes este mês"), calculado do banco, não do PostHog.
5. **Recompra:** `rebooking_alert_actioned` por ação.

### Session replay

Ligado com **masking total de inputs e texto** (dados de menores — NF-4). Desligado na página pública do convite.

## 3. Privacidade (NF-4) — regras duras

1. PII (nome, telefone, e-mail, idade individual) não sai do Postgres: nem PostHog, nem Sentry, nem logs da Vercel.
2. Propriedades de evento passam pela allowlist do wrapper — propriedade nova exige PR alterando a allowlist.
3. Convidado (anon) não é identificado no PostHog; eventos públicos (`rsvp_submitted`) são anônimos com `tenant` group.
4. DNT/opt-out: respeitar configuração do navegador na página pública.

## 4. Monitoramento operacional

- **Vercel:** logs de função e alertas de erro de build/deploy.
- **Supabase:** alertas de uso (conexões, storage) no dashboard cloud.
- **Stripe:** webhooks com retry; falhas de webhook alertam por e-mail (config no dashboard Stripe).
- **Uptime:** monitor externo simples (ex.: cron-job.org ou BetterStack free) em `/` e numa página de convite seed — internet de salão já é hostil o bastante (NF-3) sem o serviço fora do ar.
