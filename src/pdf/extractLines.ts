import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
// The `?url` suffix tells Vite to emit the worker as its own hashed asset and
// give back its final (same-origin, relative) URL, so it's bundled locally
// into dist/ instead of being fetched from a CDN at runtime.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
}

/**
 * Groups positioned text items into lines by baseline Y (within a small
 * tolerance, since fonts/rounding can jitter a shared baseline by ~1pt),
 * then sorts each line's items left-to-right by X before joining. This is
 * pure and DOM/pdf.js-free so it can be unit tested with synthetic items.
 */
export function groupItemsIntoLines(items: PositionedTextItem[], yTolerance = 2): string[] {
  const nonEmpty = items.filter((it) => it.str.trim() !== '');
  const sorted = [...nonEmpty].sort((a, b) => b.y - a.y); // top of page first

  const rows: PositionedTextItem[][] = [];
  for (const item of sorted) {
    const row = rows.find((r) => Math.abs(r[0].y - item.y) <= yTolerance);
    if (row) row.push(item);
    else rows.push([item]);
  }

  return rows.map((row) =>
    [...row]
      .sort((a, b) => a.x - b.x)
      .map((it) => it.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

export async function extractAllLines(data: ArrayBuffer): Promise<string[]> {
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const lines: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: PositionedTextItem[] = content.items
      .filter((it): it is TextItem => 'str' in it)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    lines.push(...groupItemsIntoLines(items));
  }
  return lines;
}
