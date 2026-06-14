import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

// Checkout real do Stripe exige chaves de teste (não disponíveis no CI).
test.skip(!!process.env.CI, "requer chaves Stripe de teste — roda local");

test("checkout redireciona para o Stripe (M5-T4)", async ({ page }, testInfo) => {
  const project = testInfo.project.name;

  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Assina");
  await page.getByLabel("E-mail").fill(`sub-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Assina E2E");
  await page.getByLabel("Endereço da página").fill(`sub-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  await page.goto("/app/assinatura");
  await page.getByRole("button", { name: "Assinar (mensal)" }).click();
  // redireciona para o checkout hospedado do Stripe (modo teste)
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20000 });
  expect(page.url()).toContain("checkout.stripe.com");
});
