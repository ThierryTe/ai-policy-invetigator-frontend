# Phase 5 verification — October 27, 2026

## Actual final results

| Check | Result |
|---|---|
| Clean `npm ci` on the local macOS host | Passed |
| `npm test` | 20 focused tests passed, five test files |
| `npm run build` | Production build passed; no warnings in the final build |
| Independent Docker Compose build | Linux `npm ci`, production build and non-root runtime health passed |
| Real browser workflow | Passed against production frontend, existing Spring Boot/PostgreSQL and real Meta |
| Final read-only browser checks | Two tests passed: session/network behavior and desktop/mobile/CSP/PDF visuals |
| Production HTTP checks | Seven passed, including authenticated API boundary, SPA deep link, no-store headers, dotfile and documentation denial |
| Backend integrity | Existing backend public source/configuration/evidence hashes unchanged; no Java changes |
| Git operations | None; no repository initialization, staging, commits, pushes or history changes |

Focused tests cover current identity before authentication, memory-only tokens,
relative API bearer headers, pending-request cancellation, 401/403 behavior, idle
expiry, identity-check failure, prior-user URL query clearing, multipart UUID keys,
review/PDF contracts, persisted graph filtering, safe errors and escaped model text.
Unit fixtures do not establish real model behavior; the separate real browser run does.
The accepted Phase 4 Java suite was not rerun because the backend was unchanged.

## Real investigation

The production browser test uploaded four synthetic PDFs, checked two immutable
policy versions, explicitly allowed external processing, selected baseline/replacement
plus conflicting/compatible HR procedures and polled a real durable investigation.
Muse returned **CONTRADICTION** for access before training and **NO_CONFLICT** for
the access-gated procedure. The complete browser test passed in 58.3 seconds;
the persisted job reported five calls, **6,353 prompt tokens**, **8,735 completion
tokens** and **38,312 ms** metered provider latency.

The browser then resolved real citation pages, displayed authenticated original PDFs,
navigated persisted graph nodes, confirmed/dismissed/annotated a finding and inspected
history. Original AI output was retained. Viewer review controls were hidden;
an outsider lost all graph/excerpt access. Logout/reload cleared protected views and
no token was written to localStorage or sessionStorage.

[Browser evidence](browser-verification.json), [all actual model runs](model-runs.json),
[final session checks](session-verification.json), [visual checks](visual-verification.json)
and [deployment checks](deployment-verification.json) preserve measured results.

The earlier development-browser attempt also completed a real investigation, but its
test incorrectly assumed exactly two citations and stopped when four were returned.
The assertion was corrected to allow all real returned citations. Both genuine model
jobs are retained in `model-runs.json`: ten total calls, 12,703 prompt tokens, 17,351
completion tokens and 83,915 ms summed metered provider latency. Read-only follow-up
checks made no additional model requests. This is a workflow demonstration, not a
new general-accuracy evaluation or replacement for the Phase 4 golden dataset.

## Issues found and corrected

- An upload-dialog template variable shadowed a writable signal; fixed before release.
- A unit fixture used a non-UUID idempotency key; replaced with a valid synthetic UUID.
- Linux `npm ci` found missing platform-specific WASM peers in the macOS-generated
  lock. Clean regeneration and npm-version matching alone did not fix it. Explicit
  build-only peer declarations, as recommended by the upstream maintainer, fixed
  clean installs on both platforms. Final Docker uses the declared npm 11.8.0.
- Strict script CSP blocked Angular's default critical-CSS stylesheet handler. Visual
  inspection caught the missing global styles after functional checks passed. Disabled
  critical CSS inlining; kept script CSP restricted. Final screenshots assert white
  cards and blue primary actions, with zero recorded CSP violations.
- The default headless shell did not paint the native PDF in an early screenshot.
  The final visual check uses Chromium's new headless mode; the native PDF page and
  toolbar were visibly rendered and inspected. No CSP weakening or PDF-rendering
  infrastructure was introduced.
- Prior-user search query text could survive in a shared route on sign-out. Logout
  now clears query/fragment state while preserving safe paths; initial login keeps
  a user's supplied deep link. Focused and real browser checks verify the boundary.

## Visual review and deviations

The final [desktop](screenshots/desktop-real-investigation.png),
[mobile](screenshots/mobile-real-investigation.png) and
[PDF source](screenshots/pdf-real-source.png) screenshots were visually inspected.
Desktop viewport: 1536 × 1024; mobile: 390 × 844, with no page-wide horizontal overflow.
Mobile graph scrolling is contained inside its own panel. The native PDF view is
verified in Chromium; Firefox, Safari and other native PDF implementations were not tested.

The navy/light layout, KPI cards, graph, selected finding, related documents,
evidence and review controls follow the supplied mockup. Actual data replaces sample
counts, names, display IDs and timestamps. Header upload/run/copy-link actions replace
unsupported report export/share services. Larger persisted graphs/excerpts scroll
or occupy more space than the mockup; all citations are available. There is no
notification feed, evaluation API, global investigation-history API or account
profile-name API, so those capabilities are not fabricated.

## Remaining delivery/deployment limits

The frontend is a separate workspace, not nested in the backend. This session's
writable roots permitted the backend and temporary directories only, so the complete
frontend is prepared at `/private/tmp/ai-policy-investigator-frontend`, with a sanitized
source archive alongside it. The intended permanent sibling folder must be added to
the writable workspace or moved by the owner before initializing/publishing the Git
repository. No backend files or original reference repositories were changed.

The production frontend was built and tested locally on Docker's Linux x86_64 runtime,
using the existing backend Docker network. Actual VPS public DNS/HTTPS configuration
was not changed or tested. The owner retains that existing reverse proxy and TLS setup.

All genuine results use synthetic documents. Model interpretations still require
human review; source correspondence does not establish correctness. Browser-native
PDF tools may let an authorized user explicitly download a copy. No application
credential or token is included in the screenshots, archive or source inventory.
