import { expect, test } from "@playwright/test";

test("login page renders in pt-BR", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
});

test("public invite resolves dynamic params", async ({ page }) => {
  await page.goto("/buffet-alegria/x7k2p");
  await expect(
    page.getByRole("heading", { name: /Você está convidado/ }),
  ).toBeVisible();
  await expect(page.getByText("buffet-alegria")).toBeVisible();
});
