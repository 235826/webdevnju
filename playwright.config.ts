import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const backendPort = 7101;
const frontendPort = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${frontendPort}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev --workspace backend",
      env: {
        BACKEND_PORT: String(backendPort),
        DATABASE_PATH: join(
          tmpdir(),
          `football-platform-playwright-${process.pid}.sqlite`,
        ),
      },
      timeout: 120_000,
      url: `http://127.0.0.1:${backendPort}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev --workspace frontend",
      env: {
        BACKEND_INTERNAL_URL: `http://127.0.0.1:${backendPort}`,
        FRONTEND_PORT: String(frontendPort),
        NEXT_DIST_DIR: ".next-e2e",
      },
      timeout: 120_000,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
    },
  ],
});
