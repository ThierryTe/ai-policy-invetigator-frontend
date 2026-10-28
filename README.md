# AI Policy Investigator — Angular frontend

Independent frontend workspace intended for
[ThierryTe/ai-policy-investigator-frontend](https://github.com/ThierryTe/ai-policy-investigator-frontend).
The owner creates the GitHub repository and performs all Git operations. No Git
repository or history was initialized by this implementation.

Phase 5 hackathon MVP: the approved navy/light policy-impact dashboard connected to
the real Spring Boot APIs. No mock findings, fabricated KPIs or client-side LLM calls.
Backend: [ThierryTe/ai-policy-invetigator](https://github.com/ThierryTe/ai-policy-invetigator).

## Run locally

Use Node 22.14+ on the supported Node 22 line and npm 11.8.0 (the declared package
manager). Angular 21 supports Node 22.12+; see the official
[compatibility matrix](https://v21.angular.dev/reference/versions).

```sh
npm ci
npm start
```

Open `http://127.0.0.1:4200`. The Angular development proxy sends `/api/**` to the
existing backend on `http://127.0.0.1:18080`; start the backend with its documented
Compose command first. No CORS change, frontend secret or Meta key is required.
Use an account provisioned through the backend's existing operator process. There
is no sign-up or password-reset endpoint, and no default credential is supplied.

The selected investigation URL survives navigation but **authentication does not
survive a reload**: sign in again. Tokens are intentionally kept only in memory.

## Implemented workflow

1. Login and load current identity/department memberships.
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

## Focused Overview, graph fit and real demo

Overview now rechecks known current-session investigation IDs through the existing
individual progress API before displaying their status/link. Unreadable scopes are
omitted and retrieval errors are not shown as empty history. The backend has no
investigation-list API, so earlier session history cannot be discovered automatically;
open a saved URL/ID instead. No backend endpoint or global-history claim was added.

The graph initially fits the full persisted layout without clipped nodes. It
recalculates on resize, focus changes and expansion. **100%** restores the existing
scrollable layout for reading; **Fit to view** restores the complete overview.
Node coordinates, relationships, source navigation and selection are preserved.

Follow the [repeatable real Muse demo](docs/REAL_DEMO.md) for the actual training-before-
access versus day-one-access scenario and its non-conflicting control. This uses
existing synthetic PDFs, explicit consent, real inference and persisted citations.

## Architecture and security

Angular 21 standalone components, explicit OnPush, built-in control flow,
`signal`/`computed`, signal `input`/`output` and HttpClient. RxJS handles HTTP,
mutation exclusion and polling; `toSignal` is the presentation boundary and owns
subscription cleanup. Effects are used for session expiry and session-history
cleanup. There is no NgRx, Angular Material dashboard or manual component subscription.

Features are grouped under `src/app/features/`; `core/contracts.ts` preserves the
actual camel-case DTOs and documented snake-case SQL projections. The backend's
`docs/api/phase4.md` and controllers are authoritative; [the frontend API map](docs/API.md)
records the exact routes used.

- Bearer tokens attach only to relative `/api/` requests, never third-party URLs.
  No localStorage/sessionStorage, cookies or service-worker content cache is used.
- Sign-out/session expiry clears identity, prior-user URL query text and session history, cancels in-flight
  API requests and destroys protected views. A 401 ends the session; 403/404/errors
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
npm run build
npm test
```

The lockfile is committed source material; use `npm ci`, including in Docker.
Two explicit **build-only** WASM peer dependencies avoid a demonstrated macOS/Linux
lock inconsistency, following the upstream maintainer's
[documented workaround](https://github.com/napi-rs/napi-rs/issues/3174).
The runtime image contains static output only, not Node, testing tools or fixtures.
No dependency override or unsupported Angular version was forced.

## Real browser verification (explicit opt-in)

The workflow test uploads four synthetic PDFs and makes real, billable Meta calls
through the existing backend authorization/consent gates. It does not intercept API
requests or return fixture model outputs. Run only against the dedicated local
backend database, never a shared VPS database.

```sh
python3 scripts/prepare_browser_fixture.py --backend /path/to/ai-policy-investigator-backend
npx playwright install chromium
E2E_DATA_DIR="$PWD/.e2e-data" E2E_BASE_URL=http://127.0.0.1:18081 \
  npx playwright test e2e/workflow.spec.ts
E2E_DATA_DIR="$PWD/.e2e-data" E2E_BASE_URL=http://127.0.0.1:18081 \
  npx playwright test e2e/visual.spec.ts
python3 scripts/prepare_browser_fixture.py --backend /path/to/ai-policy-investigator-backend --cleanup
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
See [verification](docs/VERIFICATION.md), [browser evidence](docs/browser-verification.json)
and [desktop screenshot](docs/screenshots/desktop-real-investigation.png).

## VPS + Docker Compose

Start the existing backend Compose deployment first, including its PostgreSQL 16
and pinned embedding volume bootstrap. Then, from this separate frontend checkout:

```sh
docker compose up --build -d --wait
```

Open `http://127.0.0.1:18081` locally. The frontend joins the existing external Docker
network `ai-policy-investigator_default` and resolves the backend service as
`backend:8080`. The backend Compose files are unchanged. For a different network or
backend alias, use process variables (no credentials):

```sh
BACKEND_NETWORK=your-existing-network BACKEND_UPSTREAM=http://backend:8080 \
  docker compose up --build -d --wait
```

Keep the VPS's existing HTTPS reverse proxy. Point the chosen frontend hostname's
upstream to `127.0.0.1:18081`, or to this frontend's port 8080 if the reverse proxy
shares its Docker network. Send the whole origin through this frontend; its `/api/`
location preserves backend request paths and bearer headers. Do not expose port
18080 or PostgreSQL publicly, install another TLS proxy, or put secrets into build
arguments. Forwarded request bodies must permit the existing 11 MB multipart limit.
Actual public-host DNS/TLS deployment is owner-managed and was not performed here.

The Dockerfile uses observed pinned Node/Nginx image digests, npm 11.8.0 and the lock
file. No frontend settings need to be embedded from `.env`. `BACKEND_UPSTREAM` is
server-side routing configuration, never a browser-provided URL. Compose health
checks only the frontend's `/healthz`; backend availability is verified separately
through actual API requests.

## Visual differences and scope

The attached mockup is the visual baseline: navy sidebar, light workspace, four
cards, color-coded graph, finding panel, related documents, evidence and review
controls. Differences are intentional or based on actual data:

- Rules Analyzed counts actual replacement requirements, not invented policy totals.
- Header actions upload/run/copy link; report export and notifications have no API.
- Real UUIDs, account email, actual findings, unknown fields and citation counts
  replace mockup labels, names and dates. No invented start/end timestamps appear.
- Real graphs may contain more nodes/links and initially fit the viewport, with a 100% scrollable view;
  mobile stacks the panels and keeps graph scrolling inside its own viewport.
- Source excerpts can occupy more space than the mockup; every returned citation
  remains accessible. Coverage indicates source correspondence, not AI accuracy.

[Provenance](docs/PROVENANCE.md) distinguishes CLI scaffolding, new implementation,
backend contract references and synthetic verification. The original AI Compliance
Copilot repositories were not modified or copied into this frontend.
