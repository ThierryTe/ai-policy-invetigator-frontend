import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { GraphNode, ImpactGraph, label } from '../../core/contracts';
import { Icon } from '../../shared/icon';
/** Fit the unchanged canvas with room for node outlines, without enlarging it. */
export function fitGraph(width: number, height: number, canvasHeight: number): number {
  if (![width, height, canvasHeight].every(Number.isFinite) || canvasHeight <= 0) return 0;
  return Math.max(0, Math.min(1, (width - 24) / 780, (height - 24) / canvasHeight));
}

export function layoutGraph(graph: ImpactGraph, selected: string | null, focus: boolean) {
  let visible = graph.nodes;
  if (focus && selected && graph.nodes.some((n) => n.id === selected)) {
    const ids = new Set([selected]);
    for (const e of graph.edges)
      if (e.source === selected || e.target === selected) {
        ids.add(e.source);
        ids.add(e.target);
      }
    for (const e of graph.edges)
      if (['MODIFIED', 'UNCHANGED'].includes(e.type) && ids.has(e.target)) ids.add(e.source);
    for (const n of graph.nodes) if (ids.has(n.id)) ids.add(n.versionId);
    visible = graph.nodes.filter((n) => ids.has(n.id));
  }
  const order = { BASELINE: 0, REPLACEMENT: 1, PROCEDURE: 2, REQUIREMENT: 3, FINDING: 4 };
  const versionNodes = visible
    .filter((n) => ['BASELINE', 'REPLACEMENT', 'PROCEDURE'].includes(n.type))
    .sort(
      (a, b) =>
        order[a.type] - order[b.type] || a.label.localeCompare(b.label) || a.id.localeCompare(b.id),
    );
  const requirements = visible
    .filter((n) => n.type === 'REQUIREMENT')
    .sort(
      (a, b) =>
        versionNodes.findIndex((v) => v.id === a.versionId) -
          versionNodes.findIndex((v) => v.id === b.versionId) || a.id.localeCompare(b.id),
    );
  const findings = visible.filter((n) => n.type === 'FINDING');
  const arranged = [
    ...versionNodes.map((n, i) => ({ ...n, x: 24, y: 28 + i * 126 })),
    ...requirements.map((n, i) => ({ ...n, x: 282, y: 28 + i * 126 })),
    ...findings.map((n, i) => ({ ...n, x: 540, y: (focus && selected ? 154 : 80) + i * 126 })),
  ];
  const ids = new Set(arranged.map((n) => n.id));
  return {
    nodes: arranged,
    edges: graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
    height: Math.max(330, ...arranged.map((n) => n.y + 124)),
  };
}
@Component({
  selector: 'app-impact-graph',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <section class="panel graph-panel" [class.expanded]="expanded()">
    <header class="panel-header">
      <div>
        <h2>Impact graph</h2>
        <p>Persisted policies, procedures, requirements and findings</p>
      </div>
      <button
        class="button small"
        type="button"
        (click)="expanded.update(toggle)"
        [attr.aria-label]="expanded() ? 'Collapse graph' : 'Expand graph'"
      >
        <app-icon [name]="expanded() ? 'x' : 'expand'" /><span>{{
          expanded() ? 'Close' : 'Expand'
        }}</span>
      </button>
    </header>
    <div class="graph-tools">
      <div class="legend">
        <span><i class="policy"></i>Policy</span><span><i class="procedure"></i>Procedure</span
        ><span><i class="requirement"></i>Requirement</span
        ><span><i class="finding"></i>Finding</span>
      </div>
      <div class="graph-actions">
        <button
          type="button"
          class="link-button caption"
          [attr.aria-pressed]="fitEnabled()"
          (click)="fitEnabled.set(true)"
        >
          Fit to view
        </button>
        <button
          type="button"
          class="link-button caption"
          [attr.aria-pressed]="!fitEnabled()"
          (click)="fitEnabled.set(false)"
        >
          100%
        </button>
        <button
          class="link-button caption"
          type="button"
          [disabled]="!selected()"
          (click)="focus.update(toggle)"
        >
          {{ focus() ? 'Full graph' : 'Focus finding' }}
        </button>
      </div>
    </div>
    @if (graph().nodes.length) {
      <div
        #viewport
        class="graph-viewport"
        tabindex="0"
        aria-label="Policy impact graph; choose 100% to scroll and explore"
      >
        <div
          class="graph-space"
          [style.width.px]="780 * scale() + 24"
          [style.height.px]="layout().height * scale() + 24"
        >
          <div
            class="graph-stage"
            [style.width.px]="780 * scale()"
            [style.height.px]="layout().height * scale()"
            [class.measuring]="dimensions().width === 0"
          >
            <div
              class="graph-canvas"
              [style.height.px]="layout().height"
              [style.transform]="'scale(' + scale() + ')'"
            >
              <svg width="780" [attr.height]="layout().height" aria-hidden="true">
                <defs>
                  <marker
                    [attr.id]="markerId"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto-start-reverse"
                  >
                    <path d="M0,0 L8,4 L0,8" fill="#9bacc5" />
                  </marker>
                </defs>
                @for (edge of layout().edges; track $index) {
                  <path
                    [attr.d]="path(edge.source, edge.target)"
                    [attr.marker-end]="'url(#' + markerId + ')'"
                    fill="none"
                    stroke="#9bacc5"
                    stroke-width="1.5"
                  >
                    <title>{{ edge.type }}</title>
                  </path>
                }
              </svg>
              @for (node of layout().nodes; track node.id) {
                <button
                  type="button"
                  class="graph-node"
                  [class]="'graph-node ' + color(node)"
                  [class.selected]="node.id === selected()"
                  [style.left.px]="node.x"
                  [style.top.px]="node.y"
                  [attr.aria-pressed]="node.id === selected()"
                  [attr.aria-label]="label(node.type) + ': ' + node.label"
                  (click)="chosen.emit(node)"
                >
                  <app-icon [name]="icon(node)" /><span class="node-content"
                    ><strong>{{
                      node.type === 'FINDING'
                        ? label(node.classification || 'Finding')
                        : label(node.type)
                    }}</strong
                    ><span>{{ node.label }}</span
                    ><small>{{
                      node.type === 'FINDING'
                        ? label(node.severity || 'None') + ' severity'
                        : node.id.slice(0, 8)
                    }}</small></span
                  >
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="empty">
        <app-icon name="graph" />
        <p>The impact graph appears as verified investigation data becomes available.</p>
      </div>
    }
    <footer class="graph-footer">
      <span>{{
        focus() && selected()
          ? 'Selected finding and its persisted links'
          : 'All persisted relationships in this investigation'
      }}</span
      ><span>{{ layout().nodes.length }} nodes · {{ layout().edges.length }} links</span>
    </footer>
  </section>`,
  styleUrl: './impact-graph.scss',
})
export class ImpactGraphComponent {
  readonly graph = input.required<ImpactGraph>();
  readonly selected = input<string | null>(null);
  readonly chosen = output<GraphNode>();
  readonly focus = signal(false);
  readonly fitEnabled = signal(true);
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  readonly dimensions = signal({ width: 0, height: 0 });
  readonly expanded = signal(false);
  readonly toggle = (v: boolean) => !v;
  readonly label = label;
  readonly markerId = 'impact-arrow-' + crypto.randomUUID();
  readonly layout = computed(() => layoutGraph(this.graph(), this.selected(), this.focus()));
  readonly scale = computed(() =>
    this.fitEnabled()
      ? fitGraph(this.dimensions().width, this.dimensions().height, this.layout().height)
      : 1,
  );
  constructor() {
    afterRenderEffect((onCleanup) => {
      const viewport = this.viewport()?.nativeElement;
      if (!viewport) return;
      const measure = () =>
        this.dimensions.set({ width: viewport.clientWidth, height: viewport.clientHeight });
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(viewport);
      onCleanup(() => observer.disconnect());
    });
  }
  path(source: string, target: string) {
    const a = this.layout().nodes.find((n) => n.id === source)!,
      b = this.layout().nodes.find((n) => n.id === target)!;
    const forward = b.x > a.x;
    const x1 = a.x + (forward ? 218 : 0),
      x2 = b.x + (forward ? 0 : 218);
    return `M${x1} ${a.y + 44} C${x1 + (forward ? 35 : -35)} ${a.y + 44},${x2 + (forward ? -35 : 35)} ${b.y + 44},${x2} ${b.y + 44}`;
  }
  color(n: GraphNode) {
    return n.type === 'FINDING'
      ? n.classification === 'NO_CONFLICT'
        ? 'procedure'
        : n.classification === 'CONTRADICTION'
          ? 'finding'
          : 'ambiguous'
      : n.type === 'PROCEDURE'
        ? 'procedure'
        : n.type === 'REQUIREMENT'
          ? 'requirement'
          : 'policy';
  }
  icon(n: GraphNode) {
    return n.type === 'FINDING'
      ? n.classification === 'NO_CONFLICT'
        ? 'check'
        : 'alert'
      : n.type === 'PROCEDURE'
        ? 'settings'
        : n.type === 'REQUIREMENT'
          ? 'list'
          : 'document';
  }
}
