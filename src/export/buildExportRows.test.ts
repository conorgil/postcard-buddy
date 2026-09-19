import { describe, expect, it } from 'vitest';
import type { Card } from '../types';
import { buildExportRows, summarizeByStatus } from './buildExportRows';

function makeCard(overrides: Partial<Card>): Card {
  return {
    id: overrides.id ?? 'id',
    projectId: 'project-1',
    name: 'Jane Doe',
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    status: 'todo',
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildExportRows', () => {
  it('groups by status in board order, then alphabetically by name within each group', () => {
    const cards: Card[] = [
      makeCard({ id: '1', name: 'Zeke Mailed', status: 'mailed' }),
      makeCard({ id: '2', name: 'Bob Todo', status: 'todo' }),
      makeCard({ id: '3', name: 'Amy Todo', status: 'todo' }),
      makeCard({ id: '4', name: 'Cara Writing', status: 'writing' }),
    ];

    expect(buildExportRows(cards).map((r) => r.name)).toEqual([
      'Amy Todo',
      'Bob Todo',
      'Cara Writing',
      'Zeke Mailed',
    ]);
  });

  it('maps status to the existing COLUMN_LABELS strings', () => {
    const cards: Card[] = [
      makeCard({ id: '1', status: 'stamped' }),
      makeCard({ id: '2', status: 'mailed' }),
    ];

    expect(buildExportRows(cards).map((r) => r.status)).toEqual(['Stamp Applied', 'Mailed']);
  });

  it('carries through address fields unchanged', () => {
    const cards: Card[] = [
      makeCard({ id: '1', street: '456 Oak Ave', city: 'Metropolis', state: 'NY', zip: '10001' }),
    ];

    expect(buildExportRows(cards)[0]).toEqual({
      name: 'Jane Doe',
      street: '456 Oak Ave',
      city: 'Metropolis',
      state: 'NY',
      zip: '10001',
      status: 'TODO',
    });
  });

  it('does not mutate the input array', () => {
    const cards: Card[] = [
      makeCard({ id: '1', name: 'Zeke', status: 'mailed' }),
      makeCard({ id: '2', name: 'Amy', status: 'todo' }),
    ];
    const original = [...cards];

    buildExportRows(cards);

    expect(cards).toEqual(original);
  });
});

describe('summarizeByStatus', () => {
  it('handles an empty card list', () => {
    expect(summarizeByStatus([])).toBe('0 voters');
  });

  it('uses singular "voter" for exactly one card', () => {
    expect(summarizeByStatus([makeCard({ status: 'todo' })])).toBe('1 voter — 1 todo');
  });

  it('summarizes counts per status in board order, omitting zero-count statuses', () => {
    const cards: Card[] = [
      makeCard({ id: '1', status: 'mailed' }),
      makeCard({ id: '2', status: 'mailed' }),
      makeCard({ id: '3', status: 'todo' }),
      makeCard({ id: '4', status: 'stamped' }),
    ];

    expect(summarizeByStatus(cards)).toBe('4 voters — 1 todo, 1 stamp applied, 2 mailed');
  });
});
