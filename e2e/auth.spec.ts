import { expect, test } from "@playwright/test";

// Unique per worker (each project runs in its own worker; retries restart it).
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test.describe.serial("ciclo de autenticação (M0-T1)", () => {
  const email = (projectName: string) =>
    `e2e-${runId}-${projectName}@test.dev`;

  test("rota protegida exige sessão", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("cadastro cria conta e leva ao onboarding", async ({
    page,
  }, testInfo) => {
    await page.goto("/cadastro");
    await page.getByLabel("Seu nome").fill("Dono do Buffet");
    await page.getByLabel("E-mail").fill(email(testInfo.project.name));
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Criar conta" }).click();

    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole("heading", { name: "Bem-vindo ao VivaFesta" }),
    ).toBeVisible();
  });

  test("logout e login fecham o ciclo", async ({ page }, testInfo) => {
    // login (sessão do teste anterior não persiste entre testes)
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email(testInfo.project.name));
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    // logout
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // rota protegida volta a exigir sessão
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("autenticado não acessa páginas de auth", async ({
    page,
  }, testInfo) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill(email(testInfo.project.name));
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    // /login com sessão → proxy manda para /app → sem tenant → /onboarding
    await page.goto("/login");
    await expect(page).toHaveURL(/\/(app|onboarding)$/);
  });
});
