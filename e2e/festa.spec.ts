import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("ciclo orçamento → reservada → cancelada pela UI (M1-T5)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  // setup: conta, buffet, turno, pacote (mesmo fluxo dos specs anteriores)
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Festas");
  await page.getByLabel("E-mail").fill(`fst-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Festas E2E");
  await page.getByLabel("Endereço da página").fill(`fst-${runId}-${project}`);
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
  await page.getByLabel("Adultos").fill("50");
  await page.getByLabel("Crianças").fill("30");
  await page.getByLabel("Preço base (R$)").fill("5500.00");
  await page.getByLabel("Idade de isenção").fill("8");
  await page.getByLabel("Idade de adulto").fill("13");
  await page.getByLabel("Adulto excedente (R$)").fill("90.00");
  await page.getByLabel("Criança excedente (R$)").fill("55.00");
  await page.getByRole("button", { name: "Criar pacote" }).click();
  await expect(page.getByText("Pacote criado.")).toBeVisible();

  // orçamento pela agenda
  await page.goto("/app/agenda");
  await page.getByRole("link", { name: /Sábado tarde .* Livre/ }).first().click();
  await page.getByRole("button", { name: "Criar orçamento" }).click();
  await expect(page).toHaveURL(/\/app\/agenda\?mes=/);

  // abre a festa pela célula
  await page
    .getByRole("link", { name: /Sábado tarde .* Orçamento/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/festas\//);
  await expect(page.getByText("Status:")).toContainText("Orçamento");

  // reservar
  await page.getByRole("button", { name: "Reservar data" }).click();
  await expect(page.getByText("Status:")).toContainText("Reservada");

  // agenda reflete
  await page.getByRole("link", { name: "← Agenda" }).click();
  await expect(
    page.getByRole("link", { name: /Sábado tarde .* Reservada/ }).first(),
  ).toBeVisible();

  // cancelar com motivo obrigatório
  await page.getByRole("link", { name: /Sábado tarde .* Reservada/ }).first().click();
  await page.getByLabel("Motivo do cancelamento").fill("Cliente desistiu");
  await page.getByRole("button", { name: "Cancelar festa" }).click();
  await expect(page.getByText("Status:")).toContainText("Cancelada");

  // agenda libera o turno (RN-3.5)
  await page.getByRole("link", { name: "← Agenda" }).click();
  await expect(
    page.getByRole("link", { name: /Sábado tarde .* Livre/ }).first(),
  ).toBeVisible();
});
