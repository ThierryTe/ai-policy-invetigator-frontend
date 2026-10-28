import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  exhaustMap,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
  takeWhile,
  throwError,
  timer,
} from 'rxjs';
import { Api } from '../../core/api';
import { Auth } from '../../core/auth';
import {
  Bundle,
  Evidence,
  Finding,
  GraphNode,
  isUuid,
  label,
  Reference,
  terminal,
} from '../../core/contracts';
import { message } from '../../core/errors';
import { Icon } from '../../shared/icon';
import { PdfViewer } from '../../shared/pdf-viewer';
import { ImpactGraphComponent } from './impact-graph';
import { FindingPanel } from './finding-panel';
import { RecentInvestigations } from './recent-investigations';
interface Load {
  busy: boolean;
  error: string;
  data: Bundle | null;
}
interface Sourced {
  reference: Reference;
  evidence: Evidence;
}
@Component({
  selector: 'app-investigation-dashboard',
  imports: [
    RouterLink,
    Icon,
    ImpactGraphComponent,
    FindingPanel,
    PdfViewer,
    DecimalPipe,
    RecentInvestigations,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  readonly id = input<string>();
  readonly auth = inject(Auth);
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  readonly label = label;
  readonly refresh = signal(0);
  readonly selectedId = signal<string | null>(null);
  readonly filter = signal('ALL');
  readonly copied = signal(false);
  readonly pdf = signal<{ policy: string; version: string; title: string; page: number } | null>(
    null,
  );
  readonly state = toSignal(
    toObservable(computed(() => ({ id: this.id(), refresh: this.refresh() }))).pipe(
      switchMap(({ id }) => {
        if (!id) return of<Load>({ busy: false, error: '', data: null });
        if (!isUuid(id))
          return of<Load>({ busy: false, error: 'Enter a valid investigation ID.', data: null });
        return timer(0, 1800).pipe(
          exhaustMap(() =>
            this.api.progress(id).pipe(
              switchMap((progress) =>
                terminal(progress.state)
                  ? forkJoin({
                      findings: this.api.findings(id),
                      graph: this.api.graph(id),
                      extractions: this.api.requirements(id),
                    }).pipe(map((rest) => ({ progress, ...rest })))
                  : of<Bundle>({ progress, findings: null, graph: null, extractions: [] }),
              ),
            ),
          ),
          takeWhile((data) => !terminal(data.progress.state), true),
          map((data) => ({ busy: false, error: '', data })),
          catchError((e) => of<Load>({ busy: false, error: message(e), data: null })),
          startWith<Load>({ busy: true, error: '', data: null }),
        );
      }),
    ),
    { initialValue: { busy: false, error: '', data: null } as Load },
  );
  readonly allFindings = computed(() => this.state().data?.findings?.payload?.assessments ?? []);
  readonly findings = computed(() =>
    this.allFindings().filter((f) => this.filter() === 'ALL' || f.classification === this.filter()),
  );
  readonly selected = computed<Finding | null>(
    () => this.findings().find((f) => f.id === this.selectedId()) ?? this.findings()[0] ?? null,
  );
  readonly index = computed(() => this.findings().findIndex((f) => f.id === this.selected()?.id));
  readonly review = computed(() =>
    this.state().data?.findings?.reviews.find((r) => r.findingId === this.selected()?.id),
  );
  readonly complete = computed(
    () =>
      this.state().data?.progress.state === 'COMPLETED' &&
      this.state().data?.findings?.payload?.complete === true,
  );
  readonly kpis = computed(() => {
    const b = this.state().data,
      replacement = b?.graph?.nodes.find((n) => n.type === 'REPLACEMENT')?.versionId;
    const total = this.allFindings().length;
    return [
      {
        title: 'Rules analyzed',
        value: this.complete()
          ? (b?.extractions.find((e) => e.version_id === replacement)?.payload.requirements
              .length ?? 0)
          : '—',
        detail: 'Replacement policy requirements',
        icon: 'document',
        color: 'blue',
      },
      {
        title: 'Potential conflicts',
        value: this.complete()
          ? this.allFindings().filter((f) => f.classification === 'CONTRADICTION').length
          : '—',
        detail: 'Potential contradictions to review',
        icon: 'alert',
        color: 'red',
      },
      {
        title: 'Missing requirements',
        value: this.complete()
          ? this.allFindings().filter((f) => f.classification === 'MISSING_REQUIREMENT').length
          : '—',
        detail: 'Within selected procedure scope',
        icon: 'list',
        color: 'blue',
      },
      {
        title: 'Evidence coverage',
        value:
          this.complete() && total
            ? Math.round(
                (this.allFindings().filter((f) => f.sourceReferences.length >= 2).length / total) *
                  100,
              ) + '%'
            : '—',
        detail: 'Source coverage, not AI accuracy',
        icon: 'shield',
        color: 'green',
      },
    ];
  });
  readonly evidence = toSignal(
    toObservable(this.selected).pipe(
      switchMap((f) => {
        if (!f) return of({ busy: false, error: '', denied: false, items: [] as Sourced[] });
        return forkJoin(
          f.sourceReferences.map((reference) =>
            this.api
              .evidence(reference.sourceId)
              .pipe(
                switchMap((evidence) =>
                  evidence.id === reference.sourceId && evidence.excerpt.includes(reference.quote)
                    ? of({ reference, evidence })
                    : throwError(() => new Error('Citation mismatch')),
                ),
              ),
          ),
        ).pipe(
          map((items) => ({ busy: false, error: '', denied: false, items })),
          catchError((e) =>
            of({
              busy: false,
              error: message(e),
              denied: [403, 404].includes(e.status),
              items: [] as Sourced[],
            }),
          ),
          startWith({ busy: true, error: '', denied: false, items: [] as Sourced[] }),
        );
      }),
    ),
    { initialValue: { busy: false, error: '', denied: false, items: [] as Sourced[] } },
  );
  readonly documents = computed(() => [
    ...new Map(
      this.evidence().items.map((item) => [item.evidence.version_id, item.evidence]),
    ).values(),
  ]);
  readonly title = computed(() => {
    const f = this.selected();
    return (
      this.state()
        .data?.extractions.flatMap((e) => e.payload.requirements)
        .find((r) => r.id === f?.policyRequirementId)?.action ?? 'Policy requirement impact'
    );
  });
  readonly classifications = [
    'ALL',
    'CONTRADICTION',
    'MISSING_REQUIREMENT',
    'AMBIGUITY',
    'NO_CONFLICT',
  ];
  selectStep(delta: number) {
    const f = this.findings()[this.index() + delta];
    if (f) this.selectedId.set(f.id);
  }
  chooseNode(node: GraphNode) {
    if (node.type === 'FINDING') {
      this.filter.set('ALL');
      this.selectedId.set(node.id);
      return;
    }
    const ext = this.state().data?.extractions.find((e) => e.version_id === node.versionId);
    const req =
      node.type === 'REQUIREMENT'
        ? ext?.payload.requirements.find((r) => r.id === node.id)
        : ext?.payload.requirements[0];
    if (req?.sourceReferences[0]) this.openSource(req.sourceReferences[0]);
  }
  openSource(ref: Reference) {
    void this.router.navigate(['/evidence'], { queryParams: { source: ref.sourceId } });
  }
  documentTitle(version: string) {
    return (
      this.state().data?.graph?.nodes.find((n) => n.id === version)?.label ?? 'Source document'
    );
  }
  openPdf(evidence: Evidence) {
    this.pdf.set({
      policy: evidence.policy_id,
      version: evidence.version_id,
      title: this.documentTitle(evidence.version_id),
      page: evidence.page_number,
    });
  }
  reload() {
    this.pdf.set(null);
    this.refresh.update((n) => n + 1);
  }
  async copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }
}
