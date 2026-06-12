import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("confirmação exige contrato com plano de parcelas (M2-T2)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  // setup: conta, buffet, turno, pacote, cliente
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Contratos");
  await page.getByLabel("E-mail").fill(`ctr-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Contratos E2E");
  await page.getByLabel("Endereço da página").fill(`ctr-${runId}-${project}`);
  await page.getByRole("button", { name: "Criar buffet" }).click();
  await expect(page).toHaveURL(/\/app(\?.*)?$/);

  await page.goto("/app/configuracoes");
  await page.getByLabel("Nome do turno").fill("Sábado tarde");
  await page.getByLabel("Dia da semana").selectOption("6");
  await page.getByLabel("Início").fill("12:00");
  await page.getByLabel("Fim").fill("16:00");
  await page.getByRole("button", { name: "Adicionar turno" }).click();
  await expect(page.getByText("Turno criado.")).toBeVisible();

  await page.goto("/app/pacotes");
  await page.getByLabel("Nome", { exact: true }).fill("Festa Top");
  await page.getByLabel("Adultos").fill("50");
  await page.getByLabel("Crianças").fill("30");
  await page.getByLabel("Preço base (R$)").fill("5500.00");
  await page.getByLabel("Idade de isenção").fill("8");
  await page.getByLabel("Idade de adulto").fill("13");
  await page.getByLabel("Adulto excedente (R$)").fill("90.00");
  await page.getByLabel("Criança excedente (R$)").fill("55.00");
  await page.getByRole("button", { name: "Criar pacote" }).click();
  await expect(page.getByText("Pacote criado.")).toBeVisible();

  await page.goto("/app/clientes");
  await page.getByLabel("Nome", { exact: true }).fill("Maria Contratos");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page).toHaveURL(/\/app\/clientes\/[\w-]+$/);

  // orçamento → reservada
  await page.goto("/app/agenda");
  await page.getByRole("link", { name: /Sábado tarde .* Livre/ }).first().click();
  await page.getByRole("button", { name: "Criar orçamento" }).click();
  await page
    .getByRole("link", { name: /Sábado tarde .* Orçamento/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Reservar data" }).click();
  await expect(page.getByText("Status:")).toContainText("Reservada");

  // confirmar com contrato
  await page.getByRole("link", { name: "Confirmar festa" }).click();
  await expect(page).toHaveURL(/\/confirmar$/);
  await page.getByLabel("Cliente").selectOption({ label: "Maria Contratos" });
  // total pré-preenchido com o preço do pacote (5500.00)
  await expect(page.getByLabel("Valor total (R$)")).toHaveValue("5500.00");
  await page.getByLabel("Entrada (R$)").fill("1000");
  await expect(page.getByText("Plano sugerido (RN-9.1)")).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar festa com contrato" })
    .click();

  // festa confirmada com contrato visível
  await expect(page.getByText("Status:")).toContainText("Confirmada");
  await expect(page.getByText("Contrato (RN-9.1)")).toBeVisible();
  await expect(page.getByText(/Entrada · /)).toBeVisible();
  await expect(page.getByText("Maria Contratos")).toBeVisible();
});
