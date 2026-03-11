import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command:
      "sh -lc 'VITE_CHAT_SERVER_URL=http://127.0.0.1:4010 npm run build && npm run preview -- --host 127.0.0.1 --port 4173'",
    port: 4173,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
