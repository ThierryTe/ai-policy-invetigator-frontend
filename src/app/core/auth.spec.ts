import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { Auth, authInterceptor, SESSION_KEY } from './auth';
import { Identity } from './contracts';
const identity: Identity = {
  user: { id: 'synthetic-user', organizationId: 'synthetic-org', email: 'analyst@test.invalid' },
  memberships: [{ department_id: 'security', department_name: 'Security', role: 'ADMIN' }],
};
describe('Verified tab-scoped session boundary', () => {
  let auth: Auth, http: HttpClient, mock: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpClient);
    mock = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });
  afterEach(() => {
    auth.logout('', true);
    mock.verify({ ignoreCancelled: true });
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  async function login() {
    const done = firstValueFrom(auth.login('analyst@test.invalid', 'synthetic-password'));
    const request = mock.expectOne('/api/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ token: 'synthetic-token', expiresIn: 900, tokenType: 'Bearer' });
    const me = mock.expectOne('/api/auth/me');
    expect(me.request.headers.get('Authorization')).toBe('Bearer synthetic-token');
    me.flush(identity);
    await done;
  }
  it('does not authenticate until current identity is verified', async () => {
    const done = firstValueFrom(auth.login('analyst@test.invalid', 'synthetic-password'));
    mock
      .expectOne('/api/auth/login')
      .flush({ token: 'synthetic-token', expiresIn: 900, tokenType: 'Bearer' });
    expect(auth.identity()).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    mock.expectOne('/api/auth/me').flush(identity);
    await done;
    expect(auth.identity()).toEqual(identity);
    expect(auth.canUpload()).toBe(true);
  });
  it('clears prior-user query text on logout without retaining it in the next session', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/policies?q=private-policy-title');
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    auth.logout();
    expect(navigate).toHaveBeenCalledWith(auth.loginUrl('/policies'), { replaceUrl: true });
  });
  it('reports an identity-verification 401 instead of leaving login pending', async () => {
    const done = firstValueFrom(auth.login('analyst@test.invalid', 'synthetic-password')).catch(
      (e) => e.status,
    );
    mock
      .expectOne('/api/auth/login')
      .flush({ token: 'synthetic-token', expiresIn: 900, tokenType: 'Bearer' });
    mock.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(await done).toBe(401);
    expect(auth.identity()).toBeNull();
  });
  it('persists only the verified token and absolute expiry in sessionStorage', async () => {
    const local = vi.spyOn(localStorage, 'setItem');
    await login();
    expect(local).not.toHaveBeenCalled();
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY)!);
    expect(stored).toEqual({ token: 'synthetic-token', expiresAt: expect.any(Number) });
    expect(stored.expiresAt).toBeGreaterThan(Date.now());
  });
  it('attaches bearer tokens only to relative API requests', async () => {
    await login();
    http.get('https://third-party.invalid/file').subscribe();
    expect(
      mock.expectOne('https://third-party.invalid/file').request.headers.has('Authorization'),
    ).toBe(false);
  });
  it('cancels in-flight protected requests and clears identity on logout', async () => {
    await login();
    let delivered = false;
    http.get('/api/policies').subscribe(() => (delivered = true));
    const pending = mock.expectOne('/api/policies');
    auth.logout();
    expect(pending.cancelled).toBe(true);
    expect(delivered).toBe(false);
    expect(auth.identity()).toBeNull();
    expect(auth.accessToken()).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
  it('ends the session on a protected 401 and exposes no response body', async () => {
    await login();
    http.get('/api/policies').subscribe({ error: () => {} });
    mock.expectOne('/api/policies').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(auth.identity()).toBeNull();
    expect(auth.notice()).toContain('session');
  });
  it('keeps readable content authorization separate from a denied mutation', async () => {
    await login();
    http.post('/api/review', {}).subscribe({ error: () => {} });
    mock.expectOne('/api/review').flush(null, { status: 403, statusText: 'Forbidden' });
    expect(auth.identity()).toEqual(identity);
  });
  it('expires an idle session using the server-reported lifetime', async () => {
    vi.useFakeTimers();
    const router = TestBed.inject(Router);
    const destination = '/evidence?source=synthetic-source#citation';
    vi.spyOn(router, 'url', 'get').mockReturnValue(destination);
    await login();
    TestBed.tick();
    vi.advanceTimersByTime(900001);
    expect(auth.identity()).toBeNull();
    expect(auth.accessToken()).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith(auth.loginUrl(destination), {
      replaceUrl: true,
    });
    vi.useRealTimers();
  });

  it('restores once, verifies current memberships, and never trusts a saved identity', async () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        token: 'synthetic-token',
        expiresAt: Date.now() + 900000,
        identity, // Untrusted storage must not grant administrator rights.
      }),
    );
    const first = auth.restoreSession();
    expect(auth.restoreSession()).toBe(first);
    expect(auth.identity()).toBeNull();
    const me = mock.expectOne('/api/auth/me');
    expect(me.request.headers.get('Authorization')).toBe('Bearer synthetic-token');
    const viewer = {
      ...identity,
      memberships: [
        {
          department_id: 'shared',
          department_name: 'Shared',
          role: 'VIEWER',
        },
      ],
    };
    me.flush(viewer);
    await first;
    expect(auth.identity()).toEqual(viewer);
    expect(auth.canUpload()).toBe(false);
    await auth.restoreSession();
    mock.expectNone('/api/auth/me');
    mock.expectNone('/api/auth/login');
  });

  it.each([
    '{invalid json',
    'null',
    '{}',
    JSON.stringify({ token: 'synthetic-token', expiresAt: Date.now() - 1000 }),
    JSON.stringify({ token: '', expiresAt: Date.now() + 900000 }),
    JSON.stringify({ token: 'synthetic-token', expiresAt: 'future' }),
  ])(
    'rejects malformed or expired persisted state without an authentication request (%#)',
    async (stored) => {
      sessionStorage.setItem(SESSION_KEY, stored);
      await auth.restoreSession();
      expect(auth.identity()).toBeNull();
      expect(auth.accessToken()).toBeNull();
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
      mock.expectNone('/api/auth/me');
    },
  );

  it.each([401, 403, 500, 0])(
    'fails closed when restoration cannot be verified (HTTP %s)',
    async (status) => {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          token: 'synthetic-token',
          expiresAt: Date.now() + 900000,
        }),
      );
      const restored = auth.restoreSession();
      const me = mock.expectOne('/api/auth/me');
      if (status === 0) me.error(new ProgressEvent('error'));
      else me.flush(null, { status, statusText: 'Not verified' });
      await restored;
      expect(auth.identity()).toBeNull();
      expect(auth.accessToken()).toBeNull();
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    },
  );

  it('settles restoration if logout cancels an outstanding identity request', async () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        token: 'synthetic-token',
        expiresAt: Date.now() + 900000,
      }),
    );
    const restored = auth.restoreSession();
    const me = mock.expectOne('/api/auth/me');
    auth.logout('', true);
    await restored;
    expect(me.cancelled).toBe(true);
    expect(auth.identity()).toBeNull();
    await auth.restoreSession();
    mock.expectNone('/api/auth/me');
  });

  it('bounds restoration when the identity endpoint does not respond', async () => {
    vi.useFakeTimers();
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        token: 'synthetic-token',
        expiresAt: Date.now() + 900000,
      }),
    );
    const restored = auth.restoreSession();
    const me = mock.expectOne('/api/auth/me');
    vi.advanceTimersByTime(10001);
    await restored;
    expect(me.cancelled).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('continues safely if browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Denied');
    });
    await auth.restoreSession();
    await login();
    expect(auth.isAuthenticated()).toBe(true);
    auth.logout('', true);
    expect(auth.isAuthenticated()).toBe(false);
  });
});
