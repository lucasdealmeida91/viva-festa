import { expect, test } from "@playwright/test";

test("login page renders in pt-BR", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
});

test("public invite (seed) renders party info, no login", async ({ page }) => {
  await page.goto("/buffet-alegria/demo-convite");
  await expect(
    page.getByRole("heading", { name: /Aniversariante Demo/ }),
  ).toBeVisible();
  await expect(page.getByText("Buffet Alegria (Demo)")).toBeVisible();
});

test("invalid invite token is 404", async ({ page }) => {
  const res = await page.goto("/buffet-alegria/nao-existe");
  expect(res?.status()).toBe(404);
});
