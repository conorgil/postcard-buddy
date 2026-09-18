import { beforeEach, describe, expect, it } from 'vitest';
import {
  addCard,
  canRedo,
  canUndo,
  createProject,
  dedupeKey,
  deleteCard,
  getCardsForProject,
  normalize,
  redo,
  undo,
} from './storage';

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

  it('reverts the most recent card mutation', () => {
    const project = createProject('Test Project');
    addCard(project.id, { name: 'A', street: '1 A St', city: 'X', state: 'NY', zip: '10001' });
    expect(canUndo()).toBe(true);

    const card = addCard(project.id, { name: 'B', street: '2 B St', city: 'X', state: 'NY', zip: '10001' });
    expect(getCardsForProject(project.id)).toHaveLength(2);

    deleteCard(card.id);
    expect(getCardsForProject(project.id)).toHaveLength(1);

    expect(undo()).toBe(true);
    expect(getCardsForProject(project.id).map((c) => c.name).sort()).toEqual(['A', 'B']);
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
    const project = createProject('Redo Project');
    const card = addCard(project.id, { name: 'C', street: '3 C St', city: 'X', state: 'NY', zip: '10001' });
    deleteCard(card.id);
    expect(getCardsForProject(project.id)).toHaveLength(0);

    expect(undo()).toBe(true);
    expect(getCardsForProject(project.id)).toHaveLength(1);
    expect(canRedo()).toBe(true);

    expect(redo()).toBe(true);
    expect(getCardsForProject(project.id)).toHaveLength(0);
  });

  it('clears redo history once a new mutation is made after an undo', () => {
    const project = createProject('Branch Project');
    addCard(project.id, { name: 'D', street: '4 D St', city: 'X', state: 'NY', zip: '10001' });

    expect(undo()).toBe(true);
    expect(canRedo()).toBe(true);

    addCard(project.id, { name: 'E', street: '5 E St', city: 'X', state: 'NY', zip: '10001' });
    expect(canRedo()).toBe(false);
    expect(redo()).toBe(false);
  });
});
