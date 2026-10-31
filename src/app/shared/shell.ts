import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../core/auth';
import { Icon } from './icon';
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` @if (auth.identity()) {
    <div class="workspace" [class.mobile-nav]="menu()">
      <aside class="sidebar">
        <a class="brand" routerLink="/overview" (click)="menu.set(false)"
          ><span class="brand-mark"><app-icon name="shield" /></span
          ><span>AI Policy<br />Investigator</span></a
        >
        <nav aria-label="Main navigation">
          @for (item of navigation; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active" (click)="menu.set(false)"
              ><app-icon [name]="item.icon" /><span>{{ item.title }}</span></a
            >
          }
        </nav>
        <div class="sidebar-footer">
          <span class="agency-icon"><app-icon name="building" /></span>
          <div><strong>Policy workspace</strong><span>Evidence · Access · Review</span></div>
        </div>
      </aside>
      <div class="workspace-body">
        <header class="topbar">
          <button
            type="button"
            class="icon-button menu-toggle"
            aria-label="Toggle navigation"
            [attr.aria-expanded]="menu()"
            (click)="menu.update(toggle)"
          >
            <app-icon name="menu" />
          </button>
          <form class="workspace-search" (submit)="search($event)">
            <app-icon name="search" /><input
              aria-label="Search policy titles"
              placeholder="Search policies in your workspace…"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
          </form>
          <div class="account">
            <span class="secure-label"><app-icon name="shield" /> Secure workspace</span
            ><span class="avatar">{{ initials() }}</span>
            <div class="account-details">
              <strong>{{ auth.identity()?.user?.email }}</strong
              ><span>{{ role() }}</span>
            </div>
            <button type="button" class="icon-button" aria-label="Sign out" (click)="auth.logout()">
              <app-icon name="logout" />
            </button>
          </div>
        </header>
        <main class="workspace-content"><router-outlet /></main>
      </div>
    </div>
  }`,
  styleUrl: './shell.scss',
})
export class Shell {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  readonly menu = signal(false);
  readonly query = signal('');
  readonly toggle = (v: boolean) => !v;
  readonly initials = computed(() => this.auth.identity()?.user.email.slice(0, 2).toUpperCase());
  readonly role = computed(() =>
    [...new Set(this.auth.identity()?.memberships.map((m) => m.role.toLowerCase()))].join(', '),
  );
  readonly navigation = [
    { title: 'Overview', route: '/overview', icon: 'home' },
    { title: 'Investigations', route: '/investigations', icon: 'search' },
    { title: 'Policies', route: '/policies', icon: 'document' },
    { title: 'Evidence', route: '/evidence', icon: 'note' },
    { title: 'Evaluations', route: '/evaluations', icon: 'chart' },
    { title: 'Settings', route: '/settings', icon: 'settings' },
  ];
  search(event: Event) {
    event.preventDefault();
    void this.router.navigate(['/policies'], { queryParams: { q: this.query() || null } });
  }
}
