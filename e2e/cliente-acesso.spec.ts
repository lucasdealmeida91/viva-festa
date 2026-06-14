import { expect, test, type Page } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";
const MAILPIT = "http://127.0.0.1:54324";

async function magicLinkFor(page: Page, email: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const search = await page.request.get(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    );
    const { messages } = await search.json();
    if (messages?.length) {
      const detail = await page.request.get(
        `${MAILPIT}/api/v1/message/${messages[0].ID}`,
      );
      const body = await detail.json();
      const match = String(body.Text).match(
        /https?:\/\/[^\s"]+\/auth\/v1\/verify[^\s"]*/,
      );
      if (match) return match[0];
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Magic link para ${email} não chegou`);
}

test("cliente final acessa por magic link e vê só a própria festa (M5-T1)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;
  const clientEmail = `cli-acc-${runId}-${project}@test.dev`;

  // gestor: conta, buffet, turno, pacote, cliente (com e-mail), festa confirmada
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Acesso");
  await page.getByLabel("E-mail").fill(`mgr-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Acesso E2E");
  await page.getByLabel("Endereço da página").fill(`acc-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  await page.goto("/app/clientes");
  await page.getByLabel("Nome", { exact: true }).fill("Cliente Acesso");
  await page.getByLabel("E-mail").fill(clientEmail);
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page).toHaveURL(/\/app\/clientes\/[\w-]+$/);

  // envia o magic link
  await page
    .getByRole("button", { name: /Enviar acesso ao cliente/ })
    .click();
  await expect(page.getByText(/Link de acesso enviado/)).toBeVisible();

  // gestor sai
  await page.goto("/app");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // cliente abre o magic link → cai em /cliente autenticado
  const link = await magicLinkFor(page, clientEmail);
  await page.goto(link);
  await expect(page).toHaveURL(/\/cliente/);
  await expect(page.getByRole("heading", { name: /Olá/ })).toBeVisible();
  await expect(page.getByText("Minhas festas")).toBeVisible();
});
