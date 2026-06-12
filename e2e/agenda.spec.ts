import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("agenda mensal: turno livre vira orçamento pelo atalho (M1-T3)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  // conta + buffet
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Agenda");
  await page.getByLabel("E-mail").fill(`age-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Agenda E2E");
  await page.getByLabel("Endereço da página").fill(`age-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  // turno de sábado
  await page.goto("/app/configuracoes");
  await page.getByLabel("Nome do turno").fill("Sábado tarde");
  await page.getByLabel("Dia da semana").selectOption("6");
  await page.getByLabel("Início").fill("12:00");
  await page.getByLabel("Fim").fill("16:00");
  await page.getByRole("button", { name: "Adicionar turno" }).click();
  await expect(page.getByText("Turno criado.")).toBeVisible();

  // pacote
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

  // agenda mostra sábados livres
  await page.goto("/app/agenda");
  const freeSlot = page.getByRole("link", { name: /Sábado tarde .* Livre/ });
  await expect(freeSlot.first()).toBeVisible();

  // atalho da célula → orçamento com data/turno pré-preenchidos
  await freeSlot.first().click();
  await expect(page).toHaveURL(/\/app\/agenda\/nova\?data=/);
  await page.getByRole("button", { name: "Criar orçamento" }).click();

  // de volta à agenda: célula virou orçamento
  await expect(page).toHaveURL(/\/app\/agenda\?mes=/);
  await expect(
    page.getByRole("link", { name: /Sábado tarde .* Orçamento/ }).first(),
  ).toBeVisible();
});
