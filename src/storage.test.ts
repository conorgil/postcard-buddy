import { beforeEach, describe, expect, it } from 'vitest';
import {
  addColumn,
  addVoter,
  addToSuspectQueue,
  canRedo,
  canUndo,
  createProject,
  dedupeKey,
  deleteColumn,
  deleteVoter,
  getColumns,
  getVotersForProject,
  getSuspectQueue,
  moveVoter,
  normalize,
  redo,
  removeFromSuspectQueue,
  renameColumn,
  renameProject,
  reorderColumns,
  undo,
} from './storage';
import { DEFAULT_COLUMNS, type Project } from './types';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

globalThis.localStorage = new MemoryStorage();

beforeEach(() => {
  localStorage.clear();
});

/** Every test in this file uses a distinct project name, so creation never actually fails. */
function mustCreateProject(name: string): Project {
  const project = createProject(name);
  if (!project) throw new Error(`expected to create project "${name}"`);
  return project;
}

describe('normalize', () => {
  it('lowercases, strips punctuation, and collapses whitespace', () => {
    expect(normalize('Daryl Walton Jr.')).toBe('daryl walton jr');
    expect(normalize('  Sandra   Gorrell ')).toBe('sandra gorrell');
    expect(normalize('#105')).toBe('105');
  });
});

describe('dedupeKey', () => {
  it('treats equivalent formatting as the same key', () => {
    const a = dedupeKey('p1', 'Daryl Walton Jr.', '158 Redwood Ave', 'Paterson', 'NJ', '07522');
    const b = dedupeKey('p1', 'daryl walton jr', '158 redwood ave', 'paterson', 'nj', '07522');
    expect(a).toBe(b);
  });

  it('ignores a ZIP+4 suffix when comparing', () => {
    const a = dedupeKey('p1', 'Forrest Alston', 'PO Box 331', 'Littleton', 'NC', '27850-0331');
    const b = dedupeKey('p1', 'Forrest Alston', 'PO Box 331', 'Littleton', 'NC', '27850');
    expect(a).toBe(b);
  });

  it('scopes the key to the project, so the same voter in two projects does not collide', () => {
    const a = dedupeKey('project-a', 'Sandra Gorrell', '14900 Coveshore Dr', 'Wake Forest', 'NC', '27587');
    const b = dedupeKey('project-b', 'Sandra Gorrell', '14900 Coveshore Dr', 'Wake Forest', 'NC', '27587');
    expect(a).not.toBe(b);
  });
});

describe('undo', () => {
  it('reports nothing to undo when no data mutation has happened yet', () => {
    expect(canUndo()).toBe(false);
  });

  it('reverts the most recent voter mutation', () => {
    const project = mustCreateProject('Test Project');
    addVoter(project.id, { name: 'A', street: '1 A St', city: 'X', state: 'NY', zip: '10001' });
    expect(canUndo()).toBe(true);

    const voter = addVoter(project.id, { name: 'B', street: '2 B St', city: 'X', state: 'NY', zip: '10001' });
    expect(getVotersForProject(project.id)).toHaveLength(2);

    deleteVoter(voter.id);
    expect(getVotersForProject(project.id)).toHaveLength(1);

    expect(undo()).toBe(true);
    expect(getVotersForProject(project.id).map((v) => v.name).sort()).toEqual(['A', 'B']);
  });

  it('returns false when the undo history is exhausted', () => {
    while (undo()) {
      // drain any history left over from earlier tests in this file
    }
    createProject('Only Project');
    expect(undo()).toBe(true);
    expect(undo()).toBe(false);
  });
});

describe('redo', () => {
  it('reports nothing to redo when nothing has been undone yet', () => {
    while (undo()) {
      // drain any undo history left over from earlier tests
    }
    createProject('Reset Project'); // a fresh mutation clears any accumulated redo history
    expect(canRedo()).toBe(false);
  });

  it('re-applies an undone mutation', () => {
    const project = mustCreateProject('Redo Project');
    const voter = addVoter(project.id, { name: 'C', street: '3 C St', city: 'X', state: 'NY', zip: '10001' });
    deleteVoter(voter.id);
    expect(getVotersForProject(project.id)).toHaveLength(0);

    expect(undo()).toBe(true);
    expect(getVotersForProject(project.id)).toHaveLength(1);
    expect(canRedo()).toBe(true);

    expect(redo()).toBe(true);
    expect(getVotersForProject(project.id)).toHaveLength(0);
  });

  it('clears redo history once a new mutation is made after an undo', () => {
    const project = mustCreateProject('Branch Project');
    addVoter(project.id, { name: 'D', street: '4 D St', city: 'X', state: 'NY', zip: '10001' });

    expect(undo()).toBe(true);
    expect(canRedo()).toBe(true);

    addVoter(project.id, { name: 'E', street: '5 E St', city: 'X', state: 'NY', zip: '10001' });
    expect(canRedo()).toBe(false);
    expect(redo()).toBe(false);
  });
});

describe('suspect queue', () => {
  it('is empty for a project with no pending review lines', () => {
    const project = mustCreateProject('Suspects Project');
    expect(getSuspectQueue(project.id)).toEqual([]);
  });

  it('appends new lines and skips exact duplicates already queued', () => {
    const project = mustCreateProject('Dedupe Project');
    addToSuspectQueue(project.id, ['line one', 'line two']);
    addToSuspectQueue(project.id, ['line two', 'line three']);
    expect(getSuspectQueue(project.id)).toEqual(['line one', 'line two', 'line three']);
  });

  it('scopes the queue per project', () => {
    const a = mustCreateProject('Project A');
    const b = mustCreateProject('Project B');
    addToSuspectQueue(a.id, ['only in A']);
    expect(getSuspectQueue(a.id)).toEqual(['only in A']);
    expect(getSuspectQueue(b.id)).toEqual([]);
  });

  it('removes one resolved line, leaving the rest queued', () => {
    const project = mustCreateProject('Resolve Project');
    addToSuspectQueue(project.id, ['keep me', 'remove me']);
    removeFromSuspectQueue(project.id, 'remove me');
    expect(getSuspectQueue(project.id)).toEqual(['keep me']);
  });

  it('does nothing when removing a line that is not queued', () => {
    const project = mustCreateProject('No-op Project');
    addToSuspectQueue(project.id, ['keep me']);
    removeFromSuspectQueue(project.id, 'never queued');
    expect(getSuspectQueue(project.id)).toEqual(['keep me']);
  });
});

describe('project name uniqueness', () => {
  it('rejects creating a project whose name (case-insensitively) already exists', () => {
    mustCreateProject('Unique Project');
    expect(createProject('unique project')).toBeNull();
    expect(createProject('  Unique Project  ')).toBeNull();
  });

  it('rejects renaming a project to a name another project already uses', () => {
    mustCreateProject('First Project');
    const second = mustCreateProject('Second Project');
    expect(renameProject(second.id, 'first project')).toBe(false);
  });

  it('allows renaming a project to its own current name', () => {
    const project = mustCreateProject('Same Name Project');
    expect(renameProject(project.id, 'Same Name Project')).toBe(true);
  });
});

describe('column defaults', () => {
  it('seeds a new project with the 5 default columns', () => {
    const project = mustCreateProject('Columns Default Project');
    expect(getColumns(project.id)).toEqual(DEFAULT_COLUMNS);
  });

  it('gives each project its own independent column list', () => {
    const a = mustCreateProject('Columns Project A');
    const b = mustCreateProject('Columns Project B');
    addColumn(a.id, 'Extra Column');
    expect(getColumns(a.id)).toHaveLength(DEFAULT_COLUMNS.length + 1);
    expect(getColumns(b.id)).toEqual(DEFAULT_COLUMNS);
  });
});

describe('addColumn', () => {
  it('appends a new column with the given label', () => {
    const project = mustCreateProject('Add Column Project');
    const column = addColumn(project.id, 'Follow Up');
    expect(column).not.toBeNull();
    expect(getColumns(project.id).at(-1)).toEqual(column);
  });

  it('rejects a label (case-insensitively) that already exists in the project', () => {
    const project = mustCreateProject('Add Duplicate Column Project');
    expect(addColumn(project.id, 'todo')).toBeNull();
    expect(addColumn(project.id, '  TODO  ')).toBeNull();
  });

  it('does not reject a label already used by a column in a different project', () => {
    const a = mustCreateProject('Cross Project A');
    const b = mustCreateProject('Cross Project B');
    expect(addColumn(a.id, 'Shared Label')).not.toBeNull();
    expect(addColumn(b.id, 'Shared Label')).not.toBeNull();
  });
});

describe('renameColumn', () => {
  it('renames an existing column', () => {
    const project = mustCreateProject('Rename Column Project');
    const [first] = getColumns(project.id);
    expect(renameColumn(project.id, first.id, 'Inbox')).toBe(true);
    expect(getColumns(project.id)[0].label).toBe('Inbox');
  });

  it('returns false for an unknown column id', () => {
    const project = mustCreateProject('Rename Unknown Column Project');
    expect(renameColumn(project.id, 'not-a-real-id', 'Whatever')).toBe(false);
  });

  it('returns false when another column already has that label', () => {
    const project = mustCreateProject('Rename Duplicate Column Project');
    const [first, second] = getColumns(project.id);
    expect(renameColumn(project.id, second.id, first.label)).toBe(false);
  });

  it('allows renaming a column to its own current label', () => {
    const project = mustCreateProject('Rename Same Label Column Project');
    const [first] = getColumns(project.id);
    expect(renameColumn(project.id, first.id, first.label)).toBe(true);
  });
});

describe('deleteColumn', () => {
  it('deletes an empty column', () => {
    const project = mustCreateProject('Delete Empty Column Project');
    const columns = getColumns(project.id);
    const last = columns.at(-1)!;
    expect(deleteColumn(project.id, last.id)).toEqual({ ok: true });
    expect(getColumns(project.id).find((c) => c.id === last.id)).toBeUndefined();
  });

  it('blocks deleting a column with voters until they are moved out', () => {
    const project = mustCreateProject('Delete Non-Empty Column Project');
    const columns = getColumns(project.id);
    const target = columns[1];
    const voter = addVoter(project.id, { name: 'A', street: '1 A St', city: 'X', state: 'NY', zip: '10001' });
    moveVoter(voter.id, target.id, null);

    expect(deleteColumn(project.id, target.id)).toEqual({ ok: false, reason: 'not-empty', voterCount: 1 });

    moveVoter(voter.id, columns[0].id, null);
    expect(deleteColumn(project.id, target.id)).toEqual({ ok: true });
  });

  it('blocks deleting the project\'s last remaining column', () => {
    const project = mustCreateProject('Delete Last Column Project');
    for (const column of [...getColumns(project.id)]) {
      const columns = getColumns(project.id);
      if (columns.length <= 1) break;
      deleteColumn(project.id, column.id);
    }
    const [onlyColumn] = getColumns(project.id);
    expect(deleteColumn(project.id, onlyColumn.id)).toEqual({ ok: false, reason: 'last-column' });
  });

  it('returns not-found for an unknown column id', () => {
    const project = mustCreateProject('Delete Unknown Column Project');
    expect(deleteColumn(project.id, 'not-a-real-id')).toEqual({ ok: false, reason: 'not-found' });
  });
});

describe('reorderColumns', () => {
  it('reorders columns given a permutation of their ids', () => {
    const project = mustCreateProject('Reorder Column Project');
    const ids = getColumns(project.id).map((c) => c.id);
    const reversed = [...ids].reverse();
    expect(reorderColumns(project.id, reversed)).toBe(true);
    expect(getColumns(project.id).map((c) => c.id)).toEqual(reversed);
  });

  it('rejects a list that is not a permutation, leaving the order unchanged', () => {
    const project = mustCreateProject('Reorder Invalid Column Project');
    const original = getColumns(project.id).map((c) => c.id);
    expect(reorderColumns(project.id, [...original, 'extra-id'])).toBe(false);
    expect(reorderColumns(project.id, original.slice(1))).toBe(false);
    expect(reorderColumns(project.id, [...original.slice(1), 'unknown-id'])).toBe(false);
    expect(getColumns(project.id).map((c) => c.id)).toEqual(original);
  });
});

describe('column migration backfill', () => {
  it('backfills the default columns for pre-existing projects with no stored columns', () => {
    const raw = {
      version: 1,
      projects: [{ id: 'legacy-project', name: 'Legacy Project', createdAt: '2025-01-01T00:00:00.000Z' }],
      activeProjectId: 'legacy-project',
      voters: [
        {
          id: 'legacy-voter',
          projectId: 'legacy-project',
          name: 'Legacy Voter',
          street: '1 Legacy St',
          city: 'X',
          state: 'NY',
          zip: '10001',
          status: 'todo',
          order: 0,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      suspectQueues: {},
    };
    localStorage.setItem('hello-fellow-voter:v1', JSON.stringify(raw));

    const columns = getColumns('legacy-project');
    expect(columns).toEqual(DEFAULT_COLUMNS);
    expect(columns.some((c) => c.id === 'todo')).toBe(true);
  });
});
