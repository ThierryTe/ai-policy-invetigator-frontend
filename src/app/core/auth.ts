import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import {
  catchError,
  defer,
  firstValueFrom,
  Subject,
  switchMap,
  takeUntil,
  tap,
  throwError,
  timeout,
} from 'rxjs';
import { Identity, LoginResponse } from './contracts';
import { Router } from '@angular/router';
import { safeReturnUrl } from './auth-navigation';

export const SESSION_KEY = 'ai-policy-investigator.session';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly token = signal<string | null>(null);
  private readonly expiresAt = signal(0);
  private restoration?: Promise<void>;
  readonly identity = signal<Identity | null>(null);
  readonly notice = signal('');
  readonly ended = new Subject<void>();
  readonly revision = signal(0);
  readonly canUpload = computed(
    () => this.identity()?.memberships.some((m) => ['ANALYST', 'ADMIN'].includes(m.role)) ?? false,
  );
  constructor() {
    effect((onCleanup) => {
      const expiresAt = this.expiresAt();
      if (!this.token() || !this.identity()) return;
      let timer: ReturnType<typeof setTimeout>;
      const schedule = () => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) this.logout('Your session expired. Sign in again to continue.');
        else timer = setTimeout(schedule, Math.min(remaining, 2147483647));
      };
      schedule();
      onCleanup(() => clearTimeout(timer));
    });
  }
  accessToken() {
    return this.token();
  }
  isAuthenticated() {
    return !!this.identity() && !!this.token() && this.expiresAt() > Date.now();
  }
  restoreSession(): Promise<void> {
    return (this.restoration ??= this.restoreStoredSession());
  }
  private async restoreStoredSession() {
    const revision = this.revision();
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return;
      const session = JSON.parse(stored);
      if (
        !session ||
        typeof session.token !== 'string' ||
        !session.token.trim() ||
        !Number.isFinite(session.expiresAt) ||
        session.expiresAt <= Date.now()
      )
        throw new Error('Invalid stored session');
      this.token.set(session.token);
      this.expiresAt.set(session.expiresAt);
      const identity = await firstValueFrom(
        this.http.get<Identity>('/api/auth/me').pipe(timeout(10000)),
        { defaultValue: null },
      );
      if (this.revision() !== revision) return;
      if (!identity || this.expiresAt() <= Date.now()) throw new Error('Session not verified');
      this.identity.set(identity);
    } catch {
      if (this.revision() === revision)
        this.logout('Your session could not be restored. Sign in again to continue.', true);
    }
  }
  login(email: string, password: string) {
    return defer(() => {
      this.logout('', true);
      return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
        tap((result) => {
          if (!result.token?.trim() || !Number.isFinite(result.expiresIn) || result.expiresIn <= 0)
            throw new Error('Invalid login response');
          this.token.set(result.token);
          this.expiresAt.set(Date.now() + result.expiresIn * 1000);
        }),
        switchMap(() => this.http.get<Identity>('/api/auth/me')),
        tap((identity) => {
          if (this.expiresAt() <= Date.now()) throw new Error('Session expired during login');
          this.identity.set(identity);
          try {
            sessionStorage.setItem(
              SESSION_KEY,
              JSON.stringify({
                token: this.token(),
                expiresAt: this.expiresAt(),
              }),
            );
          } catch {
            // Storage can be disabled by the browser; the current in-memory session still works.
          }
        }),
        catchError((error) => {
          this.logout('', true);
          return throwError(() => error);
        }),
      );
    });
  }
  refreshIdentity() {
    return this.http.get<Identity>('/api/auth/me').pipe(tap((i) => this.identity.set(i)));
  }
  loginUrl(returnUrl: string) {
    return this.router.createUrlTree(['/login'], {
      queryParams: { returnUrl: safeReturnUrl(this.router, returnUrl) },
    });
  }
  logout(notice = '', skipNavigation = false) {
    this.ended.next();
    this.token.set(null);
    this.expiresAt.set(0);
    this.identity.set(null);
    this.notice.set(notice);
    this.revision.update((n) => n + 1);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Clearing the in-memory session must work even when browser storage is unavailable.
    }
    if (!skipNavigation && this.router.url.split(/[?#]/)[0] !== '/login') {
      // Explicit sign-out clears prior-user query text; expiry retains the intended destination.
      const destination = notice ? this.router.url : this.router.url.split(/[?#]/)[0];
      void this.router.navigateByUrl(this.loginUrl(destination), { replaceUrl: true });
    }
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) return next(request);
  const auth = inject(Auth);
  const token = request.url === '/api/auth/login' ? null : auth.accessToken();
  const secured = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(secured).pipe(
    takeUntil(auth.ended),
    catchError((error) => {
      if (error.status === 401 && token && auth.accessToken() === token)
        auth.logout('Your session ended. Sign in again to continue.', !auth.identity());
      return throwError(() => error);
    }),
  );
};
