import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { Auth, authInterceptor } from './auth';
import { Identity } from './contracts';
const identity: Identity = {
  user: { id: 'synthetic-user', organizationId: 'synthetic-org', email: 'analyst@test.invalid' },
  memberships: [{ department_id: 'security', department_name: 'Security', role: 'ADMIN' }],
};
describe('Memory-only session boundary', () => {
  let auth: Auth, http: HttpClient, mock: HttpTestingController;
  beforeEach(() => {
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
  });
  afterEach(() => {
    auth.logout();
    mock.verify({ ignoreCancelled: true });
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
    expect(navigate).toHaveBeenCalledWith('/policies', { replaceUrl: true });
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
  it('never persists a token in browser storage', async () => {
    const local = vi.spyOn(Storage.prototype, 'setItem');
    await login();
    expect(local).not.toHaveBeenCalled();
    local.mockRestore();
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
    await login();
    TestBed.tick();
    vi.advanceTimersByTime(900001);
    expect(auth.identity()).toBeNull();
    expect(auth.accessToken()).toBeNull();
    vi.useRealTimers();
  });
});
