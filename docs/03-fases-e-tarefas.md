# 03 — Fases e tarefas

> Execução **um marco por vez, na ordem** (diretriz 1 do PRD §9). Um marco só fecha com todos os critérios de aceite do PRD §6 passando.
> Cada tarefa é autocontida e dimensionada para uma sessão de trabalho com Claude Code: tem objetivo, RNs, entregáveis, critério de aceite e testes. Referencie o ID da tarefa e das RNs nos commits ([04-convencoes.md](04-convencoes.md)).
>
> **Status:** marque `[x]` quando a tarefa for concluída e validada. Este arquivo é o tracker do projeto.

## Protocolo de execução de tarefa (leia antes de cada sessão)

Cada tarefa foi dimensionada para caber em **uma sessão de agente com contexto limpo**. Quatro regras para isso valer na prática:

1. **Uma tarefa = uma sessão nova.** Não acumule tarefas na mesma conversa; terminou e validou, abra sessão nova para a próxima.
2. **Leitura mínima.** A sessão lê somente: a tarefa, as RNs citadas no PRD e as seções dos docs que a tarefa referencia. Nunca carregue a documentação inteira nem o PRD completo no contexto.
3. **Plano fino just-in-time.** Tarefa com mais de ~2 entregáveis: antes de codar, quebre em passos pequenos (skill `writing-plans`) e execute passo a passo. Este documento é roadmap — o plano de implementação detalhado nasce na hora de executar, nunca antes.
4. **Não coube na sessão? Pare e divida.** Se ficar claro que a tarefa não termina com folga de contexto, pare, divida-a neste arquivo (T-Na/T-Nb) e execute em sessões separadas. Nunca esprema.

## Visão geral

| Fase | Nome | Depende de | Resultado |
|---|---|---|---|
| F0 | Fundação técnica | — | Repo pronto: Supabase local, CI, Sentry, PostHog, harness de testes |
| M0 | Conta do buffet | F0 | Buffet cria conta, configura turnos, convida equipe |
| M1 | Pacotes, agenda e festas | M0 | Núcleo do domínio: regras de idade + ciclo de vida |
| M2 | Clientes, contrato e parcelas | M1 | Confirmação gera compromisso financeiro |
| M3 | Convidados, convite e RSVP | M2 | Lista que se preenche sozinha |
| M4 | Check-in e excedente ⭐ | M3 | Momento de prova — pronto para piloto real |
| M5 | Espaço do cliente, recompra e assinatura | M4 | Produto completo, cobrando |
| M6 | Lista de presentes (opcional) | M5 | Cortar sem culpa (D-6) |

---

## F0 — Fundação técnica

### [x] F0-T1 — Supabase: CLI local + projeto cloud
**Objetivo:** banco local versionado e projeto cloud de produção criados.
**Entregáveis:** `supabase init` no repo; projeto cloud criado; `.env.local.example` com todas as variáveis; script `db:types` no `package.json`; branch principal renomeada de `master` para `main`; seção correspondente do [07-setup.md](07-setup.md) validada do zero.
**Aceite:** `supabase start` + `npm run dev` funcionam numa máquina limpa seguindo só o runbook.

### [x] F0-T2 — Estrutura base do app
**Objetivo:** esqueleto de rotas e layout do [01-arquitetura.md](01-arquitetura.md) §5.
**Entregáveis:** route groups e páginas placeholder das 5 superfícies; `layout.tsx` com `lang="pt-BR"`, metadata e fonte; `proxy.ts` com refresh de sessão Supabase (`@supabase/ssr`); clients em `lib/supabase/`.
**Aceite:** navegação entre superfícies funciona; build passa.
**Atenção:** Next 16 — `proxy.ts` (não `middleware.ts`), `await params/cookies` (doc 01 §6).

### [x] F0-T3 — Harness de testes (Vitest + Playwright)
**Objetivo:** rodar as três camadas de teste localmente desde o início.
**Entregáveis:** Vitest configurado (unit + integração com Supabase local); Playwright instalado com viewport mobile; scripts `test`, `test:integration`, `test:e2e`; um teste de exemplo em cada camada.
**Aceite:** os três scripts rodam verdes localmente.

### [x] F0-T4 — CI (GitHub Actions)
**Objetivo:** pipeline obrigatório antes da primeira feature.
**Entregáveis:** workflow: lint (ESLint CLI flat config) → typecheck → unit → integração (sobe Supabase via CLI); e2e nos PRs para `main`.
**Aceite:** PR de exemplo roda o pipeline verde.

### [x] F0-T5 — Sentry
**Objetivo:** erros visíveis desde a primeira feature.
**Entregáveis:** `@sentry/nextjs` (client + server, via `instrumentation`); DSN por ambiente; filtro de PII em `beforeSend` ([06-observabilidade.md](06-observabilidade.md) §1).
**Aceite:** erro de teste aparece no Sentry; nenhum dado pessoal no payload.

### [x] F0-T6 — PostHog
**Objetivo:** analytics pronto para instrumentar os marcos.
**Entregáveis:** **criar projeto "VivaFesta" na org SLJC do PostHog**; wrapper `lib/analytics/` com allowlist de propriedades ([06-observabilidade.md](06-observabilidade.md) §2); keys por ambiente.
**Aceite:** evento de teste aparece no PostHog; propriedade fora da allowlist é descartada.

### [x] F0-T7 — Migration inicial + harness de isolamento
**Objetivo:** base multi-tenant com RLS e o teste de isolamento que acompanhará todos os marcos (NF-1).
**Entregáveis:** migration com `tenants`, `profiles`, `memberships`, funções `private.*` ([02-modelo-de-dados.md](02-modelo-de-dados.md) §3); helper de teste que cria 2 tenants + usuários e verifica vazamento cruzado.
**Aceite:** teste de isolamento passa; tentativa de SELECT cross-tenant retorna vazio (não erro).

---

## M0 — Conta do buffet

### [x] M0-T1 — Cadastro e login
**RNs:** RN-1.2.
**Entregáveis:** páginas `(auth)` de cadastro, login e logout com Supabase Auth; criação do `profile`; redirecionamento pós-login (com tenant → `/app`; sem tenant → `/onboarding`).
**Aceite:** ciclo cadastro → logout → login funciona; rotas protegidas exigem sessão.

### [x] M0-T2 — Onboarding: criação do tenant
**RNs:** RN-1.1, RN-1.4, RN-11.1 (início do trial).
**Entregáveis:** fluxo `/onboarding`: cria `tenant` (nome + slug validado contra slugs reservados) + `membership manager` + `trial_ends_at = now()+14d`.
**Aceite:** dois cadastros independentes criam dois tenants isolados (teste F0-T7 estendido).

### [x] M0-T3 — Configurações do buffet e turnos
**RNs:** RN-2.1.
**Entregáveis:** tela de configurações (nome, endereço, telefone, slug somente leitura pós-criação); CRUD de turnos com label, dia da semana e horários.
**Aceite:** critério do PRD — gestor configura turnos de sábado e domingo em < 5 min sem ajuda (validar com usuário real ou cronometrar o fluxo).

> **Fechamento do M0** (12/06/2026): seed de demonstração ✅ (login `demo@vivafesta.dev` / `demo-vivafesta-123`) e evento `tenant_created` ✅. O evento `onboarding_completed` (precisa de `packages_count`) será instrumentado no M1, junto com o CRUD de pacotes.

### [x] M0-T4 — Convite de usuários e papéis
**RNs:** RN-1.2, RN-1.3.
**Entregáveis:** convite por e-mail (Supabase Auth invite) com papel; listagem/remoção de membros; guards: recepcionista só `/checkin`.
**Aceite:** critério do PRD — recepcionista convidado não acessa nenhuma rota além do check-in (teste e2e + teste de RLS).

---

## M1 — Pacotes, agenda e festas

### [x] M1-T1 — Domínio puro: classificação e excedente ⭐
**RNs:** RN-4.1, RN-4.2, RN-4.3, RN-4.4, RN-8.2.
**Entregáveis:** `lib/domain/classify.ts` (idade + regras → `exempt | child | adult`; sem idade → `adult` + flag de revisão) e `lib/domain/overage.ts` (`max(0, presentes − contratado)` por categoria, sem compensação entre categorias).
**Aceite:** **caso canônico retorna exatamente R$ 360** (54 adultos/50 + 28 crianças/30 + 9 isentos, R$ 90/55) — [05-testes.md](05-testes.md) §2. Suite cobre bordas: idade igual aos cortes, isenção 0, sem idade.

### [x] M1-T2 — CRUD de pacotes
**RNs:** RN-4 (campos), RN-4.2 (validação).
**Entregáveis:** migration `packages` + RLS; telas de listagem/forma; arquivamento (não exclusão).
**Aceite:** impossível salvar `exempt_age >= adult_age` (validação na UI **e** CHECK no banco).

> **Nota de sequência** (12/06/2026): T4 foi executada antes da T3 — o aceite da agenda ("reflete festas em todos os status") depende do schema de festas existir.

### [x] M1-T3 — Agenda mensal
**RNs:** RN-2.2, RN-2.3.
**Entregáveis:** visão mensal por data/turno com status colorido (livre, orçamento, reservada, confirmada, realizada); navegação entre meses; atalho "criar festa" na célula.
**Aceite:** agenda reflete festas em todos os status; datas/fuso em `America/Sao_Paulo` (NF-5).

### [x] M1-T4 — Festa: schema e máquina de estados
**RNs:** RN-3.1–3.5, RN-2.4.
**Entregáveis:** migrations `parties` + `audit_logs` (+ índice de double-booking); Server Actions de transição com validação (+ trigger de guarda); cancelamento libera o turno; reabertura de realizada só por gestor com motivo → `audit_logs` (NF-6). Sem UI neste passo — testes de integração direto nas actions.
**Aceite:** critério do PRD — impossível confirmar duas festas no mesmo turno/data (teste de integração tentando a corrida); transições inválidas rejeitadas.
**Nota:** neste marco a confirmação fica atrás do aviso "requer contrato" (contrato chega no M2).

### [x] M1-T5 — Festa: telas de criação e gestão
**RNs:** RN-3 (UI das transições).
**Entregáveis:** criação de orçamento a partir da agenda; página da festa com dados, status e ações de transição; cancelar/reabrir com motivo obrigatório.
**Aceite:** fluxo orçamento → reservada → cancelada de ponta a ponta pela UI; agenda reflete cada mudança.

### [x] M1-T6 — Congelamento e sobrescrita de regras
**RNs:** RN-4.5, RN-4.6.
**Entregáveis:** cópia dos parâmetros do pacote para `rule_*` na confirmação; tela de sobrescrita por festa com motivo → `audit_logs`.
**Aceite:** critério do PRD — alterar o pacote depois não muda festa confirmada (teste de integração).

---

## M2 — Clientes, contrato e parcelas

### [x] M2-T1 — Clientes finais e aniversariantes
**RNs:** RN-10.1.
**Entregáveis:** migrations `customers` + `birthday_children` (mês/ano apenas — LGPD); CRUD com vínculo de múltiplos aniversariantes; busca por nome/telefone.
**Aceite:** não existe campo de data completa de nascimento em formulário nem em banco.

### [x] M2-T2 — Contrato na confirmação
**RNs:** RN-9.1, RN-3.3.
**Entregáveis:** migrations `contracts` + `installments`; fluxo de confirmação exige contrato; sugestão automática de parcelas mensais iguais entre confirmação e festa, editável; `lib/domain/installments.ts` (geração da sugestão, pura).
**Aceite:** critério do PRD — não existe festa `confirmed` sem contrato (constraint + teste).

### [x] M2-T3 — Registro de pagamento
**RNs:** RN-9.2, RN-9.3.
**Entregáveis:** marcar parcela paga (data, forma, observação); desfazer com auditoria; status "vencida" derivado em query/view — nunca coluna.
**Aceite:** parcela não paga com vencimento ontem aparece como vencida com 1 dia de atraso.

### [ ] M2-T4 — Painel financeiro mínimo
**RNs:** RN-9.4.
**Entregáveis:** home financeira: a receber no mês, recebido no mês, vencidas (cliente, festa, dias de atraso).
**Aceite:** critério do PRD — números batem com seed de cenários ([05-testes.md](05-testes.md)).

### [ ] M2-T5 — Ficha do cliente
**RNs:** RN-10.2.
**Entregáveis:** página do cliente com festas (passadas/futuras) e situação financeira consolidada.
**Aceite:** critério do PRD — ficha consolidada correta para cliente com 2 festas em status distintos.

---

## M3 — Convidados, convite digital e RSVP

### [ ] M3-T1 — Convidados: schema e CRUD
**RNs:** RN-5.1, RN-5.2, RN-5.4.
**Entregáveis:** migrations `guests` + `guest_groups` com RLS; CRUD de convidados na festa (gestor); congelamento da lista pós-encerramento.
**Aceite:** classificação nunca digitável (campo não existe); lista congela após encerramento (teste de integração).

### [ ] M3-T2 — Grupos e totalizadores
**RNs:** RN-5.3, RN-5.5, RN-4.3.
**Entregáveis:** agrupamento por família/grupo; totalizadores contratado vs. esperado por categoria usando `lib/domain/classify`; destaque para convidado sem idade.
**Aceite:** totalizadores corretos com o seed.

### [ ] M3-T3 — Página pública do convite
**RNs:** RN-6.1, RN-6.2, RN-6.4.
**Entregáveis:** rota `/[tenantSlug]/[inviteToken]`; RPC `get_invite` (AD-5); geração do `invite_token` na confirmação; publicar/despublicar; mobile-first.
**Aceite:** critério do PRD — resposta da RPC não contém lista de convidados, telefones nem status de terceiros (**teste de API**, não só UI).

### [ ] M3-T4 — Fluxo de RSVP com acompanhantes
**RNs:** RN-6.3, RN-6.7, RN-5.3.
**Entregáveis:** RPCs `find_guest` + `submit_rsvp`; busca do próprio nome; confirmar/recusar; acompanhantes (nome + idade) entram como `guests origin=companion` no grupo do titular; alteração de resposta até o prazo.
**Aceite:** critério do PRD — convidado confirma + 2 acompanhantes pelo celular e os totalizadores (gestor e cliente) refletem a classificação em tempo real.

### [ ] M3-T5 — Modos de lista e prazo de RSVP
**RNs:** RN-6.5, RN-6.6.
**Entregáveis:** configuração por festa: lista fechada (padrão) / aberta (`origin=self_registered`); `rsvp_deadline`; após o prazo a página vira somente-informativa.
**Aceite:** critério do PRD — após o prazo, nenhuma ação de confirmação é aceita (testar pela RPC, não só pela UI).

### [ ] M3-T6 — e2e do convite
**Entregáveis:** Playwright mobile viewport: abrir convite → buscar nome → confirmar com acompanhantes → verificar totalizadores; teste de privacidade da API (RN-6.4).
**Aceite:** suite verde no CI.

---

## M4 — Check-in, encerramento e excedente ⭐

### [ ] M4-T1 — Check-in: busca e marcação
**RNs:** RN-7.1, RN-7.2, RN-7.4, RN-1.3.
**Entregáveis:** `/checkin`: lista de festas hoje/amanhã; busca instantânea por nome; marcar presente (1 toque); marcar grupo inteiro; desfazer; RLS do recepcionista validada.
**Aceite:** uso com uma mão em viewport 390px; desfazer funciona até o encerramento.

### [ ] M4-T2 — Walk-in e painel de contagem
**RNs:** RN-7.3, RN-7.5.
**Entregáveis:** cadastro rápido walk-in (nome + idade) já `present`/`origin=walk_in`; painel fixo no topo: presentes vs. contratado por categoria, com alerta visual ao atingir/ultrapassar capacidade; Realtime para múltiplos dispositivos.
**Aceite:** painel bate com as marcações em tempo real em 2 dispositivos.

### [ ] M4-T3 — Resiliência de rede (NF-3)
**RNs:** RN-7.6. **Decisão:** AD-4 (retry em memória).
**Entregáveis:** fila de marcações com UI otimista, retry com backoff, indicador "N não sincronizadas" e reconciliação ao voltar a rede; documentar a limitação de refresh na própria UI de ajuda.
**Aceite:** critério do PRD — derrubar a conexão no meio do check-in não perde marcação (e2e com `context.setOffline(true)`); estado de sincronização visível.

### [ ] M4-T4 — Encerramento e cálculo do excedente
**RNs:** RN-8.1, RN-8.2, RN-8.4.
**Entregáveis:** ação de encerrar (só gestor): ausentes em massa → `closing_snapshot` → cálculo via `lib/domain/overage` → status `completed`; tela de decisão do excedente (confirmar/ajustar com justificativa/dispensar) → `audit_logs`.
**Aceite:** snapshot bate com o painel; decisão registrada com auditoria; festa encerrada imutável (RN-3.4).

### [ ] M4-T5 — Relatório pós-festa + parcela de excedente
**RNs:** RN-8.3, RN-9.5.
**Entregáveis:** relatório: contratado vs. presente por categoria, valor, lista nominal com classificação, walk-ins destacados; versão imprimível (CSS print); lançar excedente confirmado como `installment kind=overage` com vencimento escolhido.
**Aceite:** critério do PRD — relatório bate com o painel de contagem; parcela aparece no financeiro.

### [ ] M4-T6 — e2e do dia da festa
**Entregáveis:** Playwright simulando o critério do PRD: festa com 40+ convidados, check-ins, 2 walk-ins, 1 desfazer, queda de rede, encerramento, relatório com excedente correto.
**Aceite:** suite verde; **a partir daqui o produto está pronto para piloto com design partner.**

---

## M5 — Espaço do cliente, recompra e assinatura

### [ ] M5-T1 — Magic link: acesso do cliente final
**RNs:** RN-12.1.
**Entregáveis:** envio de magic link pelo gestor; vínculo `customers.auth_user_id` no primeiro acesso; guard de `/cliente`; políticas RLS do papel cliente final.
**Aceite:** cliente entra apenas pelo link; `/cliente` sem sessão redireciona; RLS do papel validada no harness de isolamento.

### [ ] M5-T2 — Espaço do cliente: telas
**RNs:** RN-12.2, RN-12.3, RN-5.4.
**Entregáveis:** `/cliente`: dados da festa; gestão da lista (edição até o início da festa); RSVPs em tempo real com totalizadores; copiar/compartilhar link do convite; parcelas (leitura); relatório pós-festa quando liberado pelo gestor.
**Aceite:** critério do PRD — cliente não vê nada além do permitido em RN-12.3 (teste de RLS por papel).

### [ ] M5-T3 — Alertas de recompra
**RNs:** RN-10.3–10.5.
**Entregáveis:** geração do alerta no encerramento (90 dias antes do aniversário seguinte — mês/ano); card na home do gestor; botão `wa.me` com mensagem-modelo do tenant (placeholders); "criar orçamento" pré-preenchido marca `converted`; "dispensar".
**Aceite:** critério do PRD — festa realizada gera alerta na data certa com mensagem correta (teste com clock controlado).

### [ ] M5-T4 — Stripe: checkout da assinatura
**RNs:** RN-11.1. **Decisão:** AD-6 (billing isolado).
**Entregáveis:** `lib/billing/` (interface + implementação Stripe); produtos mensal R$ 197 / anual R$ 1.970; Stripe Checkout a partir do app; páginas de retorno (sucesso/cancelado).
**Aceite:** assinatura de teste completa via Checkout em modo test, refletida em `tenants`.

### [ ] M5-T5 — Stripe: webhook e estados da assinatura
**RNs:** RN-11.3.
**Entregáveis:** `/api/webhooks/stripe` atualiza `subscription_status`; retentativas do Stripe → `past_due` → `read_only` após 10 dias; regularização volta a `active` imediatamente.
**Aceite:** ciclo `trialing → active → past_due → read_only → active` simulado com Stripe CLI/test clocks.

### [ ] M5-T6 — Modo leitura e ciclo de bloqueio
**RNs:** RN-11.1 (aviso de trial), RN-11.2.
**Entregáveis:** `tenant_is_writable` (AD-3) cobrindo trial expirado → 30 dias leitura → bloqueio → retenção 6 meses; aviso persistente faltando 3 dias de trial; banners de estado na UI; e-mails do ciclo (template mínimo).
**Aceite:** critério do PRD — trial expirado entra em modo leitura (escrita falha **no banco**); assinou, volta ao normal sem perda.

### [ ] M5-T7 — Exportação CSV e cancelamento
**RNs:** RN-11.4.
**Entregáveis:** exportação CSV (clientes, festas, convidados, parcelas) disponível sempre; cancelamento self-service efetivo no fim do período pago.
**Aceite:** critério do PRD — CSVs legíveis e completos contra o seed.

### [ ] M5-T8 — Painel admin mínimo da plataforma
**Entregáveis:** `/admin` (service role): lista de tenants, status de assinatura, métricas básicas de uso.
**Aceite:** fundador enxerga a base; nenhum acesso para não-admin (teste).

---

## M6 — (Opcional) Lista de presentes

### [ ] M6-T1 — Cadastro de itens pelo cliente final
**RNs:** RN-13.1. Itens com nome + link externo no espaço do cliente.

### [ ] M6-T2 — Escolha pelo convidado
**RNs:** RN-13.2, RN-13.3. RPC `claim_gift`; item escolhido some da lista pública; anfitrião vê quem escolheu. Sem pagamento/PIX.

---

## Regras de fechamento de marco

1. Todos os critérios de aceite do marco no PRD §6 demonstráveis de ponta a ponta.
2. Teste de isolamento multi-tenant atualizado cobrindo as tabelas novas do marco (NF-1).
3. Seed (`supabase/seed.sql`) atualizado para cobrir o marco (NF-8) — o seed final tem buffet fictício com pacotes, festas em todos os status e festa de hoje pronta para check-in.
4. Eventos PostHog do marco instrumentados ([06-observabilidade.md](06-observabilidade.md)).
5. Ambiguidade encontrada? Pergunte ao fundador e proponha atualização do PRD — não invente regra (diretriz 3 do PRD §9).
