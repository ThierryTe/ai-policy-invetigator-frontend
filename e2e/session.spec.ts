import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const directory = process.env['E2E_DATA_DIR'];
test.skip(
  !directory,
  'Needs synthetic fixture accounts and an existing real browser investigation.',
);
test('current roles, query clearing, cross-session isolation and real network failure', async ({
  page,
  context,
}) => {
  const data = JSON.parse(readFileSync(resolve(directory!, 'credentials.json'), 'utf8'));
  const result = JSON.parse(readFileSync('docs/browser-verification.json', 'utf8'));
  const login = async (email: string) => {
    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(data.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  };
  await page.goto('/investigations/' + result.investigationId);
  await login(data.actor);
  await expect(page.locator('.investigation-status .badge')).toHaveText('Completed');
  await page
    .getByRole('textbox', { name: 'Search policy titles' })
    .fill('previous-user-private-search');
  await page.getByRole('textbox', { name: 'Search policy titles' }).press('Enter');
  await expect(page).toHaveURL(/q=previous-user-private-search/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page).not.toHaveURL(/previous-user-private-search/);
  await login(data.viewer);
  await expect(page.getByText('previous-user-private-search')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Upload policy', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Investigations', exact: true }).click();
  await page.getByLabel('Investigation ID').fill(result.investigationId);
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.locator('.investigation-status .badge')).toHaveText('Completed');
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(data.outsider);
  await expect(page.getByRole('heading', { name: 'Investigation unavailable' })).toBeVisible();
  await expect(page.locator('.excerpt')).toHaveCount(0);
  await expect(page.locator('.graph-node')).toHaveCount(0);
  await page.getByRole('link', { name: 'Policies', exact: true }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Refresh policies' }).click();
  await expect(page.getByRole('alert')).toContainText('Cannot reach the server');
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Refresh policies' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  writeFileSync(
    'docs/session-verification.json',
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        realBackend: true,
        reusedInvestigationId: result.investigationId,
        noNewInference: true,
        checks: [
          'shared deep link after verified login',
          'prior-user query cleared on logout',
          'viewer cannot upload or review',
          'cross-department graph/citation denial',
          'real offline HTTP error',
          'online retrieval recovery',
        ],
      },
      null,
      2,
    ) + '\n',
  );
});
