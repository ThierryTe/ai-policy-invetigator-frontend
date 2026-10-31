import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';
import { appConfig } from '../app.config';
import { Auth, SESSION_KEY } from './auth';
import { safeReturnUrl } from './auth-navigation';
import { Login } from '../features/auth/login';

const identity = {
  user: { id: 'judge', organizationId: 'synthetic-org', email: 'judge@test.invalid' },
  memberships: [{ department_id: 'shared', department_name: 'Shared', role: 'VIEWER' }],
};
const destination = '/investigations/case-42?source=one&source=two#finding';

describe('Authentication bootstrap and actual application routes', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
  });
  afterEach(() => {
    TestBed.inject(Auth).logout('', true);
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });
  const store = (expiresAt = Date.now() + 900000) =>
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'synthetic-token', expiresAt }));
  async function initialized() {
    await TestBed.inject(ApplicationInitStatus).donePromise;
  }
  function returnUrl() {
    const tree = TestBed.inject(Router).parseUrl(TestBed.inject(Router).url);
    expect(tree.root.children[PRIMARY_OUTLET].segments[0].path).toBe('login');
    return tree.queryParams['returnUrl'];
  }

  it('redirects direct protected navigation to login with the complete local return URL', async () => {
    await initialized();
    const harness = await RouterTestingHarness.create(destination);
    expect(returnUrl()).toBe(destination);
    expect(harness.routeNativeElement?.textContent).toContain('Welcome back');
    TestBed.inject(HttpTestingController).expectNone('/api/auth/me');
  });

  it('blocks bootstrap until the persisted session is verified, then keeps route and query parameters', async () => {
    store();
    const mock = TestBed.inject(HttpTestingController);
    const status = TestBed.inject(ApplicationInitStatus);
    expect(status.done).toBe(false);
    expect(TestBed.inject(Auth).identity()).toBeNull();
    mock.expectOne('/api/auth/me').flush(identity);
    await status.donePromise;
    const harness = await RouterTestingHarness.create(destination);
    const router = TestBed.inject(Router);
    expect(router.url).toBe(destination);
    expect(router.routerState.snapshot.root.firstChild?.firstChild?.params['id']).toBe('case-42');
    expect(
      router.routerState.snapshot.root.firstChild?.firstChild?.queryParamMap.getAll('source'),
    ).toEqual(['one', 'two']);
    await harness.navigateByUrl('/settings');
    mock.expectNone('/api/auth/me');
    expect(TestBed.inject(Auth).canUpload()).toBe(false);
  });

  it('rejects an expired session before routing and preserves a reauthentication destination', async () => {
    store(Date.now() - 1000);
    await initialized();
    await RouterTestingHarness.create(destination);
    expect(returnUrl()).toBe(destination);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    TestBed.inject(HttpTestingController).expectNone('/api/auth/me');
  });

  it('redirects a server-rejected session without repeating authentication or looping', async () => {
    store();
    const mock = TestBed.inject(HttpTestingController);
    mock.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await initialized();
    const harness = await RouterTestingHarness.create(destination);
    expect(returnUrl()).toBe(destination);
    await harness.navigateByUrl('/settings?tab=access');
    expect(returnUrl()).toBe('/settings?tab=access');
    mock.expectNone('/api/auth/me');
  });

  it('returns to the protected destination only after successful login and identity verification', async () => {
    await initialized();
    const harness = await RouterTestingHarness.create(destination);
    const login = harness.routeDebugElement!.componentInstance as Login;
    login.email.set('judge@test.invalid');
    login.password.set('synthetic-password');
    login.submit();
    const mock = TestBed.inject(HttpTestingController);
    mock.expectOne('/api/auth/login').flush({
      token: 'synthetic-token',
      expiresIn: 900,
      tokenType: 'Bearer',
    });
    expect(returnUrl()).toBe(destination);
    const router = TestBed.inject(Router);
    const navigated = firstValueFrom(router.events.pipe(filter((e) => e instanceof NavigationEnd)));
    mock.expectOne('/api/auth/me').flush(identity);
    await navigated;
    expect(router.url).toBe(destination);
    expect(login.password()).toBe('');
  });

  it('redirects an already verified session away from login without another identity request', async () => {
    store();
    const mock = TestBed.inject(HttpTestingController);
    mock.expectOne('/api/auth/me').flush(identity);
    await initialized();
    await RouterTestingHarness.create(
      '/login?returnUrl=' + encodeURIComponent('/settings?tab=access'),
    );
    expect(TestBed.inject(Router).url).toBe('/settings?tab=access');
    mock.expectNone('/api/auth/me');
  });

  it('explicit logout removes persisted authentication and prior-user query text', async () => {
    store();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush(identity);
    await initialized();
    const harness = await RouterTestingHarness.create(
      '/settings?filter=private-title#private-note',
    );
    const router = TestBed.inject(Router);
    const navigated = firstValueFrom(router.events.pipe(filter((e) => e instanceof NavigationEnd)));
    TestBed.inject(Auth).logout();
    await navigated;
    expect(returnUrl()).toBe('/settings');
    expect(router.url).not.toContain('private');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    await harness.navigateByUrl('/settings');
    expect(returnUrl()).toBe('/settings');
    TestBed.inject(HttpTestingController).expectNone('/api/auth/me');
  });

  it('a protected API 401 ends the session and retains the complete reauthentication URL', async () => {
    store();
    const mock = TestBed.inject(HttpTestingController);
    mock.expectOne('/api/auth/me').flush(identity);
    await initialized();
    await RouterTestingHarness.create('/settings?tab=access#memberships');
    const router = TestBed.inject(Router);
    const navigated = firstValueFrom(router.events.pipe(filter((e) => e instanceof NavigationEnd)));
    TestBed.inject(HttpClient)
      .get('/api/policies')
      .subscribe({ error: () => {} });
    mock.expectOne('/api/policies').flush(null, { status: 401, statusText: 'Unauthorized' });
    await navigated;
    expect(returnUrl()).toBe('/settings?tab=access#memberships');
    expect(TestBed.inject(Auth).identity()).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    mock.expectNone('/api/auth/me');
  });

  it.each([
    null,
    'https://third-party.invalid',
    '//third-party.invalid',
    '/\\third-party.invalid',
    '/login',
    '/login?returnUrl=/login',
    '/unknown',
    '/policies/../login',
    '/policies(aux:settings)',
    '/settings%ZZ',
    '/settings\n',
  ])('rejects unsafe, recursive or unsupported return URLs (%#)', async (value) => {
    await initialized();
    expect(safeReturnUrl(TestBed.inject(Router), value)).toBe('/overview');
  });
});
