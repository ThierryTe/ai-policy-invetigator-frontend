/** Read-only walkthrough of an EXISTING investigation. No mocked results or model calls. */
import { test, expect, Page, BrowserContext, Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, statSync, rmSync, readdirSync, renameSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const env = process.env;
const out = resolve('demo-artifacts');
const sessionKey = 'ai-policy-investigator.session';
const privacyCss = '.account-details,.account .avatar,.history small{visibility:hidden!important}';
const narration = [
  ['Product and workspace', 12, 'AI Policy Investigator helps teams understand what a policy change sets in motion. Built for the Meta Global AI Developer Hackathon 2026, it brings policy requirements, operational procedures, and source evidence into one investigation workspace.'],
  ['Completed investigation and metrics', 14, 'This is an existing, completed synthetic investigation. Eight rules were analyzed, with five potential conflicts and two missing requirements. The hundred percent figure measures source evidence coverage. It is not a measure of AI accuracy, and it does not replace a reviewer’s judgment.'],
  ['Access and training contradiction', 22, 'Let’s examine a potential contradiction involving system access and security awareness training. The selected finding shows its severity and classification alongside the AI explanation. The policy and procedure describe incompatible conditions for access. Meta Muse Spark supplies the analysis; the reviewer can inspect the reasoning before deciding whether the issue is valid.'],
  ['Suggested action and human oversight', 14, 'The suggested action proposes how to align the procedure with the changed policy. This is a proposal for human review. It has not been automatically approved or applied. The explanation, source context, and operational consequences all remain available to the person responsible for the decision.'],
  ['Finding evidence', 16, 'The Evidence tab exposes the passages supporting this finding. We can compare the policy language with the procedure language directly. Each reference is a route back to the stored source, so a reviewer can challenge an interpretation instead of relying on an unsupported summary.'],
  ['Verified source traceability', 14, 'Opening a verified source shows the original excerpt, its immutable document version, and page reference. Traceability lets the reviewer check the actual wording. A matching quotation establishes correspondence with the document; it does not establish that the AI’s interpretation is correct.'],
  ['Impact and applicability', 12, 'The Impact tab explains scope and applicability, and identifies related procedure requirements. This helps answer a practical question: which operational requirements are connected to this policy issue, and why should this team review them?'],
  ['Expanded impact graph', 10, 'The impact graph places policies, procedures, requirements, and findings in a single view. Expanding it and fitting it to the screen makes the investigation’s full set of stored relationships visible.'],
  ['Focused finding relationships', 22, 'Focusing the selected finding reduces the graph to its connected evidence and requirements. The color legend distinguishes document types from requirements and findings. We can move from the broad investigation to the relationship that needs attention, keeping the policy change and the affected procedure in context. These connections support investigation; they do not represent automatic approval of the finding.'],
  ['Missing requirement', 15, 'The same investigation also identifies missing requirements. Here, the explanation describes a policy obligation that was not identified in the selected procedure’s scope. That is a prompt for a reviewer to check whether the procedure needs updating, or whether important context exists elsewhere.'],
  ['Missing requirement evidence', 11, 'Its evidence remains inspectable too. Reviewers can distinguish an explicit contradiction from an obligation that appears to be absent, using the cited source material and the stated limits of the analysis.'],
  ['Versioned source documents', 10, 'The document library provides the source policies and procedures with immutable version history. This keeps the investigation anchored to specific document versions, so a later revision does not silently change the evidence behind an earlier result.'],
  ['Closing workspace', 8, 'AI Policy Investigator connects policy changes to potential operational impact, with source traceability and human oversight. The outcome is a clearer starting point for review and action.'],
] as const;

function stamp(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

test('record existing investigation for the hackathon', async ({ playwright }, testInfo) => {
  test.setTimeout(600_000);
  // Do not let the normal E2E suite trigger this recording inadvertently.
  test.skip(env['DEMO_RECORD'] !== '1' && env['DEMO_DISCOVER_ONLY'] !== '1', 'Explicit opt-in recording.');
  mkdirSync(out, { recursive: true });
  const configuredUrl = env['DEMO_INVESTIGATION_URL'];
  const baseURL = env['DEMO_BASE_URL'] || env['E2E_BASE_URL'] || (configuredUrl && new URL(configuredUrl).origin);
  const id = env['DEMO_INVESTIGATION_ID'] || configuredUrl?.match(/\/investigations\/([\da-f-]{36})/i)?.[1];
  if (!baseURL || !id || !/^[\da-f-]{36}$/i.test(id)) {
    writeFileSync(join(out, 'recording-status.json'), JSON.stringify({ status: 'blocked',
      videoCreated: false, blocker: 'Missing production investigation URL and authorized production credentials/session.',
      fix: 'Set DEMO_INVESTIGATION_URL and DEMO_CREDENTIALS_FILE (private JSON file), then rerun the README command.' }, null, 2) + '\n');
    throw new Error('Set DEMO_BASE_URL and DEMO_INVESTIGATION_ID, or DEMO_INVESTIGATION_URL, to the existing completed investigation.');
  }
  const origin = new URL(baseURL).origin;
  const investigationPath = `/investigations/${id}`;
  const sourceLabel = env['DEMO_SOURCE_LABEL'] || (/localhost|127\.0\.0\.1/.test(origin) ? 'Local preview; not production' : 'Existing deployed application');
  const credentialsPath = env['DEMO_CREDENTIALS_FILE'] || (env['E2E_DATA_DIR'] && join(env['E2E_DATA_DIR'], 'credentials.json'));
  const credentials = credentialsPath ? JSON.parse(readFileSync(credentialsPath, 'utf8')) : null;
  const email = credentials && (credentials.email || credentials[env['DEMO_ACCOUNT'] || 'viewer'] || credentials.actor);
  const password = credentials?.password;
  const browser = await playwright.chromium.launch({
    channel: testInfo.project.use.channel || 'chromium', headless: true, timeout: 30_000,
  });
  const blockedWrites: string[] = [];
  const configure = async (context: BrowserContext) => {
    context.setDefaultTimeout(15_000);
    context.setDefaultNavigationTimeout(30_000);
    // Never fulfill requests with substitute data. This guard only rejects writes.
    await context.route('**/*', async route => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.origin === origin && url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method())) {
        if (!(url.pathname === '/api/auth/login' && req.method() === 'POST')) {
          blockedWrites.push(`${req.method()} ${url.pathname}`);
          return route.abort('blockedbyclient');
        }
      }
      await route.continue();
    });
    await context.addInitScript(({ css, zoom }) => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.append(style);
        document.body.style.zoom = zoom;
      });
    }, { css: privacyCss, zoom: env['DEMO_ZOOM'] || '1.15' });
  };
  const authenticate = async (page: Page) => {
    await page.goto(investigationPath, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Sign out', exact: true }).or(page.getByLabel('Work email'))).toBeVisible();
    if (await page.getByLabel('Work email').isVisible()) {
      if (!email || !password) throw new Error('No authorized session. Set DEMO_CREDENTIALS_FILE to a private JSON file containing email and password, or use DEMO_STORAGE_STATE and DEMO_SESSION_FILE.');
      await page.getByLabel('Work email').fill(email);
      await page.getByLabel('Password', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    }
    await expect(page.locator('.investigation-status .badge')).toHaveText('Completed', { timeout: 30_000 });
    await expect(page.locator('.graph-node').first()).toBeVisible();
    await expect(page.locator('.excerpt').first()).toBeVisible();
  };
  const prep = await browser.newContext({
    baseURL: origin, viewport: { width: 1920, height: 1080 },
    ...(env['DEMO_STORAGE_STATE'] ? { storageState: env['DEMO_STORAGE_STATE'] } : {}),
  });
  await configure(prep);
  if (env['DEMO_SESSION_FILE']) {
    const session = JSON.parse(readFileSync(env['DEMO_SESSION_FILE'], 'utf8'));
    await prep.addInitScript(({ origin, session, key }) => {
      if (location.origin === origin) sessionStorage.setItem(key, typeof session === 'string' ? session : JSON.stringify(session));
    }, { origin, session, key: sessionKey });
  }
  const probe = await prep.newPage();
  let findings: any;
  let graph: any;
  probe.on('response', async response => {
    const path = new URL(response.url()).pathname;
    if (!response.ok()) return;
    if (path === `/api/investigations/${id}/findings`) findings = await response.json();
    if (path === `/api/investigations/${id}/graph`) graph = await response.json();
  });
  try {
    await authenticate(probe);
    await expect.poll(() => !!findings && !!graph).toBe(true);
    const assessments = findings.payload.assessments as any[];
    const metrics = await probe.locator('.panel.kpi').allTextContents();
    const metricValues = await probe.locator('.panel.kpi strong').allTextContents();
    // Score actual persisted findings; never supply replacement results.
    const contradiction = assessments.filter(f => f.classification === 'CONTRADICTION').sort((a, b) => {
      const score = (f: any) => (/train|awareness/i.test(f.rationale) ? 2 : 0) + (/access/i.test(f.rationale) ? 2 : 0) + (f.severity === 'HIGH' ? 1 : 0);
      return score(b) - score(a);
    })[0];
    const missing = assessments.find(f => f.classification === 'MISSING_REQUIREMENT');
    if (!contradiction) throw new Error('The specified investigation has no accessible contradiction to demonstrate.');
    const choose = async (page: Page, finding: any) => {
      await page.getByLabel('Findings', { exact: true }).selectOption(finding.classification);
      const peers = assessments.filter(f => f.classification === finding.classification);
      const index = peers.findIndex(f => f.id === finding.id);
      const pager = page.locator('app-finding-panel .finding-pager > span');
      // A retained selection may start at any peer. Navigate with real controls.
      for (let attempt = 0; attempt <= peers.length; attempt++) {
        const heading = await page.locator('app-finding-panel .finding-heading').innerText();
        if (heading.includes(finding.id.slice(0, 8))) break;
        const current = Number((await pager.innerText()).match(/^\d+/)?.[0]) - 1;
        await page.getByRole('button', { name: current < index ? 'Next finding' : 'Previous finding', exact: true }).click();
      }
      await expect(page.locator('app-finding-panel .finding-heading')).toContainText(finding.id.slice(0, 8));
      await expect(page.locator('.excerpt').first()).toBeVisible();
    };
    await choose(probe, contradiction);
    const optional: Record<string, boolean> = {
      evidence: await probe.getByRole('tab', { name: /^Evidence/ }).count() > 0,
      impact: await probe.getByRole('tab', { name: 'Impact', exact: true }).count() > 0,
      expandGraph: await probe.getByRole('button', { name: 'Expand graph', exact: true }).count() > 0,
      fitGraph: await probe.getByRole('button', { name: 'Fit to view', exact: true }).count() > 0,
      focusGraph: await probe.getByRole('button', { name: 'Focus finding', exact: true }).count() > 0,
      missing: !!missing,
      source: false, policies: false,
    };
    if (optional.evidence) {
      await probe.getByRole('tab', { name: /^Evidence/ }).click();
      optional.source = await probe.getByRole('button', { name: /Open verified source/ }).count() > 0;
      if (optional.source) {
        await probe.getByRole('button', { name: /Open verified source/ }).first().click();
        await expect(probe.locator('.source-excerpt')).toBeVisible();
        await probe.goBack();
        await expect(probe.locator('.investigation-status .badge')).toHaveText('Completed');
      }
    }
    const policy = graph.nodes.find((n: any) => n.type === 'REPLACEMENT');
    let policyButtonName: string | null = null;
    await probe.getByRole('link', { name: 'Policies', exact: true }).click();
    await expect(probe.locator('.loading-bar')).toHaveCount(0);
    const candidates = probe.locator('tbody button.link-button');
    for (let i = 0; i < await candidates.count(); i++) {
      const text = (await candidates.nth(i).innerText()).trim();
      if (text && (policy?.label?.includes(text) || text.includes(policy?.label))) { policyButtonName = text; break; }
    }
    if (policyButtonName) {
      await probe.getByRole('button', { name: policyButtonName, exact: true }).click();
      await expect(probe.locator('.loading-bar')).toHaveCount(0);
      optional.policies = await probe.getByText(/^Version \d+$/, { exact: true }).count() > 0;
    }
    await probe.goBack();
    await expect(probe.locator('.investigation-status .badge')).toHaveText('Completed');
    await choose(probe, contradiction);
    await probe.screenshot({ path: join(out, 'preflight.png') });
    const safeDiscovery = {
      source: sourceLabel, baseURL: origin, investigationId: id, metrics: metrics.map(s => s.replace(/\s+/g, ' ').trim()),
      findings: assessments.map(f => ({ id: f.id, classification: f.classification, severity: f.severity, rationale: f.rationale, suggestedAction: f.suggestedAction, scopeExplanation: f.scopeExplanation })),
      chosenContradiction: contradiction.id, chosenMissing: missing?.id,
      optional, policyButtonName,
      graph: { nodes: graph.nodes.length, links: graph.edges.length },
      omissions: ['Evaluations: no live evaluation feed implemented.', 'No new investigation, uploads, consent changes, or review actions.'],
    };
    writeFileSync(join(out, 'feature-discovery.json'), JSON.stringify(safeDiscovery, null, 2) + '\n');
    console.log(JSON.stringify({ metrics: safeDiscovery.metrics, optional, graph: safeDiscovery.graph, source: sourceLabel }));
    if (env['DEMO_DISCOVER_ONLY'] === '1') return;
    expect(metricValues.map(s => s.trim()), 'Use the requested existing 8/5/2 investigation; never narrate unverified numbers').toEqual(['8', '5', '2', '100%']);
    // Preflight the encoder before spending three minutes recording.
    const cache = env['PLAYWRIGHT_BROWSERS_PATH'] || join(env['HOME']!, 'Library/Caches/ms-playwright');
    const bundled = readdirSync(cache).filter(n => n.startsWith('ffmpeg-')).sort().reverse()
      .map(n => join(cache, n, process.platform === 'darwin' ? 'ffmpeg-mac' : 'ffmpeg-linux'));
    const encoder = env['DEMO_FFMPEG'] || bundled[0] || 'ffmpeg';
    if (spawnSync(encoder, ['-version'], { encoding: 'utf8' }).status !== 0) throw new Error('No usable ffmpeg. Set DEMO_FFMPEG to the Playwright bundled encoder.');
    const privateDir = mkdtempSync(join(tmpdir(), 'ai-policy-demo-'));
    const session = await probe.evaluate(key => sessionStorage.getItem(key), sessionKey);
    const recorded = await browser.newContext({
      baseURL: origin, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
      storageState: await prep.storageState(),
      recordVideo: { dir: privateDir, size: { width: 1920, height: 1080 } },
    });
    await configure(recorded);
    if (session) await recorded.addInitScript(({ origin, session, key }) => {
      if (location.origin === origin) sessionStorage.setItem(key, session);
    }, { origin, session, key: sessionKey });
    const pageBirth = performance.now();
    const page = await recorded.newPage();
    const video = page.video()!;
    const scenes: { title: string; at: number; duration: number; voiceover: string; detail?: string }[] = [];
    const omissions = [...safeDiscovery.omissions];
    let sceneStart = 0;
    let trimStart = 0;
    const visible = async (locator: Locator) => locator.scrollIntoViewIfNeeded();
    const top = async () => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    const tab = async (name: string | RegExp) => {
      const target = page.getByRole('tab', { name, exact: typeof name === 'string' });
      await target.click();
      await visible(page.locator('app-finding-panel'));
    };
    const scene = async (index: number, action: () => Promise<void>, detail?: string) => {
      const [title, duration, originalVoiceover] = narration[index];
      const fallback: Record<number, string> = {};
      if (!optional.source) fallback[5] = 'The investigation also shows the verified source excerpts beside the related documents. Reviewers can compare the actual policy and procedure wording. Source correspondence is distinct from the correctness of an AI interpretation.';
      if (!optional.impact) fallback[6] = 'The selected finding remains connected to the investigation’s policy and procedure context. Reviewers can inspect its explanation and cited sources before deciding what requires action.';
      if (!missing) {
        fallback[9] = 'This deployment does not expose an accessible missing-requirement finding in this view. We stay with the available finding and its explanation. Reviewers should check the scope of the selected documents before deciding what needs to change.';
        fallback[10] = 'The available evidence remains open to inspection. Reviewers can use the cited passages to challenge the finding and check whether the suggested action fits the operational context.';
      }
      if (!optional.policies) fallback[11] = 'Related documents keep the finding connected to its cited source versions and pages. Reviewers can return to this context while assessing the proposed action.';
      if (!optional.expandGraph) fallback[7] = 'The impact graph connects the investigation’s policies, procedures, requirements, and findings. Its color legend distinguishes the types of persisted nodes and relationships.';
      if (!optional.focusGraph) fallback[8] = 'The graph shows the stored relationships between document versions, requirements, and findings. The color legend helps distinguish each type. Reviewers can follow a policy change to an affected procedure and inspect the finding in that context. These links support investigation and human judgment.';
      const voiceover = fallback[index] || originalVoiceover;
      const started = performance.now();
      scenes.push({ title, at: (started - sceneStart) / 1000, duration, voiceover, detail });
      console.log(`Scene ${stamp((started - sceneStart) / 1000)}: ${title}`);
      await action();
      const remaining = duration * 1000 - (performance.now() - started);
      if (remaining < -2500) throw new Error(`Scene exceeded its time budget: ${title}`);
      await page.waitForTimeout(Math.max(0, remaining));
    };
    try {
      await authenticate(page);
      await choose(page, contradiction);
      await top();
      await page.mouse.move(1880, 1040);
      await page.waitForTimeout(700);
      trimStart = (performance.now() - pageBirth) / 1000;
      sceneStart = performance.now();
      await scene(0, async () => {});
      await scene(1, async () => {
        for (const kpi of await page.locator('.panel.kpi').all()) { await kpi.hover(); await page.waitForTimeout(800); }
        await page.mouse.move(1880, 1040);
      });
      await scene(2, async () => { await visible(page.locator('app-finding-panel .finding-heading')); await tab('Overview'); });
      await scene(3, async () => { await visible(page.locator('app-finding-panel .suggestion')); });
      await scene(4, async () => {
        if (optional.evidence) await tab(/^Evidence/);
        else { omissions.push('Finding Evidence tab unavailable.'); await visible(page.locator('.evidence-list')); }
      });
      await scene(5, async () => {
        if (optional.source) {
          await page.getByRole('button', { name: /Open verified source/ }).first().click();
          await expect(page.locator('.source-excerpt')).toBeVisible();
          await top();
        } else { omissions.push('Verified source deep link unavailable.'); await visible(page.locator('.excerpt').first()); }
      });
      await scene(6, async () => {
        if (optional.source) { await page.goBack(); await expect(page.locator('.investigation-status .badge')).toHaveText('Completed'); await choose(page, contradiction); }
        if (optional.impact) await tab('Impact');
        else omissions.push('Impact tab unavailable.');
      });
      await scene(7, async () => {
        await visible(page.locator('app-impact-graph'));
        if (optional.expandGraph) await page.getByRole('button', { name: 'Expand graph', exact: true }).click();
        if (optional.fitGraph) await page.getByRole('button', { name: 'Fit to view', exact: true }).click();
      });
      await scene(8, async () => {
        if (optional.focusGraph) await page.getByRole('button', { name: 'Focus finding', exact: true }).click();
        if (optional.fitGraph) await page.getByRole('button', { name: 'Fit to view', exact: true }).click();
        await page.locator('.graph-node.selected').hover();
        await page.waitForTimeout(1500);
        await page.mouse.move(1880, 1040);
      });
      await scene(9, async () => {
        if (optional.expandGraph) await page.getByRole('button', { name: 'Collapse graph', exact: true }).click();
        if (missing) { await choose(page, missing); await tab('Overview'); }
        else { omissions.push('No accessible missing-requirement finding.'); await tab('Overview'); }
      });
      await scene(10, async () => { if (optional.evidence) await tab(/^Evidence/); });
      await scene(11, async () => {
        if (optional.policies && policyButtonName) {
          await page.getByRole('link', { name: 'Policies', exact: true }).click();
          await page.getByRole('button', { name: policyButtonName, exact: true }).click();
          await expect(page.getByText(/^Version \d+$/, { exact: true }).first()).toBeVisible();
          await top();
        } else { omissions.push('Populated source policy version history unavailable.'); await visible(page.locator('.related-documents')); }
      });
      await scene(12, async () => {
        if (optional.policies) { await page.goBack(); await expect(page.locator('.investigation-status .badge')).toHaveText('Completed'); }
        await choose(page, contradiction);
        await tab('Overview');
        if (await page.getByRole('button', { name: 'Full graph', exact: true }).count()) await page.getByRole('button', { name: 'Full graph', exact: true }).click();
        await top();
        await page.mouse.move(1880, 1040);
      });
      await page.screenshot({ path: join(out, 'closing-frame.png') });
      expect(blockedWrites, 'Recording must never attempt a production write').toEqual([]);
      await recorded.close();
      const raw = await video.path();
      // Remove only the private setup lead-in; the 180-second walkthrough has no cuts.
      const target = join(privateDir, 'verified-demo.webm');
      const result = spawnSync(encoder, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', trimStart.toFixed(3), '-i', raw,
        '-t', '180', '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30', '-cpu-used', '5', '-row-mt', '1', target], { encoding: 'utf8', timeout: 180_000 });
      if (result.status !== 0) throw new Error(`Video encoder failed: ${result.stderr?.slice(-500)}`);
      const info = spawnSync(encoder, ['-hide_banner', '-i', target], { encoding: 'utf8' });
      const match = info.stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (!match) throw new Error('Cannot verify video duration.');
      const duration = +match[1] * 3600 + +match[2] * 60 + +match[3];
      expect(duration).toBeGreaterThanOrEqual(179);
      expect(duration).toBeLessThanOrEqual(181);
      expect(info.stderr).toContain('1920x1080');
      const finalVideo = join(out, 'ai-policy-investigator-demo.webm');
      renameSync(target, finalVideo);
      const metadata = { source: sourceLabel, baseURL: origin, investigationId: id, recordedAt: new Date().toISOString(),
        durationSeconds: duration, width: 1920, height: 1080, bytes: statSync(finalVideo).size,
        continuous: true, editing: 'Only setup lead-in and trailing setup time trimmed; no internal cuts.',
        audio: 'Silent screen recording; aligned English narration in demo-voiceover.md.', blockedWrites, omissions, scenes };
      writeFileSync(join(out, 'recording-metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
      writeFileSync(join(out, 'recording-status.json'), JSON.stringify({ status: 'complete', videoCreated: true, durationSeconds: duration }, null, 2) + '\n');
      writeFileSync(join(out, 'demo-timeline.md'), `# AI Policy Investigator demo\n\nSource: ${sourceLabel}. Recorded ${metadata.recordedAt}.\n\nActual video: ${duration.toFixed(2)} seconds, 1920 × 1080, continuous.\n\n| Time | Screen |\n| --- | --- |\n` + scenes.map(s => `| ${stamp(s.at)}–${stamp(s.at + s.duration)} | ${s.title} |`).join('\n') + '\n\nOmissions:\n\n' + omissions.map(s => `- ${s}`).join('\n') + '\n');
      writeFileSync(join(out, 'demo-voiceover.md'), `# English narration\n\nRead at approximately 145 words per minute, allowing the indicated pauses. The WebM is silent.\n\nSource: ${sourceLabel}. Existing synthetic investigation; no new inference or production edits.\n\n` + scenes.map(s => `## ${stamp(s.at)}–${stamp(s.at + s.duration)} · ${s.title}\n\n${s.voiceover}\n`).join('\n'));
      console.log(`Verified video: ${finalVideo} (${duration.toFixed(2)} seconds, ${metadata.bytes} bytes, 1920x1080)`);
    } finally {
      await recorded.close().catch(() => {});
      rmSync(privateDir, { recursive: true, force: true });
    }
  } finally {
    await prep.close();
    await browser.close();
  }
});
