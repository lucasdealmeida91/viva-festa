import { expect, test, type Page } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";
const MAILPIT = "http://127.0.0.1:54324";

/** Busca no Mailpit o link de convite enviado ao e-mail. */
async function inviteLinkFor(page: Page, email: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
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
  throw new Error(`Convite para ${email} não chegou ao Mailpit`);
}

test("gestor convida recepcionista, que só acessa o check-in (critério M0)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;
  const recEmail = `rec-${runId}-${project}@test.dev`;

  // gestor: conta + buffet
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Convites");
  await page.getByLabel("E-mail").fill(`mgr-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Convites");
  await page.getByLabel("Endereço da página").fill(`conv-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app$/);

  // convite
  await page.goto("/app/configuracoes");
  await page.getByLabel("Nome", { exact: true }).fill("Recep E2E");
  await page.getByLabel("E-mail", { exact: true }).fill(recEmail);
  await page.getByLabel("Papel").selectOption("receptionist");
  await page.getByRole("button", { name: "Convidar" }).click();
  await expect(page.getByText("Convite enviado por e-mail.")).toBeVisible();
  await expect(page.getByText("Recep E2E")).toBeVisible();

  // gestor sai
  await page.goto("/app");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // recepcionista aceita o convite e define a senha
  const link = await inviteLinkFor(page, recEmail);
  await page.goto(link);
  await expect(page).toHaveURL(/\/definir-senha/);
  await page.getByLabel("Nova senha").fill(password);
  await page.getByRole("button", { name: "Salvar senha e entrar" }).click();
  await expect(page).toHaveURL(/\/checkin$/);

  // critério do PRD: nenhuma rota além do check-in
  await page.goto("/app");
  await expect(page).toHaveURL(/\/checkin$/);
  await page.goto("/app/configuracoes");
  await expect(page).toHaveURL(/\/checkin$/);
});
