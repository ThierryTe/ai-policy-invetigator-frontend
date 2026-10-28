import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth';
import { isUuid } from '../../core/contracts';
import { Workspace } from '../../core/workspace';
import { Icon } from '../../shared/icon';
@Component({
  selector: 'app-investigations',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="breadcrumb">
      Workspace<app-icon name="right" /><span>Investigations</span>
    </div>
    <header class="page-heading">
      <div>
        <h1>Investigations</h1>
        <p>Open a policy change investigation or start a new one</p>
      </div>
      @if (auth.canUpload()) {
        <a class="button primary" routerLink="/investigations/new"
          ><app-icon name="play" />Run investigation</a
        >
      }
    </header>
    <section class="panel">
      <div class="panel-body">
        <h2>Open an investigation</h2>
        <p class="caption muted">
          Use its shared link or investigation ID. Current access to all contributing documents is
          required.
        </p>
        <form class="inline" (ngSubmit)="open()">
          <label class="sr-only" for="investigation-id">Investigation ID</label
          ><input
            id="investigation-id"
            name="id"
            required
            [ngModel]="id()"
            (ngModelChange)="id.set($event)"
            placeholder="Investigation UUID"
          /><button type="submit" class="button primary" [disabled]="!valid(id())">Open</button>
        </form>
      </div>
    </section>
    <section class="panel" style="margin-top:20px">
      <header class="panel-header">
        <div>
          <h2>Created this session</h2>
          <p>This list clears on sign-out. Save an investigation link to return later.</p>
        </div>
      </header>
      @for (item of workspace.recent(); track item.id) {
        <div class="panel-body" style="border-top:1px solid var(--line)">
          <a [routerLink]="['/investigations', item.id]">{{ item.label }}</a>
          <p class="caption muted" style="margin:5px 0 0">{{ item.id }}</p>
        </div>
      } @empty {
        <div class="empty">
          <app-icon name="search" />
          <p>No investigations created in this session yet.</p>
        </div>
      }
    </section>`,
})
export class Directory {
  readonly auth = inject(Auth);
  readonly workspace = inject(Workspace);
  private readonly router = inject(Router);
  readonly id = signal('');
  readonly valid = isUuid;
  open() {
    if (isUuid(this.id())) void this.router.navigate(['/investigations', this.id()]);
  }
}
