# 05 — Estratégia de testes

> Decisão (11/06/2026): pirâmide completa — unit (Vitest) + integração/RLS (Vitest contra Supabase local) + e2e (Playwright). O PRD exige testes automatizados para RN-4/RN-8 e testes de isolamento em todos os marcos (PRD §9, NF-1).

## 1. A pirâmide

| Camada | Ferramenta | O que cobre | Onde vive | Quando roda |
|---|---|---|---|---|
| Unit | Vitest | `lib/domain/` (classificação, excedente, parcelas), helpers | `*.test.ts` ao lado do código | A cada commit (rápido, sem rede) |
| Integração / RLS | Vitest + Supabase local | Policies de RLS, RPCs públicas, constraints (double-booking, contrato), triggers | `supabase/tests/` | CI (job sobe Supabase via CLI) |
| e2e | Playwright | Fluxos críticos: RSVP (M3), dia da festa (M4), papéis | `e2e/` | CI em PR para `main` |

Regra de proporção: a maior parte da confiança vem do unit no domínio + integração nas policies. e2e só para os fluxos que os critérios de aceite do PRD exigem de ponta a ponta — não para cada tela (NF-7).

## 2. Caso de teste canônico (RN-4 / RN-8.2) ⭐

O PRD define o caso que **deve existir como teste automatizado desde o M1-T1** e nunca pode quebrar:

```ts
// lib/domain/overage.test.ts
const rules = {
  exemptAge: 8,       // idade < 8  → isento
  adultAge: 13,       // idade ≥ 13 → adulto
  adultCapacity: 50,
  childCapacity: 30,
  extraAdultPriceCents: 9000,
  extraChildPriceCents: 5500,
}
// Presentes no encerramento: 54 com 13+, 28 com 8–12, 9 com < 8
// Esperado: 4 adultos excedentes × R$90 = R$360; crianças 28 ≤ 30 = R$0; isentos nunca cobram
expect(computeOverage(present, rules)).toEqual({
  overageAdults: 4,
  overageChildren: 0,
  totalCents: 36000,
})
```

Casos de borda obrigatórios na mesma suite:
- Idade exatamente no corte: `idade = exemptAge` → criança; `idade = adultAge` → adulto (RN-4.1 usa `<` e `≥`).
- `exemptAge = 0` → ninguém isento (RN-4.2).
- Idade ausente → adulto + flag `needsReview` (RN-4.3).
- Sem compensação entre categorias: sobra de crianças não abate excedente de adultos (RN-8.2).
- Isentos acima de qualquer número → custo zero, mas contados no informativo (RN-4.4).

## 3. Testes de isolamento multi-tenant (NF-1)

Obrigatórios em **todos os marcos**. O harness (F0-T7) mantém um cenário fixo:

1. Cria tenant A e tenant B, cada um com gestor, recepcionista e cliente final.
2. Popula as tabelas existentes até o marco atual.
3. Para cada tabela nova do marco, verifica com a sessão de cada papel de A:
   - SELECT não retorna linhas de B (resultado vazio, não erro);
   - INSERT/UPDATE/DELETE apontando para IDs de B falha;
   - Recepcionista de A não lê festas de A fora de hoje/amanhã (RN-1.3);
   - Cliente final de A não lê festas de outro cliente de A (RN-12.3).

Checklist de fechamento de marco ([03-fases-e-tarefas.md](03-fases-e-tarefas.md)) inclui estender este teste.

## 4. Testes das RPCs públicas (RN-6.4 — privacidade)

No M3, testar **pela API** (não pela UI):
- `get_invite` não retorna lista de convidados, telefones nem status de terceiros.
- `find_guest` retorna apenas o grupo do nome buscado.
- `submit_rsvp` rejeita: festa não publicada, prazo vencido (RN-6.6), lista fechada com nome desconhecido (RN-6.5), token inválido.
- Cliente `anon` sem RPC não consegue SELECT em nenhuma tabela.

## 5. e2e — fluxos exigidos pelos critérios do PRD

| Marco | Fluxo | Critério coberto |
|---|---|---|
| M0 | Recepcionista só acessa check-in | "não acessa nenhuma rota além do check-in" |
| M3 | Convidado confirma + 2 acompanhantes no celular; totalizadores atualizam | Critério 1 do M3 |
| M4 | Festa 40+ convidados: check-ins, 2 walk-ins, 1 desfazer, **queda de rede** (`context.setOffline(true)`), encerramento, relatório R$ correto | Critérios 1–3 do M4 |
| M5 | Trial expirado → modo leitura → assinatura → volta ao normal | Critério 3 do M5 |

Viewports mobile (390×844) nos fluxos de check-in, convite e espaço do cliente (NF-2).

## 6. Seed e dados de teste (NF-8)

`supabase/seed.sql` mantém o buffet fictício de demonstração: pacotes, festas em todos os status, parcelas pagas/pendentes/vencidas e **festa de hoje pronta para check-in**. Os testes de integração usam factories próprias (dados mínimos por teste); o seed serve para dev, demo de venda e e2e.

## 7. Scripts

```jsonc
// package.json (alvo — criados no F0)
"test":             // vitest run (unit)
"test:integration": // vitest run supabase/tests (exige supabase start)
"test:e2e":         // playwright test
"db:types":         // supabase gen types > lib/supabase/database.types.ts
```

CI (GitHub Actions): lint → typecheck → unit → integração (Supabase CLI) → e2e nos PRs para `main`.
