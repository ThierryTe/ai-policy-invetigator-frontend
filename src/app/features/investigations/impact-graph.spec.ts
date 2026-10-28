import { ImpactGraph } from '../../core/contracts';
import { fitGraph, layoutGraph } from './impact-graph';
const graph: ImpactGraph = {
  investigationId: 'i',
  complete: true,
  nodes: [
    {
      id: 'p',
      type: 'REPLACEMENT',
      label: 'Policy',
      versionId: 'p',
      classification: null,
      severity: null,
    },
    {
      id: 'r',
      type: 'REQUIREMENT',
      label: 'Train',
      versionId: 'p',
      classification: null,
      severity: null,
    },
    {
      id: 'f',
      type: 'FINDING',
      label: 'Conflict',
      versionId: 'proc',
      classification: 'CONTRADICTION',
      severity: 'HIGH',
    },
    {
      id: 'proc',
      type: 'PROCEDURE',
      label: 'Procedure',
      versionId: 'proc',
      classification: null,
      severity: null,
    },
    {
      id: 'other',
      type: 'FINDING',
      label: 'Another finding',
      versionId: 'proc',
      classification: 'AMBIGUITY',
      severity: 'LOW',
    },
  ],
  edges: [
    { source: 'p', target: 'r', type: 'CONTAINS' },
    { source: 'r', target: 'f', type: 'ASSESSED_AS' },
    { source: 'f', target: 'proc', type: 'AFFECTS' },
    { source: 'r', target: 'other', type: 'ASSESSED_AS' },
  ],
};
describe('Impact graph projection', () => {
  it('focuses the selected persisted finding and its contributing version without invented links', () => {
    const view = layoutGraph(graph, 'f', true);
    expect(view.nodes.map((n) => n.id)).toEqual(['p', 'proc', 'r', 'f']);
    expect(view.edges).toHaveLength(3);
    for (const e of view.edges) expect(graph.edges).toContainEqual(e);
  });
  it('keeps graph edge endpoints within visible nodes', () => {
    const view = layoutGraph(graph, 'f', true);
    const ids = new Set(view.nodes.map((n) => n.id));
    for (const e of view.edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
  });
  it('can show every persisted node when focus is disabled', () =>
    expect(layoutGraph(graph, 'f', false).nodes).toHaveLength(5));
});

describe('Initial graph fit', () => {
  it('fits every node of a tall canvas in the existing desktop panel', () => {
    const scale = fitGraph(790, 418, 1280);
    expect(scale).toBeGreaterThan(0);
    expect(780 * scale + 24).toBeLessThanOrEqual(790);
    expect(1280 * scale + 24).toBeLessThanOrEqual(418);
  });
  it('fits the same layout into a mobile viewport without horizontal clipping', () => {
    const scale = fitGraph(330, 345, 656);
    expect(780 * scale + 24).toBeLessThanOrEqual(330);
    expect(656 * scale + 24).toBeLessThanOrEqual(345);
  });
  it('does not enlarge nodes when an expanded viewport has spare space', () =>
    expect(fitGraph(1400, 900, 500)).toBe(1));
  it('handles not-yet-measured or hidden viewports without invalid transforms', () => {
    expect(fitGraph(0, 0, 500)).toBe(0);
    expect(fitGraph(300, 300, Number.NaN)).toBe(0);
  });
  it('recomputes a wider fit without changing persisted node coordinates or links', () => {
    const before = layoutGraph(graph, 'f', false);
    expect(fitGraph(340, 345, before.height)).toBeLessThan(fitGraph(1000, 700, before.height));
    expect(layoutGraph(graph, 'f', false)).toEqual(before);
  });
});
