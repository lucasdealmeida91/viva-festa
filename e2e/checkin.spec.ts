import { expect, test } from "@playwright/test";

const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const password = "senha-e2e-123";

test("check-in sobrevive a queda de rede (NF-3 / M4-T3)", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;

  // setup: conta, buffet, turno, pacote, cliente, festa confirmada
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Gestora Checkin");
  await page.getByLabel("E-mail").fill(`chk-${runId}-${project}@test.dev`);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome do buffet").fill("Buffet Checkin E2E");
  await page.getByLabel("Endereço da página").fill(`chk-${runId}-${project}`);
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
  await page.getByLabel("Nome", { exact: true }).fill("Maria Checkin");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page).toHaveURL(/\/app\/clientes\/[\w-]+$/);

  await page.goto("/app/agenda");
  await page.getByRole("link", { name: /Sábado tarde .* Livre/ }).first().click();
  await page.getByRole("button", { name: "Criar orçamento" }).click();
  await page.getByRole("link", { name: /Sábado tarde .* Orçamento/ }).first().click();
  await page.getByRole("button", { name: "Reservar data" }).click();
  await page.getByRole("link", { name: "Confirmar festa" }).click();
  await page.getByLabel("Cliente").selectOption({ label: "Maria Checkin" });
  await page.getByRole("button", { name: "Confirmar festa com contrato" }).click();
  await expect(page.getByText("Status:")).toContainText("Confirmada");

  // captura o id da festa e adiciona um convidado
  const partyId = page.url().match(/\/app\/festas\/([\w-]+)/)![1];
  await page.getByLabel("Nome", { exact: true }).fill("Convidado Um");
  await page.getByLabel("Idade", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Adicionar convidado" }).click();
  await expect(page.getByText("Convidado Um")).toBeVisible();

  // === board de check-in (gestor pode marcar qualquer festa confirmada) ===
  await page.goto(`/checkin/${partyId}`);
  await expect(page.getByText("✓ tudo sincronizado")).toBeVisible();

  // derruba a rede e marca presente
  await page.context().setOffline(true);
  await page.getByRole("button", { name: /Convidado Um/ }).click();
  // marcação otimista permanece + indicador de pendência (não perde marca)
  await expect(page.getByText(/não sincronizada/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Convidado Um/ }),
  ).toHaveAttribute("aria-pressed", "true");

  // volta a rede → sincroniza
  await page.context().setOffline(false);
  await expect(page.getByText("✓ tudo sincronizado")).toBeVisible({
    timeout: 15000,
  });

  // recarrega: a marcação persistiu no banco
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Convidado Um/ }),
  ).toHaveAttribute("aria-pressed", "true");
});
