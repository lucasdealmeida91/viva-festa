import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("gestor configura turnos de sábado e domingo (M0-T3 / critério M0)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  // setup: conta + buffet
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Config");
  await page.getByLabel("E-mail").fill(`cfg-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Config E2E");
  await page.getByLabel("Endereço da página").fill(`cfg-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  // configurações
  await page.getByRole("link", { name: "Configurações do buffet" }).click();
  await expect(page).toHaveURL(/\/app\/configuracoes$/);

  // dados do buffet
  await page.getByLabel("Telefone").fill("11 4002-8922");
  await page.getByRole("button", { name: "Salvar dados" }).click();
  await expect(page.getByText("Dados salvos.")).toBeVisible();

  // turno de sábado
  await page.getByLabel("Nome do turno").fill("Sábado tarde");
  await page.getByLabel("Dia da semana").selectOption("6");
  await page.getByLabel("Início").fill("12:00");
  await page.getByLabel("Fim").fill("16:00");
  await page.getByRole("button", { name: "Adicionar turno" }).click();
  await expect(page.getByText("Sábado tarde")).toBeVisible();
  await expect(page.getByText("Sábado · 12:00–16:00")).toBeVisible();

  // turno de domingo
  await page.getByLabel("Nome do turno").fill("Domingo almoço");
  await page.getByLabel("Dia da semana").selectOption("0");
  await page.getByLabel("Início").fill("11:00");
  await page.getByLabel("Fim").fill("15:00");
  await page.getByRole("button", { name: "Adicionar turno" }).click();
  await expect(page.getByText("Domingo almoço")).toBeVisible();

  // excluir o turno de domingo
  await page
    .getByRole("listitem")
    .filter({ hasText: "Domingo almoço" })
    .getByRole("button", { name: "Excluir" })
    .click();
  await expect(page.getByText("Domingo almoço")).not.toBeVisible();
});
