import { defineConfig } from "@playwright/test";
import chromium from "@sparticuz/chromium";
const bundled = process.env.LOWCAL_USE_BUNDLED_CHROMIUM === "1";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    launchOptions: bundled
      ? {
          executablePath: await chromium.executablePath(),
          args: chromium.args.filter(
            (arg) =>
              ![
                "--single-process",
                "--disable-web-security",
                "--allow-running-insecure-content",
                "--disable-site-isolation-trials",
              ].includes(arg),
          ),
        }
      : {},
  },
  webServer: {
    command:
      process.env.LOWCAL_E2E_PRODUCTION === "1" ? "npm start" : "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
