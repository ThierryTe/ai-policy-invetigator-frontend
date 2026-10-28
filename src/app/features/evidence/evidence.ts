import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, merge, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { Api } from '../../core/api';
import { Evidence, isUuid } from '../../core/contracts';
import { message } from '../../core/errors';
import { Icon } from '../../shared/icon';
import { PdfViewer } from '../../shared/pdf-viewer';
@Component({
  selector: 'app-evidence',
  imports: [FormsModule, Icon, PdfViewer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="breadcrumb">Workspace<app-icon name="right" /><span>Evidence</span></div>
    <header class="page-heading">
      <div>
        <h1>Source evidence</h1>
        <p>Exact excerpts, immutable versions and page references</p>
      </div>
    </header>
    <section class="panel">
      <div class="panel-body">
        <form class="inline" (ngSubmit)="lookup.next(id())">
          <label class="sr-only" for="source-id">Source ID</label
          ><input
            id="source-id"
            name="sourceId"
            placeholder="Enter a source ID from an investigation citation"
            [ngModel]="id()"
            (ngModelChange)="id.set($event)"
            required
          /><button class="button primary" type="submit" [disabled]="!valid(id()) || state().busy">
            Find source
          </button>
        </form>
      </div>
      @if (state().busy) {
        <div class="loading-bar"></div>
      }
      @if (state().error) {
        <div class="panel-body">
          <p class="alert danger" role="alert">{{ state().error }}</p>
        </div>
      }
      @if (state().item; as item) {
        <div class="panel-body">
          <div class="page-heading">
            <div>
              <h2>Page {{ item.page_number }}</h2>
              <p class="caption">
                Version {{ item.version_id.slice(0, 8) }} · Source {{ item.id.slice(0, 8) }}
              </p>
            </div>
            <button type="button" class="button" (click)="pdf.set(true)">
              <app-icon name="eye" />Open source PDF
            </button>
          </div>
          <blockquote class="source-excerpt">{{ item.excerpt }}</blockquote>
          <div class="required-note">
            Source verified against the stored document. Page {{ item.page_number }} · Unicode
            offsets {{ item.start_offset }}–{{ item.end_offset }}. A matching quotation establishes
            source correspondence, not the correctness of an interpretation.
          </div>
        </div>
      } @else if (!state().busy && !state().error) {
        <div class="empty">
          <app-icon name="note" />
          <h2>Follow the evidence</h2>
          <p>
            Open a citation from an investigation, or enter its source ID here. Current document
            permissions apply to every lookup.
          </p>
        </div>
      }
    </section>
    @if (pdf() && state().item; as item) {
      <app-pdf-viewer
        [policy]="item.policy_id"
        [version]="item.version_id"
        [page]="item.page_number"
        (closed)="pdf.set(false)"
      />
    }`,
  styles:
    '.source-excerpt{white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;line-height:1.9;background:#f6f9fe;border-left:4px solid #568eff;margin:10px 0 24px;padding:22px}',
})
export class EvidencePage {
  private readonly api = inject(Api);
  readonly id = signal('');
  readonly pdf = signal(false);
  readonly lookup = new Subject<string>();
  readonly valid = isUuid;
  readonly state = toSignal(
    merge(
      inject(ActivatedRoute).queryParamMap.pipe(map((p) => p.get('source') ?? '')),
      this.lookup,
    ).pipe(
      tap((id) => {
        this.id.set(id);
        this.pdf.set(false);
      }),
      switchMap((id) =>
        id
          ? isUuid(id)
            ? this.api.evidence(id).pipe(
                map((item) => ({ item: item as Evidence | null, busy: false, error: '' })),
                catchError((e) => of({ item: null, busy: false, error: message(e) })),
                startWith({ item: null, busy: true, error: '' }),
              )
            : of({ item: null, busy: false, error: 'Enter a valid source ID.' })
          : of({ item: null, busy: false, error: '' }),
      ),
    ),
    { initialValue: { item: null as Evidence | null, busy: false, error: '' } },
  );
}
