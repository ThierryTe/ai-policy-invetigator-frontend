import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const directory = process.env['E2E_DATA_DIR'];
test.skip(
  !directory,
  'Needs the synthetic fixture accounts and a completed browser-verification.json.',
);
test('production styles, desktop/mobile layout and CSP permit authorized PDF viewing', async ({
  page,
}) => {
  const data = JSON.parse(readFileSync(resolve(directory!, 'credentials.json'), 'utf8'));
  const result = JSON.parse(readFileSync('docs/browser-verification.json', 'utf8'));
  const violations: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.name));
  await page.addInitScript(() => {
    (window as any).__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as any).__cspViolations.push(e.violatedDirective),
    );
  });
  await page.goto('/investigations/' + result.investigationId);
  await page.getByLabel('Work email').fill(data.actor);
  await page.getByLabel('Password', { exact: true }).fill(data.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.investigation-status .badge')).toHaveText('Completed');
  await expect
    .poll(() =>
      page
        .locator('.panel.kpi')
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundColor),
    )
    .toBe('rgb(255, 255, 255)');
  await expect
    .poll(() =>
      page
        .locator('.page-heading .button.primary')
        .evaluate((e) => getComputedStyle(e).backgroundColor),
    )
    .toBe('rgb(9, 90, 235)');
  await expect.poll(() => page.locator('.excerpt').count()).toBeGreaterThanOrEqual(2);
  await page.screenshot({
    path: 'docs/screenshots/desktop-real-investigation.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'View PDF', exact: true }).first().click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'docs/screenshots/pdf-real-source.png' });
  await page.getByRole('button', { name: 'Close PDF' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'docs/screenshots/mobile-real-investigation.png', fullPage: true });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(page.getByRole('link', { name: 'Policies', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Evaluations', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No evaluation feed is available' }),
  ).toBeVisible();
  violations.push(...(await page.evaluate(() => (window as any).__cspViolations)));
  expect(violations).toEqual([]);
  expect(pageErrors).toEqual([]);
  writeFileSync(
    'docs/visual-verification.json',
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        baseUrl: process.env['E2E_BASE_URL'] || 'http://127.0.0.1:4200',
        desktop: { width: 1536, height: 1024 },
        mobile: { width: 390, height: 844, horizontalOverflow: false },
        globalStylesApplied: true,
        pdfBlobViewer: true,
        cspViolations: violations,
        pageErrors,
        screenshots: [
          'screenshots/desktop-real-investigation.png',
          'screenshots/mobile-real-investigation.png',
          'screenshots/pdf-real-source.png',
        ],
      },
      null,
      2,
    ) + '\n',
  );
});
