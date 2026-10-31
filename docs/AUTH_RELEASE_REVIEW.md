# Authentication change: final release review

Review date: October 31, 2026. Scope: the frontend authentication restoration change
and the checked-in delivery configuration. No production system was accessed.

**Frontend code: PASS. Production delivery through the inspected workflow: NO-GO.**
No additional authentication defect was found. Delivery needs an approved
frontend-only procedure and the operator checks below. A procedure outside these
checkouts may exist; its existence and behavior have not been verified here.

## Findings and evidence

| Area | Review result |
| --- | --- |
| Refresh | Bootstrap waits for one cached restoration operation. The saved expiry is not extended; `/api/auth/me` supplies current identity and memberships before protected routing. Timeout, malformed storage, expiry and rejected verification deny access. |
| Deep links and return URLs | Existing routes retain path/query parameters and fragments. Guards return URL trees. Return destinations are restricted to known local primary-outlet routes; external and recursive login destinations fall back to `/overview`. |
| Expiry and logout | Expiry/401 preserve the destination. Explicit logout clears saved authentication, cancels API requests, removes current query/fragment text and hides protected views. Guards prevent authenticated SPA history entries from granting access after logout. |
| Judge/viewer boundaries | Saved identity and roles are ignored. Current memberships determine upload controls; server `canReview` determines review controls. API 403/404 deny the resource without converting the response into success or unnecessarily ending authentication. No authorization rule was broadened. |
| Backend API | Read-only inspection of the adjacent backend `AuthController` confirms `POST /api/auth/login` returns `token`, `expiresIn: 900`, `tokenType: Bearer`; bearer-authenticated `GET /api/auth/me` returns `user` and current `memberships`. No cookie, refresh-token or logout endpoint is assumed. This proves compatibility with available source, not the identity of the deployed backend. |
| Serving | The existing Nginx template supplies SPA fallback, a separate same-origin `/api/` proxy with bearer forwarding, no-store headers and CSP. The production bundle includes the root base URL and hashed assets. Live edge behavior was not checked. |

The existing passing results are reused: **62 unit/routing tests, 8 synthetic Chromium
tests, a warning-free production build, formatting and browser-test TypeScript checks**.
No runtime code changed during this review, so these checks were not repeated.
The Chromium suite intercepts all API requests. It does not establish live backend
permissions or production health. Its Back test is limited; use multiple protected
history entries and cross-document Back in the manual browser check below.

## Release blocker

The frontend `.github/workflows/verify.yml` calls the backend's
`deploy-production.yml` using `workflow_call`. In the inspected adjacent backend
checkout, that deployment job requires `workflow_dispatch` from backend main;
the legacy call skips it. Frontend verification/publication can therefore succeed
without delivering this fix. The README previously described automatic deployment
and has been corrected.

The manual workflow offers only `migrate-v8` and `activate-v8`. Its
`release_safety.py:validate_target` requires V1–V7 history for migration and requires
activation to reuse the migration release's frontend/backend/configuration and image
identities. `production_release.py:activate` also recreates backend/model-init services.
These are not frontend-only hotfix steps and must not be repurposed or bypassed for
this change. The workflow and guards are backend-owned and were not modified.

An authorized release owner must supply or separately approve a procedure that
updates and rolls back only the frontend artifact, retaining the current backend,
database history, model-init, worker flags, networks, volumes and runtime configuration.
Confirm these findings against the exact tooling revision selected for delivery;
the adjacent checkout is not proof of remote main or deployed state.

## Operator release checklist

- [ ] Resolve the delivery blocker: identify the owner and reviewed frontend-only
  delivery/rollback procedure. Do not treat a skipped deployment job as success or
  dispatch migration/activation to install this UI fix.
- [ ] Record the reviewed frontend source revision, immutable image/platform digest,
  build/CI result and release identifier. Retain the previous validated frontend
  artifact and release metadata before replacement. Bind the reused test results to
  the reviewed source; new code changes require appropriate checks.
- [ ] Obtain the current backend image/source identity and confirm it implements the
  inspected authentication contract. Record backend/runtime identities to preserve.
  No backend, database, credential, worker or production configuration change is needed.
- [ ] On an authorized local or staging target with existing synthetic accounts and
  documents, verify login and refresh of an investigation UUID and an evidence
  source URL. Check parameters, repeated query parameters and fragments survive;
  expect one `/api/auth/me` request per refresh and no login POST or protected reads
  before restoration completes. Do not start an investigation or invoke Meta.
- [ ] Verify expired/rejected sessions return to login and successful login returns
  to the intended page. A resource 403/404 must remain an access error, not a logout.
  Confirm judge/viewer upload and review controls remain unavailable where denied;
  shared document reads work and private department evidence remains inaccessible.
- [ ] In the judges' intended browsers, navigate through multiple protected pages,
  sign out, then use Back/Forward and refresh. Also check cross-document Back,
  including any browser page cache. Confirm protected content cannot reappear and
  the current logout destination contains no prior-user search/source query text.
- [ ] Announce one fresh login for sessions opened before this fix. Session storage
  must be available for refresh restoration. Login remains tab-scoped; duplicated
  tabs may have independent copies, and sign-out does not revoke a JWT server-side.
- [ ] At the separately authorized release window, use only the reviewed delivery
  procedure. Check the complete frontend artifact is served consistently, SPA deep
  links and assets load, `/healthz` is healthy, and anonymous `/api/auth/me` is denied.
  Confirm existing TLS, CSP, no-store and bearer forwarding remain intact. Do not
  publish tokens, passwords, response bodies, private query text or raw HAR files.
- [ ] Perform the same read-only judge smoke check on the delivered artifact through
  the authorized operator, record a safe result and stop/roll back on regression.
  Nothing in this review establishes that these production checks have occurred.

## Rollback requirements

Use the retained previous frontend artifact through the approved frontend-only
rollback procedure. Restore a complete matching asset set, preserve backend/runtime
identities, and repeat health, deep-link, login and access-denial checks. A full
backend release rollback is not a substitute: it can replace other services and is
subject to schema compatibility gates. Do not restore or rewind the database for
this frontend change.

Rolling back to the former memory-only frontend restores its refresh limitation.
That version also ignores the new session-storage key. Before using it, clear
`ai-policy-investigator.session` from each affected tab on the application origin,
then reload and sign in again. For example, an operator can remove only that key in
browser storage tools; do not inspect or copy its value. Repeating sign-out in the
old frontend does not clear this key. Clear it again before a later roll-forward if
an affected tab retained it. Record this user impact and allow time for the existing
short-lived bearer token to expire; no server-side revocation endpoint is available.

This review changed only this document and the README. It ran no Git command,
deployment, production request, backend mutation or real Meta call, and did not
rewrite historical qualification evidence.
