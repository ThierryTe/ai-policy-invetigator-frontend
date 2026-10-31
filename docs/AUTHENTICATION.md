# Authentication restoration

## Proven refresh failure

The original `Auth` service initialized token, expiry and identity to empty signals
on every application load. Login kept all three values in memory. Neither bootstrap
nor the router attempted session restoration, and there were no authentication
guards. The root component rendered `Login` whenever identity was null, without
navigating the router. A reload therefore displayed login at the protected URL.
The original unit suite explicitly required tokens never to be persisted.

The synthetic browser regression in `e2e/auth-restoration.spec.ts` reproduced this
before the fix: signing in opened `/settings` with query parameters and a fragment;
reloading failed the assertion that the protected page remained visible. The same
test passes with restoration. This was a missing persistence/restoration lifecycle,
not an observed route-guard race.

## Current lifecycle

1. Login sends credentials only to `POST /api/auth/login`. The resulting bearer
   token is used to verify identity through `GET /api/auth/me`. Only after that
   succeeds are token and absolute expiry saved under
   `sessionStorage['ai-policy-investigator.session']`. Passwords, identity,
   department memberships, excerpts and investigation history are not saved.
2. `provideAppInitializer` waits for `Auth.restoreSession()` before bootstrap
   completes. Guards await the same cached promise. Missing, malformed or locally
   expired sessions make no authentication request. Otherwise exactly one
   `/api/auth/me` call verifies the saved token and obtains current memberships.
   Subsequent route changes do not repeat restoration. A ten-second timeout,
   rejected verification or cancellation settles initialization without granting
   access. The client never extends a saved expiry or invents a refresh endpoint.
3. The root router outlet renders either `/login` or the guarded workspace shell.
   The shell hides protected content immediately when identity is cleared. Both
   parent and child navigation require a verified, unexpired session. Successful
   restoration leaves the destination, path parameters, query parameters and
   fragment intact.
4. An unauthenticated protected navigation returns a login URL tree containing an
   encoded return URL. Only existing local primary-outlet workspace routes are
   accepted as return destinations. External, recursive login, malformed and
   unsupported destinations fall back to `/overview`. Successful login replaces
   the login history entry with the destination. Already authenticated visits to
   login use the same validation.
5. The interceptor attaches bearer tokens only to relative `/api/` requests and
   excludes login. A protected 401 clears the session and redirects with the
   current destination. A 401 during initial verification or login is handled
   without starting competing navigation. A document or mutation 403/404 retains
   authentication and remains an authorization error. Document retrieval, uploads,
   reviews and private department access remain server-authoritative. Judge and
   viewer accounts receive only their current memberships, including read-only
   access to documents shared from another department.
6. The expiry timer uses the original absolute expiry. Expiry preserves the full
   intended return URL. Explicit sign-out clears persisted and in-memory
   authentication, cancels in-flight API requests, clears workspace history and
   removes prior-user query text and fragments from the return destination. A safe
   workspace path remains available for a later login. Reload and browser history
   navigation cannot restore a signed-out session.

The existing bearer-only API cannot restore a token that was never saved. Users
with a session opened before this fix must sign in once. Session storage is scoped
to the browser tab; it is not a persistent login across browser restarts. Browsers
may copy tab session storage when duplicating a tab. If storage is disabled, login
still works in memory and a reload requires signing in again. JavaScript can read
session storage, so the existing CSP and safe text rendering remain important;
this change does not introduce cookies or require a backend/configuration change.

## Automated local verification

```sh
npm test
npm run build -- --configuration production
```

For the isolated browser regression, start the frontend without a backend proxy:

```sh
node_modules/.bin/ng serve --host 127.0.0.1 --port 4300
```

In another terminal:

```sh
E2E_BASE_URL=http://127.0.0.1:4300 \
  node_modules/.bin/playwright test e2e/auth-restoration.spec.ts --timeout=30000
```

This suite intercepts every API request, uses synthetic accounts and responses,
and blocks requests outside the local frontend origin. It does not invoke the
backend, Meta, deployment tools or historical qualification workflows. Existing
real-service workflow tests remain explicit opt-in and are not part of this check.
Historical reports and screenshots have not been rewritten.

## Remaining manual browser verification

Against an authorized local backend with synthetic accounts and already existing
documents, without starting new inference:

- Sign in as a judge, open an investigation UUID link or evidence source link with
  query parameters, and reload. Confirm the URL remains intact and startup makes
  one identity verification request before protected retrievals.
- Repeat as a read-only viewer for a shared document and as an account outside its
  private department. Confirm shared reads work, prohibited mutations remain
  unavailable, and private sources remain denied without ending the session.
- Let the session expire, then sign in again and verify the intended destination.
  Sign out from a URL containing search text, reload and use Back; confirm no
  protected content or prior-user query text reappears.
- Check the same flow in the judges' intended browsers, including any browser
  storage restrictions. Synthetic Chromium tests do not establish real-backend
  authorization or cross-browser behavior.
