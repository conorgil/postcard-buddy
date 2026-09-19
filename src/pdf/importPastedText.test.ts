import { beforeEach, describe, expect, it } from 'vitest';
import { createProject } from '../storage';
import { importPastedText } from './importPastedText';

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

describe('importPastedText', () => {
  it('imports clean data rows and ignores true noise, with no suspected lines', () => {
    const project = createProject('Clean Project');
    const result = importPastedText(
      project.id,
      ['1 Sandra Gorrell 14900 Coveshore Dr, Wake Forest, NC 27587', 'page 2 of 26', ''].join('\n'),
    );
    expect(result.importedCount).toBe(1);
    expect(result.suspectedLines).toEqual([]);
  });

  it('collects lines that look like addresses but have no real City, ST ZIP tail as suspected, without importing them', () => {
    const project = createProject('Suspect Project');
    const result = importPastedText(
      project.id,
      [
        '1 Sandra Gorrell 14900 Coveshore Dr, Wake Forest, NC 27587',
        'PHILADELPHIA, PA 19131 PHILADELPHIA, PA 19131',
        '5131 W. GIRARD PMB#1, 5131 W. GIRARD PMB#1,',
        'TERMS OF USE. These voter addresses are provided solely to address and mail',
      ].join('\n'),
    );
    expect(result.importedCount).toBe(1);
    expect(result.suspectedLines).toEqual([
      'PHILADELPHIA, PA 19131 PHILADELPHIA, PA 19131',
      '5131 W. GIRARD PMB#1, 5131 W. GIRARD PMB#1,',
    ]);
  });
});
