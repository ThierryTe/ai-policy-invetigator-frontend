/** Explicit opt-in real backend/Meta test. Never intercepts requests or supplies fake findings. */
import { test, expect, Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const directory = process.env['E2E_DATA_DIR'];
test.skip(!directory, 'Set E2E_DATA_DIR to a securely provisioned synthetic fixture directory.');
test('real PDF → Meta investigation → sources → reviews → session isolation', async ({ page }) => {
  const data = JSON.parse(readFileSync(resolve(directory!, 'credentials.json'), 'utf8'));
  let latestProgress: any = null;
  let latestFindings: any = null;
  page.on('response', async (response) => {
    if (response.status() !== 200) return;
    const path = new URL(response.url()).pathname;
    if (/^\/api\/investigations\/[0-9a-f-]+$/.test(path))
      latestProgress = await response.json().catch(() => null);
    if (/^\/api\/investigations\/[0-9a-f-]+\/findings$/.test(path))
      latestFindings = await response.json().catch(() => null);
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.name));
  const login = async (who: string) => {
    await page.getByLabel('Work email').fill(who);
    await page.getByLabel('Password', { exact: true }).fill(data.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  };
  await page.goto('/');
  await login(data.actor);
  await page.getByRole('link', { name: 'Policies', exact: true }).click();
  const securityTitle = 'Security training policy (synthetic)';
  const badTitle = 'HR access before training (synthetic)';
  const goodTitle = 'HR access gated by training (synthetic)';
  async function upload(
    kind: 'policy' | 'procedure' | 'version',
    title: string,
    file: string,
    department: string,
    date: string,
  ) {
    await page
      .getByRole('button', {
        name: kind === 'version' ? 'New version' : `Upload ${kind}`,
        exact: true,
      })
      .click();
    const modal = page.getByRole('dialog', { name: 'Upload document' });
    if (kind !== 'version') {
      await modal.getByLabel('Document title').fill(title);
      await modal.getByLabel('Owning department').selectOption(department);
    }
    await modal.getByLabel('Effective date').fill(date);
    await modal.getByLabel('PDF document').setInputFiles(resolve(directory!, file + '.pdf'));
    await modal.getByRole('button', { name: 'Upload and index', exact: true }).click();
    await expect(modal).toBeHidden({ timeout: 120000 });
    if (kind !== 'version') await page.getByRole('button', { name: title, exact: true }).click();
  }
  async function consent() {
    await page.getByRole('button', { name: 'Allow external processing', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Revoke external processing' })).toBeVisible();
  }
  await upload('policy', securityTitle, 'baseline', data.security, '2026-10-26');
  await consent();
  await upload('version', securityTitle, 'replacement', data.security, '2026-10-27');
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await upload('procedure', badTitle, 'conflicting', data.hr, '2026-10-26');
  await consent();
  await upload('procedure', goodTitle, 'compatible', data.hr, '2026-10-26');
  await consent();
  await page.getByRole('link', { name: 'Investigations', exact: true }).click();
  await page.getByRole('link', { name: 'Run investigation', exact: true }).click();
  await page.getByLabel('Policy', { exact: true }).selectOption({ label: securityTitle });
  await page.getByLabel('Analysis date').fill('2026-10-27');
  await page.getByLabel('Baseline version').selectOption({ index: 1 });
  await page.getByLabel('Replacement version').selectOption({ index: 2 });
  for (const title of [badTitle, goodTitle]) {
    await page.getByRole('checkbox', { name: new RegExp(title.replace(/[()]/g, '\\$&')) }).check();
    const versions = page.getByRole('combobox', { name: title, exact: true });
    await expect(versions.locator('option')).toHaveCount(2);
    await versions.selectOption({ index: 1 });
  }
  const created = page.waitForResponse(
    (r) => r.url().endsWith('/api/investigations') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Start investigation', exact: true }).click();
  const result = await (await created).json();
  await expect(page).toHaveURL(new RegExp('/investigations/' + result.id));
  await expect(
    page
      .getByText('Investigation in progress', { exact: true })
      .or(page.getByText('Comparing policy requirements', { exact: true })),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.investigation-status .badge')).toHaveText('Completed', {
    timeout: 270000,
  });
  await expect(page.getByRole('heading', { name: 'Selected finding', exact: true })).toBeVisible();
  await expect
    .poll(() => page.locator('.excerpt').count(), { timeout: 20000 })
    .toBeGreaterThanOrEqual(2);
  await page.getByLabel('Findings', { exact: true }).selectOption('CONTRADICTION');
  await expect(page.locator('app-finding-panel')).toContainText('Contradiction');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.locator('app-finding-panel .badge.neutral')).toHaveText('Confirmed');
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await page
    .getByLabel('Note', { exact: true })
    .fill('Synthetic browser review: source timing checked.');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add review note' })).toBeHidden();
  await page.getByRole('tab', { name: /History/ }).click();
  await expect(
    page.getByText('Synthetic browser review: source timing checked.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await expect(page.locator('app-finding-panel .badge.neutral')).toHaveText('Dismissed');
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.getByRole('button', { name: 'View PDF', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Source PDF' })).toBeVisible();
  await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
  await page.getByRole('button', { name: 'Close PDF', exact: true }).click();
  async function expectGraphFits() {
    await expect
      .poll(async () =>
        page.locator('app-impact-graph').evaluate((root) => {
          const viewport = root.querySelector('.graph-viewport')!.getBoundingClientRect();
          return [...root.querySelectorAll('.graph-node')].every((node) => {
            const box = node.getBoundingClientRect();
            return (
              box.width > 0 &&
              box.left >= viewport.left - 1 &&
              box.right <= viewport.right + 1 &&
              box.top >= viewport.top - 1 &&
              box.bottom <= viewport.bottom + 1
            );
          });
        }),
      )
      .toBe(true);
  }
  await expect(page.getByRole('button', { name: 'Fit to view', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectGraphFits();
  await page.getByRole('button', { name: 'Focus finding', exact: true }).click();
  await expectGraphFits();
  await page.getByRole('button', { name: 'Full graph', exact: true }).click();
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await expect(page.getByRole('button', { name: '100%', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Fit to view', exact: true }).click();
  await expectGraphFits();
  await page.getByRole('button', { name: 'Expand graph', exact: true }).click();
  await expectGraphFits();
  await page.getByRole('button', { name: 'Collapse graph', exact: true }).click();
  await page.getByLabel('Findings', { exact: true }).selectOption('NO_CONFLICT');
  await expect(page.locator('app-finding-panel')).toContainText('No conflict');
  await page.getByLabel('Findings', { exact: true }).selectOption('ALL');
  mkdirSync('docs/screenshots', { recursive: true });
  await page.screenshot({
    path: 'docs/screenshots/desktop-fitted-investigation.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await expectGraphFits();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: 'docs/screenshots/mobile-fitted-investigation.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1536, height: 1024 });
  // Graph nodes navigate to exact persisted source citations rather than inventing relationships.
  await page.locator('.graph-node.requirement').first().click();
  await expect(page).toHaveURL(/\/evidence\?source=/);
  await expect(page.locator('.source-excerpt')).toBeVisible();
  await page.getByRole('button', { name: 'Open source PDF' }).click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
  await page.getByRole('button', { name: 'Close PDF' }).click();
  // Overview uses only existing per-investigation reads for known current-session IDs.
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Recent investigations', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(result.id, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Open', exact: true }).click();
  await expect(page.locator('.investigation-status .badge')).toHaveText('Completed');
  // Independently verify every published citation through the normal authenticated API.
  const authenticated = await page.request.post('/api/auth/login', {
    data: { email: data.actor, password: data.password },
  });
  expect(authenticated.status()).toBe(200);
  const authorization = 'Bearer ' + (await authenticated.json()).token;
  const assessment = await page.request.get('/api/investigations/' + result.id + '/findings', {
    headers: { Authorization: authorization },
  });
  expect(assessment.status()).toBe(200);
  const published = await assessment.json();
  expect(published.model).toBe('muse-spark-1.3');
  const verifiedCitations: {
    sourceId: string;
    versionId: string;
    page: number;
    quoteMatches: boolean;
  }[] = [];
  for (const finding of published.payload.assessments) {
    const versions = new Set<string>();
    for (const reference of finding.sourceReferences) {
      const response = await page.request.get('/api/evidence/' + reference.sourceId, {
        headers: { Authorization: authorization },
      });
      expect(response.status()).toBe(200);
      const evidence = await response.json();
      expect(evidence.id).toBe(reference.sourceId);
      expect(evidence.excerpt).toContain(reference.quote);
      versions.add(evidence.version_id);
      verifiedCitations.push({
        sourceId: evidence.id,
        versionId: evidence.version_id,
        page: evidence.page_number,
        quoteMatches: true,
      });
    }
    expect(versions.has(finding.procedureVersionId)).toBe(true);
    expect(versions.size).toBeGreaterThanOrEqual(2);
  }
  const stored = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
  }));
  expect(stored.local).toEqual([]);
  expect(stored.session).toEqual(['ai-policy-investigator.session']);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.locator('.source-excerpt')).toHaveCount(0);
  await login(data.viewer);
  await page.goto('/investigations/' + result.id); // Reload revalidates the tab-scoped session.
  await expect(page.locator('.investigation-status .badge')).toHaveText('Completed');
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await login(data.outsider);
  await expect(page.getByRole('heading', { name: 'Investigation unavailable' })).toBeVisible();
  await expect(page.locator('.graph-node')).toHaveCount(0);
  await expect(page.locator('.excerpt')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(latestFindings?.model).toBe('muse-spark-1.3');
  writeFileSync(
    process.env['E2E_REPORT_PATH'] || 'docs/browser-verification.json',
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        realBackend: true,
        realModel: latestFindings?.model,
        progress: latestProgress,
        classifications: latestFindings?.payload?.assessments?.map((f: any) => f.classification),
        syntheticOnly: true,
        verifiedCitations,
        graphFitVerified: {
          desktop: true,
          mobile: true,
          fullAndFocused: true,
          expanded: true,
          originalScaleRestorable: true,
        },
        overview:
          'Current-session ID shown after current authorization recheck; no list endpoint exists',
        investigationId: result.id,
        checks: [
          'initial fit for every rendered graph node, resize, focus, expand and 100% controls',
          'authorized current-session Overview',
          'every published finding citation matched persisted source text',
          'browser login',
          'four PDF uploads',
          'immutable version history',
          'consent',
          'durable investigation polling',
          'contradiction and non-conflict',
          'verified citation retrieval',
          'graph navigation',
          'authenticated PDF blob viewer',
          'confirm/dismiss/note history',
          'desktop/mobile layouts',
          'tab-scoped session storage only',
          'logout content clearing',
          'reload revalidates the saved session',
          'viewer review controls hidden',
          'cross-department resource denial',
        ],
        consoleErrors: errors,
      },
      null,
      2,
    ) + '\n',
  );
});
