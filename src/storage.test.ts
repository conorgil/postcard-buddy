import { describe, expect, it } from 'vitest';
import { dedupeKey, normalize } from './storage';

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
