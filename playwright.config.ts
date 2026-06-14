import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // Um único servidor + GoTrue local degradam sob muitos signups paralelos;
  // 2 workers mantém a suite estável (local e CI).
  workers: 2,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Mobile-first surfaces (check-in, convite, espaço do cliente — NF-2)
    // are tested on a mobile viewport by default. Pixel 7 runs on Chromium,
    // the only browser installed; add WebKit coverage if the M4 pilot needs it.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Build de produção: o dev server recompila rota a rota e desmorona com a
  // suite inteira em paralelo; o build é pago uma vez e o serve é estável.
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
