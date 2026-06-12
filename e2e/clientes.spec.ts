import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("cadastro de cliente com aniversariante e busca (M2-T1)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Clientes");
  await page.getByLabel("E-mail").fill(`cli-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Clientes E2E");
  await page.getByLabel("Endereço da página").fill(`cli-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  // cadastrar cliente
  await page.goto("/app/clientes");
  await page.getByLabel("Nome", { exact: true }).fill("Maria Souza");
  await page.getByLabel("Telefone").fill("11 98888-7777");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page).toHaveURL(/\/app\/clientes\/[\w-]+$/);

  // aniversariante: somente mês/ano — nenhum input de data completa (LGPD)
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
  await page.getByLabel("Nome da criança").fill("Joãozinho");
  await page.getByLabel("Mês de nascimento").selectOption("7");
  await page.getByLabel("Ano").fill("2020");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Aniversariante adicionado.")).toBeVisible();
  await expect(page.getByText("Julho/2020")).toBeVisible();

  // busca por telefone
  await page.goto("/app/clientes");
  await page.getByLabel("Buscar cliente").fill("98888");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Maria Souza")).toBeVisible();

  // busca sem resultado
  await page.getByLabel("Buscar cliente").fill("inexistente");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Nenhum cliente encontrado.")).toBeVisible();
});
