import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 420000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    channel: 'chromium',
    baseURL: process.env['E2E_BASE_URL'] || 'http://127.0.0.1:4200',
    viewport: { width: 1536, height: 1024 },
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  outputDir: '.e2e-results',
});
