import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("cadastro → onboarding → painel do buffet (M0-T2)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Dona do Buffet");
  await page.getByLabel("E-mail").fill(`onb-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByLabel("Nome do buffet").fill("Buffet Estrela E2E");
  // slug sugerido automaticamente; torna único por execução
  await page.getByLabel("Endereço da página").fill(`estrela-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();

  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Painel do buffet" }),
  ).toBeVisible();

  // persiste: revisitar /app não volta ao onboarding
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app$/);
});
