import { defineConfig, devices } from "@playwright/test";

// Not the development ports, so a journey never meets a developer's running apps.
const backendPort = 3100;
const frontendPort = 5174;
const frontendOrigin = `http://localhost:${frontendPort}`;

export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: frontendOrigin,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node support/start-backend.mjs",
      env: { PORT: String(backendPort), CORS_ORIGINS: frontendOrigin },
      url: `http://localhost:${backendPort}/api/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    },
    {
      command: `npm run dev --prefix ../frontend -- --port ${frontendPort} --strictPort`,
      env: { API_PROXY_TARGET: `http://localhost:${backendPort}` },
      url: frontendOrigin,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
