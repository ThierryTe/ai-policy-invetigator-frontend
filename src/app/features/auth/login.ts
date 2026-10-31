import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, exhaustMap, map, of, startWith, Subject, tap } from 'rxjs';
import { Auth } from '../../core/auth';
import { message } from '../../core/errors';
import { Icon } from '../../shared/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { safeReturnUrl } from '../../core/auth-navigation';
@Component({
  selector: 'app-login',
  imports: [FormsModule, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <main class="login-layout">
    <section class="login-story">
      <a class="brand" href="/"
        ><span class="brand-mark"><app-icon name="shield" /></span
        ><span>AI Policy<br />Investigator</span></a
      >
      <div class="login-intro">
        <span class="small-tag">Policy intelligence, with evidence</span>
        <h1>Understand what<br />a policy change<br />sets in motion.</h1>
        <p>
          Trace requirements across your policies and procedures. Investigate potential conflicts.
          Keep people in control.
        </p>
        <div class="login-principles">
          <span><app-icon name="link" />Source-grounded findings</span
          ><span><app-icon name="shield" />Access-aware investigations</span
          ><span><app-icon name="check" />Human review, always</span>
        </div>
      </div>
      <p class="login-footer">Meta Global AI Developer Hackathon 2026</p>
    </section>
    <section class="login-form-area">
      <form class="login-form" (ngSubmit)="submit()">
        <span class="section-icon"><app-icon name="lock" /></span>
        <h2>Welcome back</h2>
        <p>Sign in to your policy workspace.</p>
        @if (auth.notice()) {
          <div class="alert" role="status">{{ auth.notice() }}</div>
        }
        @if (state().error) {
          <div class="alert danger" role="alert">{{ state().error }}</div>
        }
        <label for="email">Work email</label
        ><input
          id="email"
          name="email"
          type="email"
          autocomplete="username"
          required
          maxlength="254"
          [ngModel]="email()"
          (ngModelChange)="email.set($event)"
          placeholder="you@organization.com"
        />
        <label for="password">Password</label
        ><input
          id="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          [ngModel]="password()"
          (ngModelChange)="password.set($event)"
        />
        <button
          class="button primary full-width"
          type="submit"
          [disabled]="state().busy || !email() || !password()"
        >
          {{ state().busy ? 'Signing in…' : 'Sign in' }}<app-icon name="right" />
        </button>
        <p class="login-security">
          <app-icon name="shield" />Your access follows your current department permissions.
        </p>
      </form>
    </section>
  </main>`,
  styleUrl: './login.scss',
})
export class Login {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly email = signal('');
  readonly password = signal('');
  private readonly attempts = new Subject<{ email: string; password: string }>();
  readonly state = toSignal(
    this.attempts.pipe(
      exhaustMap((c) =>
        this.auth.login(c.email, c.password).pipe(
          tap(() => {
            this.password.set('');
            void this.router.navigateByUrl(
              safeReturnUrl(this.router, this.route.snapshot.queryParamMap.get('returnUrl')),
              { replaceUrl: true },
            );
          }),
          map(() => ({ busy: false, error: '' })),
          catchError((e) =>
            of({
              busy: false,
              error: e.status === 401 ? 'The email or password was not accepted.' : message(e),
            }),
          ),
          startWith({ busy: true, error: '' }),
        ),
      ),
    ),
    { initialValue: { busy: false, error: '' } },
  );
  submit() {
    if (this.email() && this.password() && !this.state().busy)
      this.attempts.next({ email: this.email().trim(), password: this.password() });
  }
}
