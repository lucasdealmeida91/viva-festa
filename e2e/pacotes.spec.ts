import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("gestor cria pacote, valida regras de idade e arquiva (M1-T2)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  // conta + buffet
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Pacotes");
  await page.getByLabel("E-mail").fill(`pkg-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Pacotes E2E");
  await page.getByLabel("Endereço da página").fill(`pkg-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  await page.getByRole("link", { name: "Pacotes" }).click();
  await expect(page).toHaveURL(/\/app\/pacotes$/);

  // RN-4.2: isenção >= adulto é rejeitado
  await page.getByLabel("Nome", { exact: true }).fill("Pacote Inválido");
  await page.getByLabel("Adultos").fill("50");
  await page.getByLabel("Crianças").fill("30");
  await page.getByLabel("Preço base (R$)").fill("5500.00");
  await page.getByLabel("Idade de isenção").fill("13");
  await page.getByLabel("Idade de adulto").fill("13");
  await page.getByLabel("Adulto excedente (R$)").fill("90.00");
  await page.getByLabel("Criança excedente (R$)").fill("55.00");
  await page.getByRole("button", { name: "Criar pacote" }).click();
  await expect(page.getByText(/idade de isenção deve ser menor/)).toBeVisible();

  // pacote válido (o do exemplo canônico) — o form reseta após o submit,
  // então preenche tudo de novo
  await page.getByLabel("Nome", { exact: true }).fill("Pacote Festa Top");
  await page.getByLabel("Adultos").fill("50");
  await page.getByLabel("Crianças").fill("30");
  await page.getByLabel("Preço base (R$)").fill("5500.00");
  await page.getByLabel("Idade de isenção").fill("8");
  await page.getByLabel("Idade de adulto").fill("13");
  await page.getByLabel("Adulto excedente (R$)").fill("90.00");
  await page.getByLabel("Criança excedente (R$)").fill("55.00");
  await page.getByRole("button", { name: "Criar pacote" }).click();
  await expect(page.getByText("Pacote criado.")).toBeVisible();
  await expect(page.getByText("Pacote Festa Top")).toBeVisible();
  await expect(page.getByText(/50 adultos \+ 30 crianças/)).toBeVisible();

  // arquivar
  await page.getByRole("button", { name: "Arquivar" }).click();
  await expect(page.getByText("(arquivado)")).toBeVisible();
});
