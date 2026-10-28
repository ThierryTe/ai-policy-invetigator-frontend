import { Modal } from '../../shared/modal';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, exhaustMap, map, of, startWith, Subject, tap } from 'rxjs';
import { Api } from '../../core/api';
import { Finding, label, Reference, ReviewAction, ReviewState } from '../../core/contracts';
import { message } from '../../core/errors';
import { Icon } from '../../shared/icon';
@Component({
  selector: 'app-finding-panel',
  imports: [Icon, FormsModule, DatePipe, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <section class="panel finding-panel">
      <header class="panel-header">
        <h2>Selected finding</h2>
        <div class="finding-pager">
          <button
            type="button"
            class="icon-button"
            aria-label="Previous finding"
            [disabled]="index() === 0"
            (click)="step.emit(-1)"
          >
            <app-icon name="left" /></button
          ><span>{{ index() + 1 }} of {{ total() }}</span
          ><button
            type="button"
            class="icon-button"
            aria-label="Next finding"
            [disabled]="index() >= total() - 1"
            (click)="step.emit(1)"
          >
            <app-icon name="right" />
          </button>
        </div>
      </header>
      <div class="finding-heading">
        <div class="inline">
          <span
            class="badge"
            [class.red]="finding().severity === 'HIGH'"
            [class.amber]="finding().severity === 'MEDIUM' || finding().severity === 'LOW'"
            [class.green]="finding().classification === 'NO_CONFLICT'"
            ><app-icon [name]="finding().classification === 'NO_CONFLICT' ? 'check' : 'alert'" />{{
              finding().classification === 'NO_CONFLICT'
                ? 'No conflict'
                : label(finding().severity) + ' severity'
            }}</span
          ><span class="badge neutral">{{
            label(review()?.status || finding().reviewStatus)
          }}</span>
        </div>
        <h3>{{ title() }}</h3>
        <p>{{ label(finding().classification) }} · {{ finding().id.slice(0, 8) }}</p>
      </div>
      <div class="tabs" role="tablist" aria-label="Finding details">
        @for (item of tabs; track item) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === item"
            [class.active]="tab() === item"
            (click)="tab.set(item)"
          >
            {{ item }}
            @if (item === 'Evidence') {
              ({{ finding().sourceReferences.length }})
            }
            @if (item === 'History') {
              ({{ review()?.history?.length || 0 }})
            }
          </button>
        }
      </div>
      <div class="finding-body" role="tabpanel" [attr.aria-label]="tab()">
        @switch (tab()) {
          @case ('Overview') {
            <h4>AI explanation</h4>
            <p>{{ finding().rationale }}</p>
            @if (finding().suggestedAction) {
              <div class="suggestion">
                <span><app-icon name="info" /></span>
                <div>
                  <h4>Suggested action</h4>
                  <p>{{ finding().suggestedAction }}</p>
                </div>
              </div>
            }
            <p class="review-disclaimer">
              Potential issue for human review. A source citation does not prove the AI
              interpretation is correct.
            </p>
          }
          @case ('Evidence') {
            @for (ref of finding().sourceReferences; track $index) {
              <blockquote>
                {{ ref.quote
                }}<button type="button" class="link-button caption" (click)="source.emit(ref)">
                  Open verified source <app-icon name="right" />
                </button>
              </blockquote>
            }
          }
          @case ('Impact') {
            <h4>Scope and applicability</h4>
            <p>{{ finding().scopeExplanation }}</p>
            <h4>Related procedure requirements</h4>
            @if (finding().relatedProcedureRequirementIds.length) {
              @for (id of finding().relatedProcedureRequirementIds; track id) {
                <p class="caption muted">Requirement {{ id.slice(0, 8) }}</p>
              }
            } @else {
              <p class="caption muted">
                No related explicit requirement was identified in the selected procedure.
              </p>
            }
          }
          @case ('History') {
            @if (review()?.history?.length) {
              <ol class="history">
                @for (event of review()!.history; track event.id) {
                  <li>
                    <strong>{{ label(event.action) }}</strong
                    ><span>{{ event.createdAt | date: 'medium' }}</span
                    ><small>Reviewer {{ event.reviewerId }}</small>
                    @if (event.note) {
                      <p>{{ event.note }}</p>
                    }
                  </li>
                }
              </ol>
            } @else {
              <p class="muted">No human review actions yet.</p>
            }
          }
        }
        @if (state().error) {
          <div class="alert danger" role="alert">{{ state().error }}</div>
        }
        @if (canReview()) {
          <div class="review-actions">
            <button
              type="button"
              class="button confirm"
              [disabled]="state().busy"
              (click)="send('CONFIRM')"
            >
              <app-icon name="check" />Confirm</button
            ><button
              type="button"
              class="button dismiss"
              [disabled]="state().busy"
              (click)="send('DISMISS')"
            >
              <app-icon name="x" />Dismiss</button
            ><button
              type="button"
              class="button outline-blue"
              [disabled]="state().busy"
              (click)="noteOpen.set(true)"
            >
              <app-icon name="note" />Add note
            </button>
          </div>
          @if (state().busy) {
            <p role="status" class="caption muted">Saving review…</p>
          }
        } @else {
          <p class="read-only">
            <app-icon name="lock" />Review requires Reviewer or Admin access in the policy’s
            department.
          </p>
        }
      </div>
    </section>
    @if (noteOpen()) {
      <div class="overlay">
        <form
          class="dialog"
          appModal
          role="dialog"
          aria-modal="true"
          aria-label="Add review note"
          (ngSubmit)="send('ADD_NOTE')"
        >
          <header class="dialog-header">
            <div>
              <h2>Add review note</h2>
              <p class="caption muted">Your identity and timestamp will be recorded.</p>
            </div>
            <button
              type="button"
              class="icon-button"
              aria-label="Close note"
              (click)="noteOpen.set(false)"
            >
              <app-icon name="x" />
            </button>
          </header>
          <div class="dialog-body">
            <label for="review-note">Note</label
            ><textarea
              id="review-note"
              name="note"
              rows="5"
              maxlength="2000"
              required
              [ngModel]="note()"
              (ngModelChange)="note.set($event)"
              placeholder="Record your assessment of this finding…"
            ></textarea>
            <p class="field-hint">
              {{ note().length }} / 2,000 characters. Notes are part of the permanent review
              history.
            </p>
            <div class="dialog-footer">
              <button type="button" class="button" (click)="noteOpen.set(false)">Cancel</button
              ><button
                type="submit"
                class="button primary"
                [disabled]="!note().trim() || state().busy"
              >
                Save note
              </button>
            </div>
          </div>
        </form>
      </div>
    }`,
  styleUrl: './finding-panel.scss',
})
export class FindingPanel {
  readonly investigationId = input.required<string>();
  readonly finding = input.required<Finding>();
  readonly review = input<ReviewState>();
  readonly canReview = input(false);
  readonly title = input('Policy requirement impact');
  readonly index = input(0);
  readonly total = input(0);
  readonly step = output<number>();
  readonly saved = output<void>();
  readonly source = output<Reference>();
  readonly permissionChanged = output<void>();
  readonly tabs = ['Overview', 'Evidence', 'Impact', 'History'];
  readonly tab = signal('Overview');
  readonly label = label;
  readonly noteOpen = signal(false);
  readonly note = signal('');
  private readonly api = inject(Api);
  private readonly actions = new Subject<{
    id: string;
    finding: string;
    action: ReviewAction;
    note: string | null;
  }>();
  readonly state = toSignal(
    this.actions.pipe(
      exhaustMap((a) =>
        this.api.review(a.id, a.finding, a.action, a.note).pipe(
          tap(() => {
            this.note.set('');
            this.noteOpen.set(false);
            this.saved.emit();
          }),
          map(() => ({ busy: false, error: '' })),
          catchError((e) => {
            if ([403, 404].includes(e.status)) this.permissionChanged.emit();
            return of({ busy: false, error: message(e) });
          }),
          startWith({ busy: true, error: '' }),
        ),
      ),
    ),
    { initialValue: { busy: false, error: '' } },
  );
  send(action: ReviewAction) {
    if (this.state().busy || !this.canReview() || (action === 'ADD_NOTE' && !this.note().trim()))
      return;
    this.actions.next({
      id: this.investigationId(),
      finding: this.finding().id,
      action,
      note: action === 'ADD_NOTE' ? this.note().trim() : null,
    });
  }
}
