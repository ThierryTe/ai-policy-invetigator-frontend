import { expect, Page, test } from '@playwright/test';

const origin = 'http://127.0.0.1:4300';
const sessionKey = 'ai-policy-investigator.session';
const sharedSource = '00000000-0000-4000-8000-000000000001';
const privateSource = '00000000-0000-4000-8000-000000000002';
async function login(page: Page) {
  await page.getByLabel('Work email').fill('judge@test.invalid');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}
function expectLoginDestination(page: Page, destination: string) {
  const url = new URL(page.url());
  expect(url.pathname).toBe('/login');
  expect(url.searchParams.get('returnUrl')).toBe(destination);
}

const identity = {
  user: { id: 'synthetic-judge', organizationId: 'synthetic-org', email: 'judge@test.invalid' },
  memberships: [{ department_id: 'shared', department_name: 'Shared', role: 'VIEWER' }],
};

test.beforeEach(async ({ context }) => {
  // This suite uses synthetic responses only; no backend or external service is contacted.
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/api/auth/login')
      return route.fulfill({
        json: { token: 'synthetic-token', expiresIn: 900, tokenType: 'Bearer' },
      });
    if (route.request().headers()['authorization'] !== 'Bearer synthetic-token')
      return route.fulfill({ status: 401, json: {} });
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: identity });
    if (url.pathname === '/api/policies') return route.fulfill({ json: [] });
    if (url.pathname === '/api/evidence/' + sharedSource)
      return route.fulfill({
        json: {
          id: sharedSource,
          policy_id: 'synthetic-shared-policy',
          version_id: sharedSource,
          page_number: 2,
          start_offset: 0,
          end_offset: 25,
          excerpt: 'Synthetic shared evidence.',
        },
      });
    if (url.pathname === '/api/evidence/' + privateSource)
      return route.fulfill({ status: 403, json: {} });
    return route.fulfill({ status: 404, json: {} });
  });
});

test('refresh restores a verified judge session and preserves the complete protected URL', async ({
  page,
}) => {
  const destination = '/settings?tab=access&filter=private%20department#memberships';
  await page.goto(destination);
  await login(page);
  await expect(page.getByRole('heading', { name: 'Workspace access' })).toBeVisible();
  await expect(page).toHaveURL(origin + destination);
  const authenticationRequests: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/auth/')) authenticationRequests.push(path);
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Workspace access' })).toBeVisible();
  await expect(page).toHaveURL(origin + destination);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toHaveCount(0);
  expect(authenticationRequests).toEqual(['/api/auth/me']);
  await page.getByRole('link', { name: 'Policies', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Upload policy', exact: true })).toHaveCount(0);
  expect(authenticationRequests).toEqual(['/api/auth/me']);
});

test('direct protected navigation redirects to login and returns after reauthentication', async ({
  page,
}) => {
  const destination = '/investigations/00000000-0000-4000-8000-000000000003?view=sources#finding';
  await page.goto(destination);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expectLoginDestination(page, destination);
  await login(page);
  await expect(page).toHaveURL(origin + destination);
  await expect(page.getByRole('heading', { name: 'Investigation unavailable' })).toBeVisible();
});

test('expired stored sessions skip verification and preserve the intended return URL', async ({
  page,
}) => {
  await page.goto('/login');
  await page.evaluate(
    (key) =>
      sessionStorage.setItem(
        key,
        JSON.stringify({
          token: 'synthetic-token',
          expiresAt: Date.now() - 1000,
        }),
      ),
    sessionKey,
  );
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) requests.push(new URL(r.url()).pathname);
  });
  const destination = '/evidence?source=' + sharedSource + '#citation';
  await page.goto(destination);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expectLoginDestination(page, destination);
  expect(requests).toEqual([]);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull();
  await login(page);
  await expect(page).toHaveURL(origin + destination);
  await expect(page.locator('.source-excerpt')).toHaveText('Synthetic shared evidence.');
});

test('startup waits for identity verification before showing protected content or login', async ({
  page,
}) => {
  await page.goto('/settings?tab=access');
  await login(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/me', async (route) => {
    await pending;
    await route.fulfill({ json: identity });
  });
  const verifying = page.waitForRequest('**/api/auth/me');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await verifying;
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
  release();
  await expect(page.getByRole('heading', { name: 'Workspace access' })).toBeVisible();
  await expect(page).toHaveURL(origin + '/settings?tab=access');
});

test('server-rejected restoration redirects once and allows reauthentication', async ({ page }) => {
  const destination = '/settings?tab=access#membership';
  await page.goto(destination);
  await login(page);
  let verifications = 0;
  await page.route('**/api/auth/me', async (route) => {
    verifications++;
    await route.fulfill({ status: 401, json: {} });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expectLoginDestination(page, destination);
  expect(verifications).toBe(1);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull();
  await page.unroute('**/api/auth/me');
  await login(page);
  await expect(page).toHaveURL(origin + destination);
});

test('explicit logout clears storage and private query text, including after refresh and Back', async ({
  page,
}) => {
  await page.goto('/policies?q=previous-user-private-title#source');
  await login(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expectLoginDestination(page, '/policies');
  await expect(page).not.toHaveURL(/previous-user-private-title|#source/);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
});

test('restored judges can read shared evidence while private department denial keeps the session', async ({
  page,
}) => {
  const destination = '/evidence?source=' + sharedSource;
  await page.goto(destination);
  await login(page);
  await page.reload();
  await expect(page.locator('.source-excerpt')).toHaveText('Synthetic shared evidence.');
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0);
  await page.goto('/evidence?source=' + privateSource);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.source-excerpt')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page).toHaveURL(origin + '/evidence?source=' + privateSource);
});

test('external and recursive return URLs fall back safely after login', async ({ page }) => {
  await page.goto('/login?returnUrl=' + encodeURIComponent('//third-party.invalid'));
  await login(page);
  await expect(page).toHaveURL(origin + '/overview');
  await page.goto('/login?returnUrl=' + encodeURIComponent('/login?returnUrl=/login'));
  await expect(page).toHaveURL(origin + '/overview');
});
