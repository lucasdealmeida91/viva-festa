import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("gestor comum não acessa o painel admin (M5-T8)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Comum");
  await page.getByLabel("E-mail").fill(`adm-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Admin E2E");
  await page.getByLabel("Endereço da página").fill(`adm-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  // sem is_platform_admin → 404
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
});
