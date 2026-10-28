import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, exhaustMap, map, of, startWith, Subject } from 'rxjs';
import { Auth } from '../../core/auth';
import { message } from '../../core/errors';
import { Icon } from '../../shared/icon';
@Component({
  selector: 'app-settings',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="breadcrumb">Workspace<app-icon name="right" /><span>Settings</span></div>
    <header class="page-heading">
      <div>
        <h1>Workspace access</h1>
        <p>Your current identity and department memberships</p>
      </div>
      <button type="button" class="button" [disabled]="state().busy" (click)="refresh.next()">
        <app-icon name="refresh" />Refresh access
      </button>
    </header>
    <section class="panel">
      <div class="panel-body">
        <h2>{{ auth.identity()?.user?.email }}</h2>
        <p class="caption muted">
          Session expires after 15 minutes. Access is checked by the server on every request.
        </p>
      </div>
      @if (state().error) {
        <p class="alert danger" role="alert">{{ state().error }}</p>
      }
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Current role</th>
            </tr>
          </thead>
          <tbody>
            @for (m of auth.identity()?.memberships; track m.department_id) {
              <tr>
                <td>{{ m.department_name }}</td>
                <td>
                  <span class="badge blue">{{ m.role }}</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="panel-body">
        <p class="required-note">
          Role or document access changes are administered outside this interface. Review actions
          require current Reviewer or Admin membership in the policy’s owning department.
        </p>
      </div>
    </section>`,
})
export class Settings {
  readonly auth = inject(Auth);
  readonly refresh = new Subject<void>();
  readonly state = toSignal(
    this.refresh.pipe(
      exhaustMap(() =>
        this.auth.refreshIdentity().pipe(
          map(() => ({ busy: false, error: '' })),
          catchError((e) => of({ busy: false, error: message(e) })),
          startWith({ busy: true, error: '' }),
        ),
      ),
    ),
    { initialValue: { busy: false, error: '' } },
  );
}
