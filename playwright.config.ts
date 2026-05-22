/**
 * Playwright e2e config — Pak Abdullah audit 2026-05-22 directive
 * "selalu lakukan test lint dan e2e test".
 *
 * Default test mode: smoke test terhadap PRODUCTION (babahalgo.com) supaya
 * post-deploy verification quick. Set PLAYWRIGHT_BASE_URL untuk override
 * ke local dev (http://localhost:3000) atau staging.
 *
 * Run:
 *   npx playwright test                      # against production
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test   # local
 *   npx playwright test --ui                 # interactive UI mode
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://babahalgo.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
