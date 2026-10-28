# Reproducible real policy-impact demo

This is the existing training/access scenario, not a prerecorded response or fixture
finding. The backend runs real `muse-spark-1.3`; requirements, findings and citations
are persisted and verified under normal JWT/current document authorization.

## Manual demonstration using the existing demo login

1. Start the backend using its existing Compose instructions. Its `MODEL_API_KEY`
   must be privately configured; the pinned local embedding files use its existing
   automatic volume bootstrap. No deployment configuration change is required.
2. Follow the backend's `docs/DEMO.md`: explicitly run `scripts/setup_demo.py` with
   `APP_ENVIRONMENT=local`, `DEMO_USER_ENABLED=true` and private `DEMO_PASSWORD`.
   It provisions `demo@policy-investigator.local` and exports the existing golden
   PDFs to the backend's `.local/demo/pdfs`; it does not call Meta or set consent.
3. Start this frontend normally with `npm start` (http://127.0.0.1:4200), or use its
   existing Docker deployment (http://127.0.0.1:18081). Sign in with the backend demo
   user and the privately configured password. Never put a password into source,
   command-line arguments or screenshots.
4. In Policies, upload `01-security-baseline.pdf` as a Security policy effective
   2026-10-26. Use a distinct document title for each deliberate repeat of this demo.
   Wait for indexing and explicitly allow external processing.
5. Upload `02-security-replacement.pdf` as its next immutable version, effective
   2026-10-27. The new policy requires training **before sensitive production access**;
   the baseline allowed training within 30 days after access.
6. Upload `03-hr-conflicting.pdf` and `04-hr-compatible.pdf` as two HR procedures
   effective 2026-10-26, wait for indexing and explicitly allow external processing.
   The conflicting procedure grants day-one sensitive access and permits training
   within 30 days. The control withholds sensitive access until training is complete.
7. Start an investigation with policy versions 1/2, both procedure versions and
   analysis date 2026-10-27 or later. Watch the actual persisted progress. Provider
   errors or incomplete output are not a successful NO_CONFLICT outcome.
8. Inspect the actual contradiction and its policy/HR page references. Open the
   original PDFs, then confirm, note and dismiss a finding to demonstrate retained
   audit history and immutable original AI output.
9. The graph initially shows the full persisted scope fitted inside its viewport.
   Use Focus finding, Expand or 100% to read nodes at the original size; Fit to view
   recalculates the overview. Selection, node positions and edge semantics are unchanged.
10. Open Overview in the same session: its known investigation ID is shown only after
    the existing progress API confirms current access. Keep the shared investigation
    URL for later sessions. There is no server list/history endpoint, and no route
    was invented to discover earlier investigations.

No finding, classification, evidence or KPI is hardcoded by these steps. Synthetic
input texts are the existing backend `evaluation/phase3-golden.json` material.
The expected labels are evaluation assertions, not responses served to the browser.
Human review remains necessary; this small scenario does not estimate general accuracy.

## Repeatable browser verification

Against the dedicated local backend only, prepare a fresh isolated synthetic
organization before each full run. This existing test helper stores credentials
privately in ignored `.e2e-data`, without printing them. It does not alter the ordinary
demo user. The browser test then performs real uploads, consent, inference and reviews:

```sh
npm ci
npx playwright install chromium
python3 scripts/prepare_browser_fixture.py --backend /path/to/backend
# In another terminal, keep the existing frontend dev server running:
npm start
# Then run in this frontend checkout:
E2E_DATA_DIR="$PWD/.e2e-data" E2E_BASE_URL=http://127.0.0.1:4200 \
  E2E_REPORT_PATH=docs/focused-demo-verification.json npx playwright test e2e/workflow.spec.ts
```

Use the actual frontend URL if its existing Docker deployment is used instead.
The full run is explicit, makes real provider requests and is not part of `npm test`.
The test asserts every rendered node is within the viewport on desktop/mobile,
checks Focus/Expand/Fit/100% controls, reopens the current-session Overview entry,
and verifies every finding citation via the normal authenticated evidence API.

The fixture organization owns the recorded test investigation. To inspect that
specific run manually, use its private fixture account; another organization's demo
login must be denied access. Afterward the existing fixture helper's `--cleanup`
option disables only its synthetic browser accounts while retaining immutable evidence.

## Actual focused verification, October 28, 2026

The run in [focused-demo-verification.json](focused-demo-verification.json) completed
through the isolated local preview, with the real backend and no intercepted/mocked
API responses. It found CONTRADICTION and NO_CONFLICT; all eight published finding
citation instances matched stored chunks, including page/version references.
Reported provider usage: five calls, 6,589 prompt tokens, 9,417 completion tokens,
40,605 ms summed metered provider latency. The full browser test passed in 60.0 seconds.

See [desktop](screenshots/desktop-fitted-investigation.png) and
[mobile](screenshots/mobile-fitted-investigation.png) screenshots. They contain only
synthetic documents and genuine results; real content may need a reduced initial
scale to fit. The original 100% view remains available for reading.
