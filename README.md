# AI Policy Investigator — Angular frontend

**When a policy changes, which procedures need attention—and what is the evidence?**

Built for the **Meta Global AI Developer Hackathon 2026**, AI Policy Investigator
helps analysts trace the impact of a policy change across selected procedures.
Its Java backend uses **Meta Muse Spark (`muse-spark-1.3`)** to extract requirements,
align policy versions and assess potential conflicts. This Angular dashboard lets
reviewers follow each finding back to authorized source excerpts and original PDF
pages, then record a human decision without rewriting the AI's original assessment.

The result is an auditable starting point for policy review: potential issues come
with inspectable evidence, document permissions and review history. It is not an
automatic compliance verdict. There are no client-side model calls or fabricated
findings/KPIs.

**Source:** [Frontend](https://github.com/ThierryTe/ai-policy-invetigator-frontend) ·
[Backend](https://github.com/ThierryTe/ai-policy-invetigator)

## Judge Quickstart

1. **Follow the two-minute walkthrough:** open the backend
   [Judge quickstart](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/JUDGE_QUICKSTART.md).
   If the project owner supplies an individual judge account and a completed
   investigation link, use those private details. There is no public default
   password. Reading an existing authorized result does not start new inference.
2. **Inspect the recorded synthetic investigation:** see the screenshot below,
   [October 28 browser evidence](docs/focused-demo-verification.json) and
   [scenario and reproduction guide](docs/REAL_DEMO.md). Compare the contradiction
   with the compatible control, inspect the citations/PDFs and distinguish the
   original AI classification from the human review history.
3. **Run it locally when needed:** follow [Run locally](#run-locally).
   Presenters should use the backend's
   [judge access guide](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/JUDGE_DEMO.md)
   for private departments, read-only shared documents and bounded access.
   Fresh analysis requires explicit processing consent and can incur Meta usage.

- **Public demo URL:** **[TO BE PROVIDED — public availability is not verified]**
- **Demo video URL:** **[TO BE PROVIDED — no published video link is recorded here]**

Local screenshots, test results and source configuration do not establish a running
public deployment. The [release review](docs/AUTH_RELEASE_REVIEW.md) records the
remaining delivery gate. These placeholders are not live links.

## Recorded investigation: change → evidence → human review

The [repeatable Muse demo](docs/REAL_DEMO.md) contrasts training **before sensitive-system
access** with **day-one access and training within 30 days**, plus a compatible control
that withholds access until training. It uses synthetic PDFs, explicit processing
consent, real inference, persisted citations and human review.

![Recorded local investigation with impact graph and human review](docs/screenshots/desktop-fitted-investigation.png)

Existing [mobile](docs/screenshots/mobile-fitted-investigation.png) and
[original PDF](docs/screenshots/pdf-real-source.png) captures show genuine local results.
Analysts confirm, dismiss or annotate a finding while preserving its original AI
classification, evidence and review history. These are local demonstration screenshots,
not proof of a running public site.

The [October 28 browser run](docs/focused-demo-verification.json) found CONTRADICTION
and NO_CONFLICT and verified all eight published finding citation instances. It reported
five calls, 6,589 prompt / 9,417 completion tokens and 40,605 ms summed metered provider
latency. This is a workflow demonstration, separate from the backend evaluation.

## Implemented workflow

1. Sign in and load current identity/department memberships.
2. Upload policy/procedure PDFs and poll durable ingestion; inspect immutable
   version history and original PDFs. Add replacement versions with the latest
   predecessor; file limits and metadata are validated again by the backend.
3. An owning-department administrator explicitly allows external processing for
   each contributing document. Uploading does not imply consent.
4. Select indexed baseline/replacement versions, one to four procedure versions
   and an analysis date. The server rechecks permissions, lineage and consent.
5. Poll investigation stages; display completed, partial, failed, empty and network
   error states. Incomplete work never displays zero conflicts as a successful result.
6. Inspect classifications, source-backed explanations and suggested actions.
   The graph uses only backend-provided persisted nodes/edges; focusing filters
   those links without generating new relationships. Use keyboard/scroll controls,
   expand the graph or select a requirement to resolve its exact source.
7. Resolve authorized citations with page/version references and open source PDFs.
8. Confirm, dismiss or add a note when `canReview` permits it. History retains
   reviewer UUIDs/timestamps and prior decisions; AI output remains immutable.
9. Navigate current account memberships, evidence lookup and recent investigations
   created in this session. Shared UUID links reopen authorized investigations.

The API does **not** publish evaluation results, an investigation-history listing,
full-text global search, notification events, account display names or exported
report files. Evaluations therefore shows an honest unavailable state. Search
filters policy titles on the current paginated library page. The investigation
selector supports document pagination and keeps selected procedures across pages.
No unsupported endpoint was invented.

Judge access to a shared scenario is read-only for its documents and reviews;
private-department permissions are separate. Some shared-document version/upload
buttons use account-level visibility, but the server rejects unauthorized writes.
Use the supplied result's read controls for the judge walkthrough; see the
[judge guide](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/JUDGE_QUICKSTART.md)
for this existing interface limitation.

## Evaluation and MVP limits

The backend's ten-case real-Muse evaluation matched **6/10**, with **four processing
errors**. A separate four-case exception retry matched **3/4**, including **one false
positive** against the unchanged expected label. Across those two runs: 31 calls,
38,359 prompt / 68,141 completion tokens, 296,572 ms summed metered provider latency
and 119/119 verified source/quote instances. The retry does not replace the original
errors or establish single-run 90% accuracy. See
[evaluation and original reports](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/EVALUATION.md).

Citation matching establishes source correspondence, not correct interpretation.
Evidence coverage in the UI measures citation coverage, not AI accuracy. Incomplete
results remain partial; errors never count as NO_CONFLICT. Human validation is required
for actionable findings.

The MVP compares 1–4 explicitly selected procedure versions; enterprise-wide automatic
scope discovery, report export, notifications and a server investigation-history list
are outside scope. The current-session Overview cannot discover earlier sessions.
Policy search filters the current paginated library page. Rules Analyzed counts actual
replacement requirements; no unsupported totals or endpoints are invented.

[Provenance](docs/PROVENANCE.md) distinguishes scaffolding, new implementation,
backend contract references and synthetic verification. Reused work retains its
attribution; the original AI Compliance Copilot repositories were not modified.

## Run locally

Use Node 22 and npm 11.8.0, matching the CI and the declared package manager.
See Angular's [compatibility matrix](https://v21.angular.dev/reference/versions)
for supported Node releases.

```sh
npm ci
npm start
```

Open `http://127.0.0.1:4200`. The Angular development proxy sends `/api/**` to the
backend on `http://127.0.0.1:18080`; first follow the backend's
[local setup](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/SETUP.md)
and [demo provisioning](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/DEMO.md). No CORS change, frontend secret or Meta key is required.
Use an account provisioned through the backend's existing operator process. There
is no sign-up or password-reset endpoint, and no default credential is supplied.

Authentication survives a reload in the same browser tab until the server-reported
session expiry. Startup verifies the saved token and reloads current department
memberships before opening protected routes, preserving the full URL. Expired or
invalid sessions redirect to login with a safe return URL. See the
[authentication lifecycle and local verification](docs/AUTHENTICATION.md).

Older backend guides and recorded reports may describe memory-only authentication;
the session behavior above applies to this frontend change. Session storage must be
available to restore a session after reload. Existing sessions opened before the
change require one fresh sign-in.

## Local Docker Compose

Start the backend's local Compose deployment first, including `postgres`, `model-init`
and `backend`. Then, from this frontend checkout:

```sh
docker compose up --build -d --wait
```

Open `http://127.0.0.1:18081`. The local `frontend` service publishes
`127.0.0.1:18081:8080`, joins external network `ai-policy-investigator_default` and
routes `/api/` to `backend:8080`. Its healthcheck probes `/healthz`; backend readiness
must be checked separately through the API. For a custom local network, set
`BACKEND_NETWORK` and `BACKEND_UPSTREAM` to the actual backend network/address.
These are server-side routing values, not credentials or browser-controlled URLs.

The Dockerfile uses pinned Node/Nginx image digests, npm 11.8.0 and the lockfile.
No frontend settings or secrets need to be embedded from `.env`.

## Overview and impact graph

Overview rechecks known current-session investigation IDs through the existing
individual progress API before displaying their status/link. Unreadable scopes are
omitted and retrieval errors are not shown as empty history. The backend has no
investigation-list API, so earlier session history cannot be discovered automatically;
open a saved URL/ID instead. No backend endpoint or global-history claim was added.

The graph initially fits the full persisted layout without clipped nodes. It
recalculates on resize, focus changes and expansion. **100%** restores the existing
scrollable layout for reading; **Fit to view** restores the complete overview.
Node coordinates, relationships, source navigation and selection are preserved.

## Architecture and security

Angular 21 standalone components, explicit OnPush, built-in control flow,
`signal`/`computed`, signal `input`/`output` and HttpClient. RxJS handles HTTP,
mutation exclusion and polling; `toSignal` is the presentation boundary and owns
subscription cleanup. Effects are used for session expiry and session-history
cleanup. There is no NgRx, Angular Material dashboard or manual component subscription.

Features are grouped under `src/app/features/`; `core/contracts.ts` preserves the
actual camel-case DTOs and documented snake-case SQL projections. The backend's
[dashboard API contract](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/api/phase4.md)
and controllers are authoritative; [the frontend API map](docs/API.md) records the exact routes used.

- Bearer tokens attach only to relative `/api/` requests, never third-party URLs.
  Only the token and absolute expiry are saved in tab-scoped `sessionStorage`;
  passwords, identity, memberships and document content are never persisted.
  No localStorage, cookies or service-worker content cache is used.
- Sign-out clears saved authentication, identity, prior-user URL query text and
  session history, cancels in-flight API requests and destroys protected views.
  Expiry retains the intended URL for reauthentication. A 401 ends the session; 403/404/errors
  never create findings or success states. Review permissions remain server-authoritative.
- Excerpts/model reasoning/notes are text bindings, never `innerHTML`. PDF trust
  applies only to locally created Blob URLs from authenticated PDF responses;
  URLs are revoked when the viewer closes or its protected view is destroyed.
- No model key, database password or JWT signing secret belongs in the frontend.
  Fixture credentials, dotenv files, dependencies and build/test output are ignored
  and excluded from Docker's build-context allowlist.
- Production uses same-origin `/api` proxying, no API caching, non-root Nginx,
  strict script CSP and denied documentation routes. Angular critical CSS inlining
  is disabled so stylesheet loading does not depend on CSP-blocked inline handlers.

## Build and focused tests

```sh
npm run build -- --configuration production
npm test
```

The lockfile is committed source material; use `npm ci`, including in Docker.
Two explicit **build-only** WASM peer dependencies avoid a demonstrated macOS/Linux
lock inconsistency, following the upstream maintainer's
[documented workaround](https://github.com/napi-rs/napi-rs/issues/3174).
The runtime image contains static output only, not Node, testing tools or fixtures.
No dependency override or unsupported Angular version was forced.

## Real browser verification (explicit opt-in)

The backend path below matches the existing sibling checkout name. Replace it
with your actual backend checkout path; remote repository names use **invetigator**.

The workflow test uploads four synthetic PDFs and makes real Meta calls through the
backend authorization/consent gates. It does not intercept API requests or return fixture
model outputs. Use a dedicated local database; calls can incur provider usage. First
prepare the backend's ignored `.local/runtime.env` for the SQL fixture helper, keeping
its values consistent with the local database as described in
[evaluation setup](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/EVALUATION.md#reproduce-safely).
Keep a local frontend server running at the selected E2E URL. The example uses the
[local Docker frontend](#local-docker-compose) on port 18081.

```sh
python3 scripts/prepare_browser_fixture.py --backend ../aI-policy-investigator-backend
npx playwright install chromium
E2E_DATA_DIR="$PWD/.e2e-data" E2E_BASE_URL=http://127.0.0.1:18081 \
  npx playwright test e2e/workflow.spec.ts
E2E_DATA_DIR="$PWD/.e2e-data" E2E_BASE_URL=http://127.0.0.1:18081 \
  npx playwright test e2e/visual.spec.ts
python3 scripts/prepare_browser_fixture.py --backend ../aI-policy-investigator-backend --cleanup
```

Provisioning creates isolated synthetic users through the backend's existing local
operator helper; credentials are written only to `.e2e-data/credentials.json` with
mode 0600, not printed. Each full workflow run needs a fresh fixture organization;
prepare again before repeating it. The visual test reuses the completed real
investigation recorded by the workflow test, without another model request. The
cleanup option disables fixture accounts and retains immutable evidence.

Browser traces/video and automatic failure screenshots are disabled to avoid
recording credential entry or tokens. Deliberate committed screenshots contain only
synthetic documents, generated reviewer identities and actual model results.
The [real-demo guide](docs/REAL_DEMO.md) and [recorded browser evidence](docs/browser-verification.json)
describe dated local runs; they do not establish current production health. The visual
test reads `docs/browser-verification.json`, so the commands above leave the workflow
test's default report path unchanged. Tests deliberately update reports/screenshots;
review those artifacts before publishing them.

## CI and production status

**Frontend review: PASS. Delivery through the inspected workflow: NO-GO.**
[Frontend CI](.github/workflows/verify.yml) validates develop/main pushes and pull
requests targeting main. A successful frontend main run calls backend-owned image
publication, but its legacy deployment call is skipped by the inspected backend
workflow. The manual backend workflow uses the backend repository's **prod**
environment and V8 migration/activation gates; it is not a frontend-only update path.
Normal validation does not call Meta or require production credentials. A green
build/publication is not proof that this frontend has been deployed.

Operators must resolve the delivery gate using the existing
[release checklist and rollback requirements](docs/AUTH_RELEASE_REVIEW.md).
Detailed deployment, troubleshooting and SSH instructions belong in the backend's
[production pipeline guide](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/PRODUCTION_PIPELINE.md#current-ssh-configuration)
and [operations guide](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/docs/DEPLOYMENT.md).

<details>
<summary>Operator reference: production topology, images and SSH</summary>

Manual delivery uses the existing SSH inputs, public `VPS_HOST_KEY` Ed25519 pin, generated
`known_hosts` and `StrictHostKeyChecking=yes`; no additional GitHub secret is needed.

The backend-owned
[production overlay](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/deploy/frontend/compose.production.yaml)
and [image overlay](https://github.com/ThierryTe/ai-policy-invetigator/blob/main/deploy/frontend/compose.ghcr.yaml)
remove local host-port/build settings and use verified local images without pulls.
The frontend joins `ai-policy-investigator_application` and
`nginx-proxy-manager_default`; Nginx Proxy Manager targets
`ai-policy-investigator-web:8080`, with API upstream
`backend.ai-policy-investigator_application:8080`. Backend/PostgreSQL have no public
host ports. Local Compose does not install this production topology.

Existing image packages:

```text
ghcr.io/thierryte/ai-policy-invetigator
ghcr.io/thierryte/ai-policy-invetigator-model-init
ghcr.io/thierryte/ai-policy-invetigator-frontend
```

</details>

No successful VPS delivery, public DNS/TLS configuration, public demo availability
or published demo video is established by the local evidence in this repository.
