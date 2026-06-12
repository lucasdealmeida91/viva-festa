# VivaFesta — Guia do MVP

> **Produto:** VivaFesta — sistema de gestão para casas de festas infantis
> **Status:** v1.1 — documento de produto (regras de negócio, valor e entregas)
> **Audiência:** fundador do produto + LLM/desenvolvedor responsável pela implementação
> **Decisões técnicas já tomadas pelo fundador:** Next.js (React), Supabase (banco/auth), Stripe (assinatura do SaaS). Todo o resto da implementação técnica fica a critério de quem implementa, desde que respeite as regras de negócio e os requisitos não-funcionais deste documento.

---

## 0. Como usar este documento

1. Este documento é a **fonte da verdade do produto**. Em caso de dúvida durante a implementação, as regras de negócio (seção 4) prevalecem sobre qualquer interpretação.
2. A implementação deve seguir a ordem dos **marcos de entrega** (seção 6). Cada marco é independente, testável e termina com critérios de aceite verificáveis. Não inicie um marco sem concluir os critérios do anterior.
3. Itens marcados como **[Fase 2]** estão documentados apenas para orientar decisões de modelagem — **não devem ser implementados no MVP**.
4. Itens em **"Decisões em aberto"** (seção 10) exigem confirmação do fundador antes de implementar. Na dúvida, pergunte; não assuma.
5. Toda a interface deve ser em **português do Brasil**.

---

## 1. Visão de produto

### 1.1 O problema

Casas de festas infantis (buffets) operam hoje com uma combinação de caderno, planilha e WhatsApp. Isso gera três dores recorrentes:

1. **Briga na cobrança de excedente de convidados.** Os pacotes são vendidos por quantidade de pessoas (ex.: 50 adultos + 30 crianças), com regras de contagem que variam por idade (ex.: criança abaixo de 8 anos não conta). No dia da festa ninguém tem um registro confiável de quem efetivamente compareceu, e a cobrança do excedente vira conflito entre buffet e cliente — ou o buffet simplesmente deixa de cobrar e perde receita.
2. **Trabalho manual do cliente final.** O responsável pelo aniversariante monta a lista de convidados em papel ou planilha, confirma presença um a um pelo WhatsApp e não tem visibilidade organizada.
3. **Recompra perdida.** O cliente que fez a festa de 5 anos do filho é o candidato natural à festa de 6 anos — mas o buffet não tem histórico estruturado nem rotina de reativação, e perde esse cliente para o concorrente.

### 1.2 A solução (em uma frase)

Um SaaS por assinatura, multi-buffet, onde **o número real de presentes apurado no check-in do dia da festa — classificado automaticamente pelas regras de idade do pacote — vira a fonte oficial para a cobrança de excedente**, com lista de convidados self-service para o cliente final e histórico de clientes para gerar recompra.

### 1.3 Proposta de valor (argumento de venda para o buffet)

| Dor | Entrega do produto | Valor financeiro estimado |
|---|---|---|
| Excedente não cobrado ou contestado | Check-in nominal no dia + cálculo automático do excedente conforme a regra do pacote + relatório transparente | 2–3 excedentes/festa × R$ 50–100 já superam a mensalidade |
| Cliente final sobrecarregado | Convite digital com RSVP: o próprio convidado confirma presença e informa acompanhantes | Diferencial competitivo na venda do pacote |
| Recompra perdida | Histórico por criança + alerta de aniversário com mensagem pronta para WhatsApp | 1 festa recuperada/mês ≈ R$ 3.000–10.000 |
| Parcelas desorganizadas | Controle de entrada + parcelas por contrato, com visão do mês | Redução de inadimplência e esquecimentos |

**Posicionamento:** o produto não é um ERP nem um sistema financeiro completo. É a ferramenta operacional da festa — da reserva da data ao relatório pós-festa — com o mínimo de gestão comercial e financeira necessário para fechar o ciclo.

### 1.4 Modelo de negócio

- SaaS B2B. **Quem paga é a casa de festas** (assinatura mensal via Stripe). Cliente final e convidados nunca pagam pelo uso.
- Plano único no lançamento: **R$ 197/mês**, com plano anual equivalente a 10 meses (2 meses grátis). Valor de lançamento para *design partners*: a definir pelo fundador (sugestão: gratuito ou R$ 49/mês vitalício para os 3 primeiros, em troca de feedback semanal).
- Trial de **14 dias sem cartão de crédito**.
- Política de inadimplência: ver RN-11.

---

## 2. Personas e papéis de acesso

| Papel | Quem é | O que acessa |
|---|---|---|
| **Admin da plataforma** | O fundador do SaaS | Painel interno: tenants, assinaturas, métricas de uso. (Versão mínima no MVP.) |
| **Gestor do buffet** | Dono ou administrador da casa de festas | Tudo do seu tenant: agenda, festas, pacotes, contratos, clientes, relatórios, usuários, configurações |
| **Recepcionista** | Funcionário do buffet no dia do evento | Apenas o módulo de check-in das festas do dia (e do dia seguinte, para preparação) |
| **Cliente final** | Mãe/pai/responsável pelo aniversariante | Espaço do cliente: sua(s) festa(s), lista de convidados, RSVPs em tempo real, parcelas |
| **Convidado** | Pessoa convidada para a festa | Apenas a página pública do convite (sem login): confirmar presença e informar acompanhantes |

Regras transversais de acesso:

- Todo dado pertence a um **tenant** (casa de festas). Nenhum usuário enxerga dados de outro tenant, em nenhuma circunstância.
- O cliente final pertence a um tenant, mas só enxerga **as próprias festas** — nunca dados de outros clientes do mesmo buffet.
- O papel de recepcionista existe porque o celular do check-in passa de mão em mão no salão: o acesso deve ser o mínimo necessário.

---

## 3. Glossário do domínio

| Termo | Definição |
|---|---|
| **Tenant** | Uma casa de festas assinante. Unidade de isolamento de dados e de cobrança. |
| **Cliente final** | O responsável que contrata uma festa (não confundir com o cliente do SaaS, que é o buffet). |
| **Aniversariante** | A criança homenageada. Vinculada ao cliente final. Um cliente final pode ter vários aniversariantes (filhos). |
| **Festa (evento)** | Uma celebração agendada em uma data/turno, vinculada a um cliente final, um aniversariante e um pacote. |
| **Turno** | Janela de horário operada pelo buffet (ex.: sábado 12h–16h, sábado 18h–22h). Configurável por tenant. |
| **Pacote** | Produto comercial do buffet: capacidade contratada de adultos e crianças, preço, regras de idade e valores de excedente. |
| **Regra de contagem por idade** | Parâmetros do pacote que classificam cada pessoa como *isenta*, *criança* ou *adulto* a partir da idade. É o coração do domínio. |
| **Convidado** | Pessoa na lista de uma festa, com nome, idade aproximada e status no ciclo de vida (ver RN-5). |
| **Acompanhante** | Pessoa adicional informada por um convidado no RSVP (ex.: cônjuge e filhos). Vira convidado vinculado ao titular. |
| **RSVP** | Confirmação de presença feita pelo próprio convidado na página pública do convite. |
| **Check-in** | Marcação de presença/ausência feita pela recepção no dia da festa, pelo celular. |
| **Walk-in** | Pessoa que compareceu sem estar na lista. Cadastrada na hora pelo check-in. |
| **Excedente** | Quantidade de presentes contabilizáveis acima do contratado, calculada por categoria (adultos e crianças) ao encerrar a festa. |
| **Contrato** | Formalização financeira da festa: valor total, entrada e parcelas. |
| **Ficha da festa** | **[Fase 2]** Resumo operacional do evento para a equipe (tema, cardápio, restrições, observações). |

---

## 4. Regras de negócio

> Convenção: cada regra tem um ID (RN-x.y) para ser referenciada em tarefas, commits e testes.

### RN-1 — Tenant, usuários e isolamento

- **RN-1.1** Todo registro do sistema pertence a exatamente um tenant. É proibido qualquer acesso, listagem ou agregação que cruze tenants (exceto no painel do admin da plataforma).
- **RN-1.2** Um tenant tem ao menos um usuário com papel *gestor*. Gestores podem convidar outros usuários e atribuir papéis (*gestor* ou *recepcionista*).
- **RN-1.3** O *recepcionista* acessa exclusivamente o módulo de check-in, limitado às festas de hoje e de amanhã do seu tenant.
- **RN-1.4** Cada tenant possui um *slug* público único (ex.: `buffet-alegria`) usado nas páginas de convite.

### RN-2 — Agenda e turnos

- **RN-2.1** O gestor configura os turnos do buffet: dia da semana + horário de início e fim (ex.: sábado 12h–16h). Turnos são a unidade de reserva.
- **RN-2.2** No MVP, cada turno comporta **uma única festa** (premissa de um salão — ver Decisão em aberto D-2).
- **RN-2.3** A agenda exibe visão mensal com o status de cada data/turno: *livre*, *orçamento*, *reservada*, *confirmada*, *realizada*.
- **RN-2.4** É proibido confirmar duas festas no mesmo turno/data (bloqueio de double-booking). Orçamentos podem coexistir no mesmo turno.

### RN-3 — Ciclo de vida da festa

Status possíveis e transições permitidas:

```
orçamento → reservada → confirmada → realizada
    ↓            ↓            ↓
cancelada    cancelada    cancelada
```

- **RN-3.1** *Orçamento*: registro de interesse com data pretendida, pacote e valor estimado. Não bloqueia a agenda.
- **RN-3.2** *Reservada*: data/turno bloqueados. O buffet define se exige sinal para reservar (fora do sistema no MVP; apenas registro).
- **RN-3.3** *Confirmada*: exige contrato criado (RN-9). A partir daqui o cliente final ganha acesso ao espaço do cliente e o convite digital pode ser publicado.
- **RN-3.4** *Realizada*: status final atribuído no encerramento do check-in (RN-8). Festa realizada é imutável, exceto por reabertura explícita do gestor, com registro de auditoria (quem, quando, motivo).
- **RN-3.5** *Cancelada*: libera o turno na agenda. Mantém histórico e parcelas registradas (para controle de reembolso/multa, tratado manualmente no MVP).

### RN-4 — Pacotes e regras de contagem por idade ⭐ (núcleo do produto)

Cada pacote do tenant define:

| Campo | Exemplo | Significado |
|---|---|---|
| Nome | "Pacote Festa Top" | — |
| Capacidade de adultos | 50 | Quantidade contratada |
| Capacidade de crianças | 30 | Quantidade contratada |
| Preço base | R$ 5.500 | Valor de referência do contrato |
| **Idade de isenção** | 8 | Pessoa com idade **menor que** este valor **não é contabilizada** |
| **Idade de adulto** | 13 | Pessoa com idade **maior ou igual** a este valor conta como **adulto** |
| Valor do adulto excedente | R$ 90 | Cobrado por adulto acima da capacidade |
| Valor da criança excedente | R$ 55 | Cobrado por criança acima da capacidade |

- **RN-4.1** Classificação automática de toda pessoa (convidado ou acompanhante) a partir da idade aproximada e do pacote da festa: `idade < idade_isencao` → **isento**; `idade_isencao ≤ idade < idade_adulto` → **criança**; `idade ≥ idade_adulto` → **adulto**.
- **RN-4.2** A idade de isenção pode ser 0 (todo mundo conta) e a idade de adulto é obrigatória. Validação: `idade_isencao < idade_adulto`.
- **RN-4.3** Pessoa **sem idade informada conta como adulto** (regra conservadora a favor do buffet) e é sinalizada na interface para revisão.
- **RN-4.4** Isentos nunca geram cobrança de excedente, mas aparecem nas contagens informativas (o buffet quer saber quantos bebês haverá no salão).
- **RN-4.5** As regras de idade são **congeladas na festa** no momento da confirmação (cópia dos parâmetros do pacote para a festa). Alterar o pacote depois não afeta festas já confirmadas.
- **RN-4.6** O gestor pode sobrescrever os parâmetros congelados de uma festa específica (negociações caso a caso), com registro de auditoria.

**Exemplo de referência (usar como caso de teste):** pacote 50 adultos + 30 crianças, isenção < 8, adulto ≥ 13. Presentes no encerramento: 54 pessoas com 13+ anos, 28 pessoas de 8–12 anos, 9 pessoas com menos de 8 anos. Resultado: 4 adultos excedentes × R$ 90 = R$ 360; crianças dentro da capacidade (28 ≤ 30) = R$ 0; 9 isentos sem cobrança. **Excedente total: R$ 360.**

### RN-5 — Lista de convidados

- **RN-5.1** Ciclo de vida do convidado: `convidado → confirmado | recusado` (antes da festa) e `presente | ausente` (no dia). "Ausente" é atribuído automaticamente no encerramento a quem não recebeu check-in.
- **RN-5.2** Cadastro mínimo: nome. Campos opcionais: idade aproximada (anos), telefone, observação. A classificação (isento/criança/adulto) é derivada — nunca digitada.
- **RN-5.3** Convidados podem ser agrupados por família/grupo (ex.: "Família Souza"). Acompanhantes informados via RSVP entram automaticamente no grupo do titular.
- **RN-5.4** Tanto o cliente final quanto o gestor podem editar a lista até o início da festa. Durante a festa, apenas o check-in altera status; após o encerramento, a lista fica congelada (exceto reabertura RN-3.4).
- **RN-5.5** A tela da lista sempre exibe os totalizadores: contratado vs. esperado (confirmados) por categoria — adultos, crianças, isentos.

### RN-6 — Convite digital e RSVP

- **RN-6.1** Toda festa confirmada pode publicar uma página pública de convite em URL não adivinhável: `/{slug-do-tenant}/{token-da-festa}` (ex.: `vivafesta.com.br/buffet-alegria/x7k2p` — domínio final sujeito à confirmação de registro, ver D-4). O cliente final compartilha esse link (WhatsApp etc.).
- **RN-6.2** A página exibe: nome do aniversariante, idade que completa, data, turno/horário, endereço do buffet, mensagem do anfitrião e botão de confirmação.
- **RN-6.3** O convidado busca o próprio nome e confirma ou recusa. Ao confirmar, informa acompanhantes (nome e idade de cada um).
- **RN-6.4** **Privacidade:** a página pública nunca exibe a lista completa de convidados, telefones ou status dos demais. O convidado enxerga apenas o próprio grupo.
- **RN-6.5** Modo da lista, configurável por festa: **fechada** (padrão — só confirma quem já está na lista) ou **aberta** (qualquer pessoa com o link pode se adicionar; entra com status *confirmado* e marcação de origem "auto-cadastro").
- **RN-6.6** Prazo de RSVP configurável. Após o prazo, a página continua exibindo as informações da festa, mas sem ações de confirmação.
- **RN-6.7** O convidado pode alterar sua resposta (confirmar/recusar/editar acompanhantes) até o prazo de RSVP.

### RN-7 — Check-in no dia da festa

- **RN-7.1** Interface mobile-first, otimizada para uso em pé, com uma mão: busca por nome com resultado instantâneo e botão único de "marcar presente".
- **RN-7.2** O check-in é **individual por pessoa**, mas a interface oferece o atalho "marcar grupo inteiro" quando a família chega junta.
- **RN-7.3** Walk-in: pessoa fora da lista é cadastrada na hora com nome e idade aproximada; entra já como *presente*, com marcação de origem "walk-in".
- **RN-7.4** Toda marcação pode ser desfeita enquanto a festa não for encerrada (erros acontecem na portaria).
- **RN-7.5** Painel fixo no topo da tela, atualizado a cada marcação: **presentes vs. contratado por categoria** (ex.: Adultos 47/50 · Crianças 25/30 · Isentos 6) com destaque visual quando uma categoria atinge ou ultrapassa a capacidade.
- **RN-7.6** O check-in deve tolerar conexão instável (requisito NF-3): marcações não podem se perder por oscilação de rede; em caso de falha, a interface deixa claro o que ainda não foi sincronizado.

### RN-8 — Encerramento e excedente

- **RN-8.1** Apenas o *gestor* encerra uma festa. O encerramento: (a) marca como *ausente* todo convidado sem check-in; (b) congela um **snapshot** das contagens finais; (c) calcula o excedente; (d) muda o status para *realizada*.
- **RN-8.2** Cálculo: `excedente_adultos = max(0, presentes_adultos − contratado_adultos)` e `excedente_criancas = max(0, presentes_criancas − contratado_criancas)`. Valor: quantidades × valores de excedente congelados na festa (RN-4.5). Não há compensação entre categorias (sobra de crianças não abate excedente de adultos), salvo ajuste manual do gestor com auditoria.
- **RN-8.3** O **relatório pós-festa** apresenta: contratado vs. presente por categoria, valor do excedente, lista nominal dos presentes com classificação e walk-ins destacados. Deve existir versão imprimível/compartilhável com o cliente final — a transparência nominal é o que elimina a contestação.
- **RN-8.4** O valor de excedente calculado é uma **recomendação de cobrança**: o gestor confirma, ajusta (com justificativa) ou dispensa. O valor confirmado pode gerar uma parcela adicional no contrato (RN-9.5).

### RN-9 — Contrato e parcelas

- **RN-9.1** Confirmar uma festa exige criar o contrato: valor total (preço do pacote ± ajustes manuais), valor de entrada e plano de parcelas (quantidade e vencimentos). O sistema sugere parcelas mensais iguais entre a confirmação e a data da festa; o gestor edita livremente.
- **RN-9.2** Status de parcela: *pendente*, *paga*, *vencida* (derivado: vencimento anterior a hoje e não paga).
- **RN-9.3** Pagamento de parcela é **registro manual** no MVP (data, forma de pagamento, observação). O sistema não processa pagamento do cliente final — Stripe é exclusivo da assinatura do SaaS (ver Fora de escopo).
- **RN-9.4** Painel financeiro mínimo do gestor: a receber no mês, recebido no mês, parcelas vencidas (com cliente, festa e dias de atraso).
- **RN-9.5** O excedente confirmado (RN-8.4) pode ser lançado como parcela adicional do contrato, vencendo em data definida pelo gestor.

### RN-10 — Histórico e recompra

- **RN-10.1** O cliente final tem cadastro único por tenant (nome, telefone, e-mail) com um ou mais aniversariantes vinculados (nome e **mês/ano de nascimento** — não armazenar data completa, princípio de minimização da LGPD).
- **RN-10.2** A ficha do cliente exibe todas as festas (passadas e futuras) e o histórico financeiro.
- **RN-10.3** Para todo aniversariante com festa *realizada*, o sistema gera um **alerta de recompra 90 dias antes do próximo aniversário**, exibido na home do gestor.
- **RN-10.4** O alerta oferece: botão de WhatsApp (link `wa.me` com mensagem-modelo editável pelo tenant, ex.: "Olá {nome}! O aniversário de {aniversariante} está chegando — que tal garantir a data aqui no {buffet}?"), ação "criar orçamento" (pré-preenche festa em status *orçamento*) e ação "dispensar".
- **RN-10.5** Alertas convertidos em orçamento ficam marcados, alimentando a métrica de recompra (seção 8). Não há envio automático de mensagens no MVP — sempre ação humana.

### RN-11 — Assinatura do SaaS e inadimplência

- **RN-11.1** Trial de 14 dias com todas as funcionalidades, sem cartão. Faltando 3 dias, o sistema exibe aviso persistente para assinar.
- **RN-11.2** Trial expirado sem assinatura → **modo leitura** por 30 dias (consulta tudo, não cria nem edita nada). Depois disso, bloqueio de acesso com retenção dos dados por 6 meses antes de exclusão definitiva (comunicada por e-mail).
- **RN-11.3** Assinatura com pagamento recusado: seguir as retentativas do Stripe; após 10 dias sem regularização, modo leitura. Regularizou, volta ao normal imediatamente. **Nunca excluir dados de assinante inadimplente sem o ciclo completo de avisos.**
- **RN-11.4** Cancelamento self-service, efetivo no fim do período pago, com exportação dos dados essenciais em CSV (clientes, festas, convidados, parcelas) disponível a qualquer momento — portabilidade gera confiança na venda.

### RN-12 — Espaço do cliente final

- **RN-12.1** Acesso por *magic link* enviado ao e-mail cadastrado pelo buffet (sem senha). Ver Decisão em aberto D-3 para alternativa via WhatsApp.
- **RN-12.2** O cliente final vê e faz: dados da sua festa; gerenciar lista de convidados; acompanhar RSVPs em tempo real (com totalizadores RN-5.5); copiar/compartilhar o link do convite; consultar parcelas (somente leitura); consultar o relatório pós-festa quando liberado pelo gestor.
- **RN-12.3** O cliente final **não** vê: agenda do buffet, outros clientes, valores de pacote além do próprio contrato, nem qualquer configuração do tenant.

### RN-13 — Lista de presentes (versão mínima) — Marco opcional M6

- **RN-13.1** O cliente final cadastra itens desejados (nome + link externo opcional, ex.: produto em loja online).
- **RN-13.2** Na página do convite, o convidado confirmado pode marcar "eu vou dar este" — o item some da lista pública (evita presentes repetidos), mas o anfitrião vê quem escolheu o quê.
- **RN-13.3** Sem pagamento, sem PIX, sem integração com lojas no MVP (ver Fase 2).

---

## 5. Escopo do MVP

### Dentro do MVP

| # | Capacidade | Regras |
|---|---|---|
| 1 | Conta do buffet, usuários e papéis, configuração inicial (turnos, slug) | RN-1, RN-2 |
| 2 | Pacotes com regras de contagem por idade | RN-4 |
| 3 | Agenda mensal e ciclo de vida da festa | RN-2, RN-3 |
| 4 | Clientes finais, aniversariantes, contrato e parcelas (registro manual) | RN-9, RN-10.1, RN-10.2 |
| 5 | Lista de convidados com grupos e totalizadores | RN-5 |
| 6 | Convite digital público com RSVP e acompanhantes | RN-6 |
| 7 | Check-in mobile no dia + encerramento + relatório de excedente ⭐ | RN-7, RN-8 |
| 8 | Espaço do cliente final | RN-12 |
| 9 | Alertas de recompra com mensagem pronta (wa.me) | RN-10 |
| 10 | Assinatura do SaaS (trial, Stripe, inadimplência, exportação CSV) | RN-11 |
| 11 | *(Opcional — só se houver fôlego)* Lista de presentes mínima | RN-13 |

### Fora do MVP (deliberadamente)

| Item | Por que fica fora | Destino |
|---|---|---|
| Fluxo de caixa completo (despesas, categorias, DRE) | Parcelas de contrato já cobrem a dor específica do domínio; finanças gerais têm ferramentas maduras | Fase 2 |
| Pagamento online do cliente final (PIX nas parcelas) | Exige gateway, conciliação e suporte; registro manual resolve no início | Fase 2 |
| WhatsApp API oficial / mensagens automáticas | Custo e burocracia altos; o link `wa.me` com mensagem pronta entrega 80% do valor | Fase 2 |
| Ficha da festa / cardápio e escolhas do cliente | Valiosa, mas não participa do ciclo de cobrança que define o MVP | Fase 2 |
| Emissão de NF-e, integrações contábeis | Complexidade regulatória desproporcional ao estágio | Avaliar demanda |
| App nativo | PWA cobre o check-in; reavaliar apenas se houver limitação concreta | Avaliar demanda |
| Múltiplos salões simultâneos | Premissa de 1 festa por turno; contorno documentado em D-2 | Fase 2 |
| Relatórios avançados / BI | O relatório pós-festa e o painel financeiro mínimo bastam para validar valor | Fase 2 |

---

## 6. Marcos de entrega

> Regra geral: um marco só está concluído quando **todos** os seus critérios de aceite passam e a demo do marco pode ser feita de ponta a ponta sem intervenção técnica. Os IDs de RN citados devem ter testes automatizados — em especial o exemplo numérico da RN-4, que é o caso de teste canônico do produto.

### M0 — Fundação e conta do buffet
**Objetivo:** um buffet consegue criar conta e deixar o sistema pronto para operar.
**Entregas:** cadastro/login; criação do tenant; configuração do buffet (nome, slug, endereço, telefone); cadastro de turnos; convite de usuários com papéis gestor/recepcionista.
**Pronto quando:**
- [ ] Dois tenants criados em paralelo não enxergam nenhum dado um do outro (testar explicitamente).
- [ ] Um recepcionista convidado não acessa nenhuma rota além do check-in (que pode estar vazio neste marco).
- [ ] O gestor configura turnos de sábado e domingo em menos de 5 minutos sem ajuda.

### M1 — Pacotes, agenda e festas
**Objetivo:** o coração do domínio funcionando: pacotes com regras de idade e agenda com ciclo de vida.
**Entregas:** CRUD de pacotes (RN-4); agenda mensal com turnos e status; criação de festa em status orçamento; transições de status com validações; bloqueio de double-booking; congelamento das regras na confirmação (a confirmação plena exige contrato, entregue no M2 — neste marco a transição pode ficar atrás de um aviso "requer contrato").
**Pronto quando:**
- [ ] O exemplo de referência da RN-4 retorna exatamente R$ 360 de excedente em teste automatizado de classificação/cálculo (a função de cálculo nasce aqui, mesmo que a UI de encerramento venha no M4).
- [ ] É impossível confirmar duas festas no mesmo turno/data.
- [ ] Alterar um pacote não altera os parâmetros de uma festa já confirmada (RN-4.5).
- [ ] Pessoa sem idade é classificada como adulto e sinalizada (RN-4.3).

### M2 — Clientes, contrato e parcelas
**Objetivo:** o ciclo comercial mínimo: confirmar festa gera compromisso financeiro rastreável.
**Entregas:** cadastro de cliente final + aniversariantes (mês/ano); criação de contrato na confirmação com sugestão automática de parcelas; registro manual de pagamento; painel financeiro mínimo (RN-9.4).
**Pronto quando:**
- [ ] Não existe festa confirmada sem contrato.
- [ ] Parcela com vencimento passado e não paga aparece como vencida no painel, com dias de atraso.
- [ ] A ficha do cliente mostra festas e situação financeira consolidadas.

### M3 — Convidados, convite digital e RSVP
**Objetivo:** o cliente final ganha o recurso que ele mais percebe: a lista que se preenche sozinha.
**Entregas:** lista de convidados com grupos; totalizadores por categoria (RN-5.5); página pública do convite com token; fluxo de RSVP com acompanhantes e idades; modos lista fechada/aberta; prazo de RSVP.
**Pronto quando:**
- [ ] Um convidado confirma pelo celular, adiciona 2 acompanhantes com idades, e os totalizadores do gestor e do cliente final refletem a classificação correta em tempo real.
- [ ] A página pública não expõe lista completa, telefones nem status de terceiros (RN-6.4) — verificado inclusive via respostas de API, não só na interface.
- [ ] Após o prazo de RSVP, nenhuma ação de confirmação é aceita.

### M4 — Check-in, encerramento e excedente ⭐ momento de prova do produto
**Objetivo:** fechar o ciclo que justifica a assinatura.
**Entregas:** módulo de check-in (busca, presente, grupo, desfazer, walk-in, painel de contagem); tolerância a conexão instável (NF-3); encerramento com snapshot; relatório pós-festa imprimível; lançamento do excedente como parcela (RN-9.5).
**Pronto quando:**
- [ ] Uma festa simulada com 40+ convidados roda de ponta a ponta no celular: check-ins, 2 walk-ins, 1 desfazer, encerramento e relatório com excedente correto.
- [ ] Derrubar a conexão no meio do check-in não perde nenhuma marcação e a interface indica o estado de sincronização.
- [ ] O relatório pós-festa lista nominalmente presentes, classificações e walk-ins, e bate com o painel de contagem.

➡️ **A partir do M4 o produto está pronto para o primeiro piloto com um buffet real (design partner), mesmo sem espaço do cliente — o gestor opera a lista pelo cliente.**

### M5 — Espaço do cliente, recompra e assinatura
**Objetivo:** completar a experiência e começar a cobrar.
**Entregas:** magic link e espaço do cliente (RN-12); alertas de recompra com wa.me e conversão em orçamento (RN-10); integração Stripe com trial, modo leitura e exportação CSV (RN-11); avisos de fim de trial.
**Pronto quando:**
- [ ] Cliente final acessa por magic link e gerencia a própria lista sem ver nada além do permitido em RN-12.3.
- [ ] Festa realizada gera alerta 90 dias antes do aniversário seguinte, com mensagem pré-preenchida correta.
- [ ] Tenant com trial expirado entra em modo leitura; assinando, volta ao normal sem perda de dados.
- [ ] Exportação CSV baixa clientes, festas, convidados e parcelas legíveis.

### M6 — (Opcional) Lista de presentes mínima
**Entregas:** RN-13 completa. **Cortar sem culpa se o piloto do M4/M5 gerar aprendizados mais urgentes.**

---

## 7. Estratégia de lançamento

1. **Antes do M1:** fechar 2–3 buffets como *design partners* (uso gratuito ou R$ 49/mês vitalício em troca de feedback semanal). As regras de contagem e exceções reais deles devem ser confrontadas com a RN-4 — se a modelagem de duas idades de corte não cobrir algum caso real, ajustar a RN **antes** de implementar.
2. **Após o M4:** piloto em festa real com um design partner, com o fundador presente no salão observando o check-in.
3. **Após o M5:** abrir trials pagos. Toda venda inicial com onboarding manual (call de 30 min configurando turnos, pacotes e a primeira festa junto com o gestor) — no começo, a conversão vem do onboarding, não do produto sozinho.
4. **Preço:** R$ 197/mês, anual por 10× (R$ 1.970). Não baixar de R$ 99 em negociações — desconto além disso atrai cliente que não valoriza e consome suporte.

---

## 8. Métricas de sucesso

| Métrica | Definição | Meta inicial |
|---|---|---|
| **North star** | Festas *realizadas* gerenciadas pela plataforma por mês | Crescimento mês a mês |
| Ativação | Tenant confirma a 1ª festa com ≥ 10 convidados em até 14 dias de trial | ≥ 60% dos trials |
| Adoção do check-in (métrica "aha") | % de festas realizadas em que o check-in foi usado | ≥ 80% |
| Valor comprovado | Soma de excedentes calculados por tenant/mês (mostrar no painel do gestor: "o sistema identificou R$ X em excedentes este mês") | > mensalidade |
| Recompra | % de alertas de recompra convertidos em orçamento | ≥ 15% |
| Conversão trial → pagante | — | ≥ 25% |
| Churn mensal | — | < 4% |

---

## 9. Requisitos não-funcionais e diretrizes para a implementação

- **NF-1 Isolamento multi-tenant** desde a primeira tabela: todo dado vinculado ao tenant com políticas de acesso no nível do banco (no Supabase, RLS). Testes de isolamento são obrigatórios em todos os marcos.
- **NF-2 Mobile-first** nas superfícies de celular: check-in, página do convite e espaço do cliente. O painel do gestor pode priorizar desktop, mas deve ser utilizável no celular.
- **NF-3 Resiliência de rede no check-in:** internet de salão de festas é ruim. Marcações precisam sobreviver a oscilações e o estado de sincronização deve ser visível.
- **NF-4 LGPD:** minimização de dados (idade aproximada, mês/ano de nascimento — nunca mais do que o necessário); atenção redobrada por haver dados de menores; termos de uso e política de privacidade desde o trial; exportação e exclusão de dados; página pública jamais expõe dados pessoais de terceiros (RN-6.4).
- **NF-5 Localização:** interface em pt-BR, fuso `America/Sao_Paulo`, moeda BRL, datas `dd/mm/aaaa`.
- **NF-6 Auditoria** das ações sensíveis: reabrir festa realizada, sobrescrever regras congeladas, ajustar/dispensar excedente, editar contrato — sempre com usuário, data e motivo.
- **NF-7 Simplicidade antes de escala:** tenants são pequenos (dezenas de festas/mês, centenas de convidados/festa). Priorize código simples e legível; não otimize prematuramente.
- **NF-8 Dados de demonstração:** um seed com buffet fictício completo (pacotes, festas em vários status, festa de hoje pronta para check-in) para desenvolvimento e demos de venda.

**Diretrizes de processo para a LLM implementadora:**
1. Implemente **um marco por vez**, na ordem; entregue cada marco com seus critérios de aceite demonstráveis.
2. As regras de negócio têm IDs — referencie-os em código, testes e mensagens de commit. RN-4 e RN-8 exigem testes automatizados com o exemplo de referência.
3. Encontrou ambiguidade ou um caso não coberto? **Pergunte ao fundador e proponha uma atualização deste documento** — não invente regra silenciosamente.
4. Não adicione funcionalidades fora do escopo da seção 5, ainda que pareçam pequenas, sem aprovação explícita.
5. Itens da seção 10 (decisões em aberto) bloqueiam apenas as partes diretamente afetadas — siga com o restante.

---

## 10. Decisões em aberto

| ID | Decisão | Contexto | Recomendação provisória |
|---|---|---|---|
| D-1 | Gateway da assinatura | Stripe já escolhido, mas buffets pequenos podem preferir PIX/boleto recorrente (Asaas, Mercado Pago, iugu) | Implementar Stripe com a camada de cobrança isolada o suficiente para trocar/adicionar gateway depois; validar com os 10 primeiros assinantes |
| D-2 | Múltiplos salões | MVP assume 1 festa por turno | Contorno: buffet com 2 salões cadastra turnos duplicados ("Sáb tarde — Salão A/B"); reavaliar na fase 2 |
| D-3 | Acesso do cliente final | Magic link por e-mail pressupõe e-mail ativo; público pode ser mais responsivo no WhatsApp | Lançar com magic link por e-mail; se atrito aparecer no piloto, link tokenizado enviado por WhatsApp |
| D-4 | Nome do produto e domínio — ✅ **Decidido: VivaFesta** | Afeta as URLs públicas do M3 | Pendências antes do M3: registrar domínio (`vivafesta.com.br`; alternativas `usevivafesta.com.br` ou `vivafesta.app`), reservar @vivafesta no Instagram e verificar colisão de marca no INPI (classes de software) |
| D-5 | Sinal de reserva | RN-3.2 apenas registra a reserva | Validar com design partners se a reserva deve exigir registro de parcela de entrada |
| D-6 | Lista de presentes no MVP | Desejo original do fundador vs. foco no ciclo de cobrança | Manter como M6 opcional; decidir após o piloto do M4 |

---

## 11. Fase 2 — backlog futuro (não implementar agora)

Em ordem provável de prioridade, a confirmar com clientes reais:

1. **Ficha da festa / ordem de serviço** — tema, cardápio, restrições alimentares, observações operacionais para a equipe do dia.
2. **Pagamento online de parcelas pelo cliente final** (PIX) com baixa automática.
3. **Fluxo de caixa completo** — despesas, categorias, visão mensal consolidada.
4. **WhatsApp API oficial** — lembretes automáticos de RSVP, vencimento de parcela e recompra.
5. **Lista de presentes com cotas/PIX.**
6. **Relatórios e comparativos** — taxa de comparecimento média, excedente médio por pacote, sazonalidade.
7. **Multi-salão nativo.**
8. **Painel admin completo da plataforma** (métricas de uso por tenant, saúde da base).
9. **NF-e / integrações contábeis** — somente com demanda comprovada.

---

## Histórico do documento

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-06-11 | Versão inicial: visão, regras de negócio RN-1 a RN-13, marcos M0–M6, métricas e decisões em aberto |
| 1.1 | 2026-06-11 | Nome do produto definido: **VivaFesta** (D-4 — registro de domínio, Instagram e verificação no INPI pendentes) |
