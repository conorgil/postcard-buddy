import { describe, expect, it } from 'vitest';
import { groupItemsIntoLines, type PositionedTextItem } from './extractLines';

describe('groupItemsIntoLines', () => {
  it('joins items on the same baseline into one line, left-to-right', () => {
    const items: PositionedTextItem[] = [
      { str: 'Dr,', x: 120, y: 500 },
      { str: 'Sandra', x: 20, y: 500 },
      { str: '14900', x: 60, y: 500 },
      { str: 'Gorrell', x: 40, y: 500 },
    ];
    expect(groupItemsIntoLines(items)).toEqual(['Sandra Gorrell 14900 Dr,']);
  });

  it('splits items on different baselines into separate lines, top to bottom', () => {
    const items: PositionedTextItem[] = [
      { str: 'second line', x: 10, y: 400 },
      { str: 'first line', x: 10, y: 500 },
    ];
    expect(groupItemsIntoLines(items)).toEqual(['first line', 'second line']);
  });

  it('tolerates small baseline jitter within the same row', () => {
    const items: PositionedTextItem[] = [
      { str: 'A', x: 10, y: 500.0 },
      { str: 'B', x: 20, y: 501.2 },
      { str: 'C', x: 30, y: 499.5 },
    ];
    expect(groupItemsIntoLines(items)).toEqual(['A B C']);
  });

  it('ignores blank/whitespace-only items', () => {
    const items: PositionedTextItem[] = [
      { str: 'Hello', x: 10, y: 500 },
      { str: '   ', x: 20, y: 500 },
      { str: 'World', x: 30, y: 500 },
    ];
    expect(groupItemsIntoLines(items)).toEqual(['Hello World']);
  });
});
