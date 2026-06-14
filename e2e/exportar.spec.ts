import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("gestor exporta clientes em CSV (M5-T7)", async ({ page }, testInfo) => {
  const project = testInfo.project.name;

  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Export");
  await page.getByLabel("E-mail").fill(`exp-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Export E2E");
  await page.getByLabel("Endereço da página").fill(`exp-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  // cadastra um cliente para sair no CSV
  await page.goto("/app/clientes");
  await page.getByLabel("Nome", { exact: true }).fill("Cliente CSV");
  await page.getByLabel("Telefone").fill("11 90000-0000");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page).toHaveURL(/\/app\/clientes\/[\w-]+$/);

  await page.goto("/app/assinatura");
  const download = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "clientes.csv" }).click(),
  ]);
  expect(download[0].suggestedFilename()).toBe("vivafesta-clientes.csv");
});
