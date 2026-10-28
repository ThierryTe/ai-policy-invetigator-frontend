import { Modal } from './modal';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Api } from '../core/api';
import { message } from '../core/errors';
import { Icon } from './icon';
@Component({
  selector: 'app-pdf-viewer',
  imports: [Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="overlay" (click)="closed.emit()">
    <section
      class="pdf-dialog"
      appModal
      role="dialog"
      aria-modal="true"
      aria-label="Source PDF"
      (click)="$event.stopPropagation()"
      (keydown.escape)="closed.emit()"
      tabindex="-1"
    >
      <header>
        <div>
          <strong>{{ title() }}</strong>
          <p>Immutable source document · Page {{ page() }}</p>
        </div>
        <button type="button" class="icon-button" aria-label="Close PDF" (click)="closed.emit()">
          <app-icon name="x" />
        </button>
      </header>
      @if (state().error) {
        <p role="alert" class="alert">{{ state().error }}</p>
      } @else if (trusted()) {
        <iframe title="Authorized source PDF" [src]="trusted()"></iframe>
      } @else {
        <p class="empty">Loading authorized PDF…</p>
      }
    </section>
  </div>`,
  styles:
    '.pdf-dialog{background:white;border-radius:14px;width:min(1100px,96vw);height:90dvh;display:flex;flex-direction:column;overflow:hidden}header{display:flex;justify-content:space-between;padding:18px 24px;border-bottom:1px solid var(--line)}p{margin:5px 0 0;color:var(--muted)}iframe{width:100%;flex:1;border:0;min-height:0}',
})
export class PdfViewer {
  readonly policy = input.required<string>();
  readonly version = input.required<string>();
  readonly title = input('Source PDF');
  readonly page = input(1);
  readonly closed = output<void>();
  private readonly api = inject(Api);
  private readonly sanitizer = inject(DomSanitizer);
  private blobUrl: string | null = null;
  readonly state = toSignal(
    toObservable(computed(() => [this.policy(), this.version()] as const)).pipe(
      switchMap(([policy, version]) => {
        this.revoke();
        return this.api.pdf(policy, version).pipe(
          map((blob) => {
            this.blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            return { url: this.blobUrl, error: '' };
          }),
          catchError((e) => of({ url: null, error: message(e) })),
          startWith({ url: null, error: '' }),
        );
      }),
    ),
    { initialValue: { url: null, error: '' } },
  );
  // Only a locally created PDF Blob URL reaches this trust boundary, never server HTML or a user URL.
  readonly trusted = computed(() =>
    this.state().url
      ? this.sanitizer.bypassSecurityTrustResourceUrl(this.state().url + '#page=' + this.page())
      : null,
  );
  constructor() {
    inject(DestroyRef).onDestroy(() => this.revoke());
  }
  private revoke() {
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.blobUrl = null;
  }
}
