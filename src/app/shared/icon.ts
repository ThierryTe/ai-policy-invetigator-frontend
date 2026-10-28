import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
const paths: Record<string, string[]> = {
  shield: ['M12 2 3 5v6c0 5 9 11 9 11s9-6 9-11V5Z', 'm8 12 3 3 5-6'],
  home: ['m3 10 9-7 9 7', 'M5 9v12h5v-7h4v7h5V9'],
  search: ['M21 21l-5-5', 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0'],
  document: ['M6 2h8l5 5v15H6Z', 'M14 2v6h5', 'M9 12h7M9 16h7'],
  chart: ['M5 21V10M12 21V3M19 21V7'],
  settings: [
    'm12 3 2 3 4-1 1 4 3 2-3 3-1 4-4-1-2 3-2-3-4 1-1-4-3-3 3-2 1-4 4 1Z',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  ],
  logout: ['M9 3H4v18h5M14 8l5 4-5 4M8 12h11'],
  upload: ['M12 16V3m-5 5 5-5 5 5', 'M3 15v6h18v-6'],
  play: ['m8 4 13 8-13 8Z'],
  check: ['m5 12 4 4L20 5'],
  x: ['m6 6 12 12M6 18 18 6'],
  alert: ['m12 3 10 18H2Z', 'M12 9v5m0 3v.1'],
  note: ['M3 3h18v14H9l-6 4Z'],
  list: ['M9 5h12M9 12h12M9 19h12', 'M3 5h1M3 12h1M3 19h1'],
  left: ['m15 5-7 7 7 7'],
  right: ['m9 5 7 7-7 7'],
  expand: ['M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5'],
  menu: ['M3 6h18M3 12h18M3 18h18'],
  plus: ['M12 4v16M4 12h16'],
  clock: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M12 7v5l3 2'],
  info: ['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', 'M12 11v6m0-10v.1'],
  link: [
    'm10 13 4-4',
    'M8 16l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0M16 8l2-2a3 3 0 0 1 4 4l-5 5a3 3 0 0 1-4 0',
  ],
  refresh: ['M20 7a9 9 0 1 0 1 8M20 2v6h-6'],
  graph: ['M5 6h5v5H5ZM15 14h5v5h-5Z', 'M10 8h7v6M7 11v6h8'],
  download: ['M12 3v13m-5-5 5 5 5-5M3 18v3h18v-3'],
  eye: ['M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
  building: ['m3 9 9-6 9 6H3M5 11v8m7-8v8m7-8v8M3 21h18'],
  mail: ['M3 5h18v14H3Z', 'm3 5 9 8 9-8'],
  lock: ['M5 10h14v11H5Z', 'M8 10V6a4 4 0 0 1 8 0v4'],
};
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">@for (path of drawing(); track $index) {<path [attr.d]="path"/>}</svg>',
  styles:
    ':host{display:inline-flex;width:1.25em;height:1.25em;flex-shrink:0;vertical-align:middle}svg{width:100%;height:100%}',
})
export class Icon {
  readonly name = input.required<string>();
  readonly drawing = computed(() => paths[this.name()] ?? paths['document']);
}
