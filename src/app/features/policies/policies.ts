import { Modal } from '../../shared/modal';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, exhaustMap, map, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import { Policy, Version, label } from '../../core/contracts';
import { message } from '../../core/errors';
import { Icon } from '../../shared/icon';
import { PdfViewer } from '../../shared/pdf-viewer';
@Component({
  selector: 'app-policies',
  imports: [FormsModule, DatePipe, Icon, PdfViewer, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './policies.html',
})
export class Policies {
  readonly increment = (n: number) => n + 1;
  readonly auth = inject(Auth);
  private readonly api = inject(Api);
  readonly label = label;
  readonly page = signal(0);
  readonly refresh = signal(0);
  readonly query = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((p) => p.get('q')?.toLowerCase() ?? '')),
    { initialValue: '' },
  );
  readonly selected = signal<Policy | null>(null);
  readonly mode = signal<'POLICY' | 'PROCEDURE' | 'VERSION' | null>(null);
  readonly title = signal('');
  readonly department = signal('');
  readonly date = signal(new Date().toISOString().slice(0, 10));
  readonly file = signal<File | null>(null);
  readonly fileError = signal('');
  readonly pdf = signal<Version | null>(null);
  readonly departments = computed(
    () =>
      this.auth.identity()?.memberships.filter((m) => ['ANALYST', 'ADMIN'].includes(m.role)) ?? [],
  );
  readonly canWriteSelected = computed(() => !!this.selected() && this.auth.canUpload());
  readonly canConsent = computed(
    () =>
      this.auth
        .identity()
        ?.memberships.some(
          (m) => m.department_id === this.selected()?.departmentId && m.role === 'ADMIN',
        ) ?? false,
  );
  readonly listing = toSignal(
    toObservable(computed(() => ({ page: this.page(), refresh: this.refresh() }))).pipe(
      switchMap(({ page }) =>
        this.api.policies(page).pipe(
          map((items) => ({ items, error: '', busy: false })),
          catchError((e) => of({ items: [] as Policy[], error: message(e), busy: false })),
          startWith({ items: [] as Policy[], error: '', busy: true }),
        ),
      ),
    ),
    { initialValue: { items: [] as Policy[], error: '', busy: true } },
  );
  readonly visible = computed(() =>
    this.listing().items.filter((p) => p.title.toLowerCase().includes(this.query())),
  );
  readonly history = toSignal(
    toObservable(computed(() => ({ id: this.selected()?.id, refresh: this.refresh() }))).pipe(
      switchMap(({ id }) =>
        id
          ? this.api.versions(id).pipe(
              map((items) => ({ items, busy: false, error: '' })),
              catchError((e) => of({ items: [] as Version[], busy: false, error: message(e) })),
              startWith({ items: [] as Version[], busy: true, error: '' }),
            )
          : of({ items: [] as Version[], busy: false, error: '' }),
      ),
    ),
    { initialValue: { items: [] as Version[], busy: false, error: '' } },
  );
  private readonly uploads = new Subject<{ data: FormData; policy?: string }>();
  readonly uploadState = toSignal(
    this.uploads.pipe(
      exhaustMap((command) =>
        this.api.upload(command.data, command.policy).pipe(
          switchMap((upload) =>
            this.api
              .pollJob(upload.jobId)
              .pipe(
                map((job) => ({
                  busy: !['COMPLETED', 'FAILED'].includes(job.status),
                  error:
                    job.status === 'FAILED'
                      ? 'Ingestion failed: ' + label(job.error_code || 'unknown error')
                      : '',
                  stage: label(job.stage),
                  jobId: upload.jobId,
                  done: job.status === 'COMPLETED',
                })),
              ),
          ),
          tap((state) => {
            if (state.done) {
              this.mode.set(null);
              this.file.set(null);
              this.refresh.update((n) => n + 1);
            }
          }),
          catchError((e) =>
            of({ busy: false, error: message(e), stage: '', jobId: '', done: false }),
          ),
          startWith({ busy: true, error: '', stage: 'Uploading PDF', jobId: '', done: false }),
        ),
      ),
    ),
    { initialValue: { busy: false, error: '', stage: '', jobId: '', done: false } },
  );
  private readonly consents = new Subject<{ policy: string; allowed: boolean }>();
  readonly consentState = toSignal(
    this.consents.pipe(
      exhaustMap((c) =>
        this.api.consent(c.policy, c.allowed).pipe(
          tap(() => {
            this.selected.update((p) =>
              p?.id === c.policy ? { ...p, externalProcessingAllowed: c.allowed } : p,
            );
            this.refresh.update((n) => n + 1);
          }),
          map(() => ({ busy: false, error: '' })),
          catchError((e) => of({ busy: false, error: message(e) })),
          startWith({ busy: true, error: '' }),
        ),
      ),
    ),
    { initialValue: { busy: false, error: '' } },
  );
  chooseFile(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0] ?? null;
    const valid =
      f && f.name.toLowerCase().endsWith('.pdf') && f.size <= 10 * 1024 * 1024 && f.size > 0;
    this.file.set(valid ? f : null);
    this.fileError.set(f && !valid ? 'Choose a nonempty PDF up to 10 MB.' : '');
  }
  open(mode: 'POLICY' | 'PROCEDURE' | 'VERSION') {
    this.mode.set(mode);
    this.title.set('');
    this.file.set(null);
    this.fileError.set('');
    this.department.set(this.departments()[0]?.department_id ?? '');
  }
  submit() {
    if (!this.file() || this.uploadState().busy || !this.date()) return;
    const data = new FormData();
    data.append('file', this.file()!);
    data.append('effectiveDate', this.date());
    let policy: string | undefined;
    if (this.mode() === 'VERSION') {
      const previous = this.history().items.at(-1);
      if (!previous || !this.selected()) return;
      policy = this.selected()!.id;
      data.append('previousVersionId', previous.id);
    } else {
      if (!this.title().trim() || !this.department()) return;
      data.append('title', this.title().trim());
      data.append('departmentId', this.department());
      data.append('kind', this.mode()!);
    }
    this.uploads.next({ data, policy });
  }
  consent(allowed: boolean) {
    if (this.selected() && this.canConsent())
      this.consents.next({ policy: this.selected()!.id, allowed });
  }
}
