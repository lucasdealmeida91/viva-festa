import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

// M4-T6 — fluxo do dia da festa de ponta a ponta pela UI. A correção do
// cálculo de excedente em escala (54/28/9 → R$360) está travada em
// supabase/tests/closing.test.ts; aqui provamos a integração das telas.
test("dia da festa: check-in, walk-in, desfazer, encerramento, relatório", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  // setup
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Dia");
  await page.getByLabel("E-mail").fill(`dia-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Dia E2E");
  await page.getByLabel("Endereço da página").fill(`dia-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  await page.goto("/app/configuracoes");
  await page.getByLabel("Nome do turno").fill("Sábado tarde");
  await page.getByLabel("Dia da semana").selectOption("6");
  await page.getByLabel("Início").fill("12:00");
  await page.getByLabel("Fim").fill("16:00");
  await page.getByRole("button", { name: "Adicionar turno" }).click();
  await expect(page.getByText("Turno criado.")).toBeVisible();

  await page.goto("/app/pacotes");
  await page.getByLabel("Nome", { exact: true }).fill("Festa Top");
  await page.getByLabel("Adultos").fill("2"); // capacidade baixa p/ gerar excedente
  await page.getByLabel("Crianças").fill("5");
  await page.getByLabel("Preço base (R$)").fill("5500.00");
  await page.getByLabel("Idade de isenção").fill("8");
  await page.getByLabel("Idade de adulto").fill("13");
  await page.getByLabel("Adulto excedente (R$)").fill("90.00");
  await page.getByLabel("Criança excedente (R$)").fill("55.00");
  await page.getByRole("button", { name: "Criar pacote" }).click();
  await expect(page.getByText("Pacote criado.")).toBeVisible();

  await page.goto("/app/clientes");
  await page.getByLabel("Nome", { exact: true }).fill("Maria Dia");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page).toHaveURL(/\/app\/clientes\/[\w-]+$/);

  await page.goto("/app/agenda");
  await page.getByRole("link", { name: /Sábado tarde .* Livre/ }).first().click();
  await page.getByRole("button", { name: "Criar orçamento" }).click();
  await page.getByRole("link", { name: /Sábado tarde .* Orçamento/ }).first().click();
  await page.getByRole("button", { name: "Reservar data" }).click();
  await page.getByRole("link", { name: "Confirmar festa" }).click();
  await page.getByLabel("Cliente").selectOption({ label: "Maria Dia" });
  await page.getByRole("button", { name: "Confirmar festa com contrato" }).click();
  await expect(page.getByText("Status:")).toContainText("Confirmada");

  const partyId = page.url().match(/\/app\/festas\/([\w-]+)/)![1];

  // adiciona 3 adultos (30a) + 1 criança (10a)
  for (const [name, age] of [
    ["Adulto Um", "30"],
    ["Adulto Dois", "30"],
    ["Adulto Tres", "30"],
    ["Crianca Um", "10"],
  ] as const) {
    await page.getByLabel("Nome", { exact: true }).fill(name);
    await page.getByLabel("Idade", { exact: true }).fill(age);
    await page.getByRole("button", { name: "Adicionar convidado" }).click();
    await expect(page.getByText(name)).toBeVisible();
  }

  // === check-in ===
  await page.goto(`/checkin/${partyId}`);
  // marca os 3 adultos e a criança presentes
  for (const name of ["Adulto Um", "Adulto Dois", "Adulto Tres", "Crianca Um"]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
  }
  // desfaz um (erro de portaria) e remarca
  await page.getByRole("button", { name: /Adulto Tres/ }).click(); // desfaz
  await expect(
    page.getByRole("button", { name: /Adulto Tres/ }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /Adulto Tres/ }).click(); // remarca

  // walk-in (adulto, sem convite)
  await page.getByLabel("Nome", { exact: true }).fill("Walk Adulto");
  await page.getByLabel("Idade", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Adicionar presente" }).click();
  await expect(page.getByText("✓ tudo sincronizado")).toBeVisible({ timeout: 15000 });

  // painel: 4 adultos presentes / capacidade 2 → excedente de 2 adultos
  await expect(page.getByText(/Adultos 4\/2/)).toBeVisible();

  // === encerramento ===
  await page.goto(`/app/festas/${partyId}`);
  await page.getByRole("button", { name: "Encerrar e calcular excedente" }).click();
  await expect(page.getByText("Status:")).toContainText("Realizada");
  // 4 adultos presentes − 2 contratados = 2 × R$90 = R$180
  await expect(page.getByText(/R\$\s?180,00/)).toBeVisible();

  // === relatório ===
  await page.getByRole("link", { name: "Ver relatório pós-festa" }).click();
  await expect(page).toHaveURL(/\/relatorio$/);
  await expect(page.getByRole("heading", { name: "Relatório pós-festa" })).toBeVisible();
  await expect(page.getByText("Walk Adulto")).toBeVisible();
  await expect(page.getByText("walk-in").first()).toBeVisible();
});
