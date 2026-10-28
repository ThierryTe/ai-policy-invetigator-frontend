import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Observable,
  catchError,
  from,
  map,
  mergeMap,
  of,
  startWith,
  switchMap,
  throwError,
  toArray,
} from 'rxjs';
import { Api } from '../../core/api';
import { Progress, label } from '../../core/contracts';
import { message } from '../../core/errors';
import { Workspace } from '../../core/workspace';
import { Icon } from '../../shared/icon';

type KnownInvestigation = { id: string; label: string };
export type AuthorizedRecent = KnownInvestigation & { progress: Progress };

/** There is no list API: revalidate only IDs created in this memory-only session. */
export function authorizedRecent(
  api: Pick<Api, 'progress'>,
  known: KnownInvestigation[],
): Observable<AuthorizedRecent[]> {
  return from(known.map((item, index) => ({ item, index }))).pipe(
    mergeMap(
      ({ item, index }) =>
        api.progress(item.id).pipe(
          map((progress) => ({ index, item: { ...item, progress } as AuthorizedRecent | null })),
          catchError((error) =>
            [403, 404].includes(error.status)
              ? of({ index, item: null as AuthorizedRecent | null })
              : throwError(() => error),
          ),
        ),
      3,
    ),
    toArray(),
    map((rows) =>
      rows.sort((a, b) => a.index - b.index).flatMap((row) => (row.item ? [row.item] : [])),
    ),
  );
}

@Component({
  selector: 'app-recent-investigations',
  imports: [RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state().busy) {
      <section class="panel">
        <div class="loading-bar"></div>
        <p class="empty" role="status">Checking current investigation access…</p>
      </section>
    } @else if (state().error) {
      <section class="panel">
        <div class="panel-body">
          <p class="alert danger" role="alert">{{ state().error }}</p>
          <button type="button" class="button" (click)="reload()">Retry retrieval</button>
        </div>
      </section>
    } @else if (state().items.length) {
      <section class="panel">
        <header class="panel-header">
          <div>
            <h2>Recent investigations</h2>
            <p>Created this session · Current access checked</p>
          </div>
          <button
            type="button"
            class="icon-button"
            aria-label="Refresh recent investigations"
            (click)="reload()"
          >
            <app-icon name="refresh" />
          </button>
        </header>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Investigation</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (item of state().items; track item.id) {
                <tr>
                  <td>
                    <strong>{{ item.label }}</strong
                    ><br /><small>{{ item.id }}</small>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.green]="item.progress.state === 'COMPLETED'"
                      [class.amber]="item.progress.state === 'PARTIAL'"
                      [class.red]="item.progress.state === 'FAILED'"
                      >{{ label(item.progress.state) }}</span
                    >
                  </td>
                  <td>
                    <a class="button small" [routerLink]="['/investigations', item.id]">Open</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <footer class="panel-body caption muted">
          This list clears on sign-out. Open earlier investigations using their saved links or IDs.
        </footer>
      </section>
    } @else {
      <ng-content />
    }
  `,
})
export class RecentInvestigations {
  private readonly api = inject(Api);
  private readonly workspace = inject(Workspace);
  private readonly refresh = signal(0);
  readonly label = label;
  readonly state = toSignal(
    toObservable(
      computed(() => ({ known: this.workspace.recent(), refresh: this.refresh() })),
    ).pipe(
      switchMap(({ known }) =>
        authorizedRecent(this.api, known).pipe(
          map((items) => ({ items, busy: false, error: '' })),
          catchError((error) =>
            of({ items: [] as AuthorizedRecent[], busy: false, error: message(error) }),
          ),
          startWith({ items: [] as AuthorizedRecent[], busy: true, error: '' }),
        ),
      ),
    ),
    { initialValue: { items: [] as AuthorizedRecent[], busy: true, error: '' } },
  );
  reload() {
    this.refresh.update((value) => value + 1);
  }
}
