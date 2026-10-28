import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { catchError, defer, Subject, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { Identity, LoginResponse } from './contracts';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly token = signal<string | null>(null);
  private readonly expiresAt = signal(0);
  readonly identity = signal<Identity | null>(null);
  readonly notice = signal('');
  readonly ended = new Subject<void>();
  readonly revision = signal(0);
  readonly canUpload = computed(
    () => this.identity()?.memberships.some((m) => ['ANALYST', 'ADMIN'].includes(m.role)) ?? false,
  );
  constructor() {
    effect((onCleanup) => {
      const remaining = this.expiresAt() - Date.now();
      if (!this.token()) return;
      const timer = setTimeout(
        () => this.logout('Your session expired. Sign in again to continue.'),
        Math.max(0, remaining),
      );
      onCleanup(() => clearTimeout(timer));
    });
  }
  accessToken() {
    return this.token();
  }
  login(email: string, password: string) {
    return defer(() => {
      this.logout('', true);
      return this.http.post<LoginResponse>('/api/auth/login', { email, password }).pipe(
        tap((result) => {
          this.token.set(result.token);
          this.expiresAt.set(Date.now() + result.expiresIn * 1000);
        }),
        switchMap(() => this.http.get<Identity>('/api/auth/me')),
        tap((identity) => this.identity.set(identity)),
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
  logout(notice = '', preserveLoginLink = false) {
    this.ended.next();
    this.token.set(null);
    this.expiresAt.set(0);
    this.identity.set(null);
    this.notice.set(notice);
    this.revision.update((n) => n + 1);
    // Clear prior-user search text/source query state, while preserving safe UUID paths.
    if (!preserveLoginLink && /[?#]/.test(this.router.url))
      void this.router.navigateByUrl(this.router.url.split(/[?#]/)[0], { replaceUrl: true });
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
        auth.logout('Your session ended. Sign in again to continue.');
      return throwError(() => error);
    }),
  );
};
