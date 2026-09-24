import { describe, expect, it } from 'vitest';
import { DEFAULT_COLUMNS, type Voter } from '../types';
import { buildExportRows, summarizeByStatus } from './buildExportRows';

function makeVoter(overrides: Partial<Voter>): Voter {
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
    const voters: Voter[] = [
      makeVoter({ id: '1', name: 'Zeke Mailed', status: 'mailed' }),
      makeVoter({ id: '2', name: 'Bob Todo', status: 'todo' }),
      makeVoter({ id: '3', name: 'Amy Todo', status: 'todo' }),
      makeVoter({ id: '4', name: 'Cara Writing', status: 'writing' }),
    ];

    expect(buildExportRows(voters, DEFAULT_COLUMNS).map((r) => r.name)).toEqual([
      'Amy Todo',
      'Bob Todo',
      'Cara Writing',
      'Zeke Mailed',
    ]);
  });

  it('maps status to the existing COLUMN_LABELS strings', () => {
    const voters: Voter[] = [
      makeVoter({ id: '1', status: 'stamped' }),
      makeVoter({ id: '2', status: 'mailed' }),
    ];

    expect(buildExportRows(voters, DEFAULT_COLUMNS).map((r) => r.status)).toEqual(['Stamp Applied', 'Mailed']);
  });

  it('carries through address fields unchanged', () => {
    const voters: Voter[] = [
      makeVoter({ id: '1', street: '456 Oak Ave', city: 'Metropolis', state: 'NY', zip: '10001' }),
    ];

    expect(buildExportRows(voters, DEFAULT_COLUMNS)[0]).toEqual({
      name: 'Jane Doe',
      street: '456 Oak Ave',
      city: 'Metropolis',
      state: 'NY',
      zip: '10001',
      status: 'TODO',
    });
  });

  it('does not mutate the input array', () => {
    const voters: Voter[] = [
      makeVoter({ id: '1', name: 'Zeke', status: 'mailed' }),
      makeVoter({ id: '2', name: 'Amy', status: 'todo' }),
    ];
    const original = [...voters];

    buildExportRows(voters, DEFAULT_COLUMNS);

    expect(voters).toEqual(original);
  });
});

describe('summarizeByStatus', () => {
  it('handles an empty voter list', () => {
    expect(summarizeByStatus([], DEFAULT_COLUMNS)).toBe('0 voters');
  });

  it('uses singular "voter" for exactly one voter', () => {
    expect(summarizeByStatus([makeVoter({ status: 'todo' })], DEFAULT_COLUMNS)).toBe('1 voter — 1 todo');
  });

  it('summarizes counts per status in board order, omitting zero-count statuses', () => {
    const voters: Voter[] = [
      makeVoter({ id: '1', status: 'mailed' }),
      makeVoter({ id: '2', status: 'mailed' }),
      makeVoter({ id: '3', status: 'todo' }),
      makeVoter({ id: '4', status: 'stamped' }),
    ];

    expect(summarizeByStatus(voters, DEFAULT_COLUMNS)).toBe('4 voters — 1 todo, 1 stamp applied, 2 mailed');
  });

  it('sorts and labels according to a custom, reordered column list', () => {
    const customColumns = [
      { id: 'inbox', label: 'Inbox' },
      { id: 'drafting', label: 'Drafting' },
      { id: 'sent', label: 'Sent' },
    ];
    const voters: Voter[] = [
      makeVoter({ id: '1', name: 'Zeke Sent', status: 'sent' }),
      makeVoter({ id: '2', name: 'Amy Inbox', status: 'inbox' }),
      makeVoter({ id: '3', name: 'Cara Drafting', status: 'drafting' }),
    ];

    expect(buildExportRows(voters, customColumns).map((r) => ({ name: r.name, status: r.status }))).toEqual([
      { name: 'Amy Inbox', status: 'Inbox' },
      { name: 'Cara Drafting', status: 'Drafting' },
      { name: 'Zeke Sent', status: 'Sent' },
    ]);
    expect(summarizeByStatus(voters, customColumns)).toBe('3 voters — 1 inbox, 1 drafting, 1 sent');
  });
});
