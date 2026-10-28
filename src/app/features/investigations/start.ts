import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  exhaustMap,
  forkJoin,
  map,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { InvestigationCreate, Policy, Version } from '../../core/contracts';
import { message } from '../../core/errors';
import { Workspace } from '../../core/workspace';
import { Icon } from '../../shared/icon';
@Component({
  selector: 'app-start-investigation',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="breadcrumb">
      <a routerLink="/investigations">Investigations</a><app-icon name="right" /><span
        >New investigation</span
      >
    </div>
    <header class="page-heading">
      <div>
        <h1>Run an investigation</h1>
        <p>Compare a policy change against a precise procedure scope</p>
      </div>
    </header>
    <form class="panel" (ngSubmit)="submit()" style="max-width:1050px">
      <div class="panel-body">
        @if (!auth.canUpload()) {
          <div class="alert warning">
            Starting an investigation requires current write permission on the replacement policy.
          </div>
        }
        @if (catalog().error) {
          <div class="alert danger" role="alert">{{ catalog().error }}</div>
        }
        <div class="field-row">
          <div class="field">
            <label for="investigation-policy">Policy</label
            ><select
              id="investigation-policy"
              name="policy"
              required
              [ngModel]="policyId()"
              (ngModelChange)="policyId.set($event); baseline.set(''); replacement.set('')"
            >
              <option value="">Choose a policy</option>
              @for (p of catalog().items; track p.id) {
                @if (p.kind === 'POLICY') {
                  <option [value]="p.id">
                    {{ p.title }}{{ p.externalProcessingAllowed ? '' : ' — consent needed' }}
                  </option>
                }
              }
            </select>
          </div>
          <div class="field">
            <label for="analysis-date">Analysis date</label
            ><input
              id="analysis-date"
              name="analysisDate"
              type="date"
              required
              [ngModel]="date()"
              (ngModelChange)="date.set($event)"
            />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for="baseline">Baseline version</label
            ><select
              id="baseline"
              name="baseline"
              required
              [ngModel]="baseline()"
              (ngModelChange)="baseline.set($event)"
            >
              <option value="">Choose baseline</option>
              @for (v of policyVersions().items; track v.id) {
                <option [value]="v.id" [disabled]="v.status !== 'INDEXED'">
                  Version {{ v.sequence }} · {{ v.effective_date }} · {{ v.status }}
                </option>
              }
            </select>
          </div>
          <div class="field">
            <label for="replacement">Replacement version</label
            ><select
              id="replacement"
              name="replacement"
              required
              [ngModel]="replacement()"
              (ngModelChange)="replacement.set($event)"
            >
              <option value="">Choose replacement</option>
              @for (v of policyVersions().items; track v.id) {
                <option
                  [value]="v.id"
                  [disabled]="v.previous_id !== baseline() || v.status !== 'INDEXED'"
                >
                  Version {{ v.sequence }} · {{ v.effective_date }} · {{ v.status }}
                </option>
              }
            </select>
          </div>
        </div>
        @if (policyVersions().error || procedures().error) {
          <div class="alert danger" role="alert">
            {{ policyVersions().error || procedures().error }}
          </div>
        }
        <div class="divider"></div>
        <h2>Procedure scope</h2>
        <p class="caption muted">
          Select one to four indexed procedure versions. Only the selected scope will be
          investigated.
        </p>
        @for (p of catalog().items; track p.id) {
          @if (p.kind === 'PROCEDURE') {
            <div class="choice-row">
              <input
                type="checkbox"
                [id]="'procedure-' + p.id"
                [checked]="selectedProcedures().some(hasPolicy(p.id))"
                [disabled]="
                  !selectedProcedures().some(hasPolicy(p.id)) && selectedProcedures().length >= 4
                "
                (change)="toggleProcedure(p, $any($event.target).checked)"
              /><label [for]="'procedure-' + p.id"
                >{{ p.title
                }}<small>{{
                  p.externalProcessingAllowed
                    ? 'External processing allowed'
                    : 'Administrator consent required before running'
                }}</small></label
              >
            </div>
          }
        }
        <div class="pager">
          <button
            type="button"
            class="button small"
            [disabled]="page() === 0"
            (click)="page.set(page() - 1)"
          >
            Previous documents</button
          ><span>Page {{ page() + 1 }} · Selections persist across pages</span
          ><button
            type="button"
            class="button small"
            [disabled]="catalog().items.length < 25"
            (click)="page.set(page() + 1)"
          >
            Next documents
          </button>
        </div>
        @if (selectedProcedures().length) {
          <h3 style="margin-top:22px">Selected procedures</h3>
          @for (p of selectedProcedures(); track p.id) {
            <div class="field">
              <label [for]="'version-' + p.id">{{ p.title }}</label
              ><select
                [id]="'version-' + p.id"
                [name]="'version-' + p.id"
                [ngModel]="procedureVersions()[p.id] || ''"
                (ngModelChange)="setProcedureVersion(p.id, $event)"
              >
                <option value="">Choose indexed version</option>
                @for (v of procedures().versions[p.id] || []; track v.id) {
                  <option [value]="v.id" [disabled]="v.status !== 'INDEXED'">
                    Version {{ v.sequence }} · {{ v.effective_date }} · {{ v.status }}
                  </option>
                }
              </select>
            </div>
          }
        }
        <p class="required-note">
          Selected document content will be sent to Meta after the server rechecks current access
          and administrator consent. Findings are potential issues and require human review.
        </p>
        @if (state().error) {
          <div class="alert danger" role="alert">{{ state().error }}</div>
        }
        <div class="dialog-footer">
          <a class="button" routerLink="/overview">Cancel</a
          ><button type="submit" class="button primary" [disabled]="!valid() || state().busy">
            <app-icon name="play" />{{ state().busy ? 'Starting…' : 'Start investigation' }}
          </button>
        </div>
      </div>
    </form>`,
})
export class StartInvestigation {
  readonly auth = inject(Auth);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly workspace = inject(Workspace);
  readonly page = signal(0);
  readonly policyId = signal('');
  readonly baseline = signal('');
  readonly replacement = signal('');
  readonly date = signal(new Date().toISOString().slice(0, 10));
  readonly selectedProcedures = signal<Policy[]>([]);
  readonly procedureVersions = signal<Record<string, string>>({});
  readonly catalog = toSignal(
    toObservable(this.page).pipe(
      switchMap((page) =>
        this.api.policies(page).pipe(
          map((items) => ({ items, error: '' })),
          catchError((e) => of({ items: [] as Policy[], error: message(e) })),
        ),
      ),
    ),
    { initialValue: { items: [] as Policy[], error: '' } },
  );
  readonly policyVersions = toSignal(
    toObservable(this.policyId).pipe(
      switchMap((id) =>
        id
          ? this.api.versions(id).pipe(
              map((items) => ({ items, error: '' })),
              catchError((e) => of({ items: [] as Version[], error: message(e) })),
            )
          : of({ items: [] as Version[], error: '' }),
      ),
    ),
    { initialValue: { items: [] as Version[], error: '' } },
  );
  readonly procedures = toSignal(
    toObservable(this.selectedProcedures).pipe(
      switchMap((rows) =>
        rows.length
          ? forkJoin(
              rows.map((p) => this.api.versions(p.id).pipe(map((items) => [p.id, items] as const))),
            ).pipe(
              map((entries) => ({
                versions: Object.fromEntries(entries) as Record<string, Version[]>,
                error: '',
              })),
              catchError((e) =>
                of({ versions: {} as Record<string, Version[]>, error: message(e) }),
              ),
            )
          : of({ versions: {} as Record<string, Version[]>, error: '' }),
      ),
    ),
    { initialValue: { versions: {} as Record<string, Version[]>, error: '' } },
  );
  readonly valid = computed(
    () =>
      this.auth.canUpload() &&
      !!this.baseline() &&
      this.policyVersions().items.some(
        (v) =>
          v.id === this.replacement() &&
          v.previous_id === this.baseline() &&
          v.status === 'INDEXED',
      ) &&
      !!this.date() &&
      this.selectedProcedures().length > 0 &&
      this.selectedProcedures().every((p) => this.procedureVersions()[p.id]),
  );
  private readonly commands = new Subject<InvestigationCreate>();
  readonly state = toSignal(
    this.commands.pipe(
      exhaustMap((body) =>
        this.api.start(body).pipe(
          tap((result) => {
            this.workspace.remember(result.id, 'Policy change investigation');
            void this.router.navigate(['/investigations', result.id]);
          }),
          map(() => ({ busy: false, error: '' })),
          catchError((e) => of({ busy: false, error: message(e) })),
          startWith({ busy: true, error: '' }),
        ),
      ),
    ),
    { initialValue: { busy: false, error: '' } },
  );
  hasPolicy(id: string) {
    return (p: Policy) => p.id === id;
  }
  toggleProcedure(p: Policy, checked: boolean) {
    this.selectedProcedures.update((rows) =>
      checked ? [...rows, p].slice(0, 4) : rows.filter((r) => r.id !== p.id),
    );
  }
  setProcedureVersion(id: string, version: string) {
    this.procedureVersions.update((v) => ({ ...v, [id]: version }));
  }
  submit() {
    if (!this.valid() || this.state().busy) return;
    this.commands.next({
      baselineVersionId: this.baseline(),
      replacementVersionId: this.replacement(),
      procedureVersionIds: this.selectedProcedures().map((p) => this.procedureVersions()[p.id]),
      analysisDate: this.date(),
    });
  }
}
