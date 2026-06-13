import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("convidado confirma + 2 acompanhantes; totalizadores refletem (M3-T6)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  // setup completo: conta, buffet, turno, pacote, cliente, festa confirmada
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora RSVP");
  await page.getByLabel("E-mail").fill(`rsvp-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet RSVP E2E");
  await page.getByLabel("Endereço da página").fill(`rsvp-${runId}-${project}`);
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
  await page.getByLabel("Nome", { exact: true }).fill("Maria RSVP");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page).toHaveURL(/\/app\/clientes\/[\w-]+$/);

  // orçamento → reservada → confirmada com contrato
  await page.goto("/app/agenda");
  await page.getByRole("link", { name: /Sábado tarde .* Livre/ }).first().click();
  await page.getByRole("button", { name: "Criar orçamento" }).click();
  await page.getByRole("link", { name: /Sábado tarde .* Orçamento/ }).first().click();
  await page.getByRole("button", { name: "Reservar data" }).click();
  await page.getByRole("link", { name: "Confirmar festa" }).click();
  await page.getByLabel("Cliente").selectOption({ label: "Maria RSVP" });
  await page.getByRole("button", { name: "Confirmar festa com contrato" }).click();
  await expect(page.getByText("Status:")).toContainText("Confirmada");

  // adiciona o titular na lista (idade 30 → adulto)
  await page.getByLabel("Nome", { exact: true }).fill("Ana Titular");
  await page.getByLabel("Idade", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Adicionar convidado" }).click();
  await expect(page.getByText("Ana Titular")).toBeVisible();

  // publica o convite e captura o link
  await page.getByLabel("Faz quantos anos").fill("6");
  await page.getByRole("button", { name: "Publicar convite" }).click();
  await expect(page.getByText("Convite publicado.")).toBeVisible();
  const inviteUrl = await page
    .getByRole("link", { name: /\/rsvp-/ })
    .first()
    .getAttribute("href");
  expect(inviteUrl).toBeTruthy();

  // === fluxo do convidado na página pública ===
  await page.goto(inviteUrl!);
  await expect(
    page.getByRole("heading", { name: /Aniversariante|nosso aniversariante|6 anos/ }),
  ).toBeVisible();
  await page.getByLabel(/busque seu nome/i).fill("Ana");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("button", { name: /Ana Titular/ }).click();

  // 2 acompanhantes: Bia (9 → criança), Léo (35 → adulto)
  await page.getByRole("button", { name: "+ Acompanhante" }).click();
  await page.getByLabel("Nome do acompanhante 1").fill("Bia");
  await page.getByLabel("Idade do acompanhante 1").fill("9");
  await page.getByRole("button", { name: "+ Acompanhante" }).click();
  await page.getByLabel("Nome do acompanhante 2").fill("Léo");
  await page.getByLabel("Idade do acompanhante 2").fill("35");
  await page.getByRole("button", { name: "Confirmar presença" }).click();
  await expect(page.getByText(/Presença confirmada/)).toBeVisible();

  // === totalizadores do gestor refletem: Adultos 2, Crianças 1 ===
  await page.goto("/app/agenda");
  await page.getByRole("link", { name: /Sábado tarde .* Confirmada/ }).first().click();
  await expect(page.getByText(/Adultos:\s*2\/50/)).toBeVisible();
  await expect(page.getByText(/Crianças:\s*1\/30/)).toBeVisible();
});
