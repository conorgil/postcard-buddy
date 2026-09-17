import { addCards, dedupeKey, getCardsForProject } from '../storage';
import type { Card } from '../types';
import { extractAllLines } from './extractLines';
import { looksLikeDataRow, parseVoterLine } from './parseVoterLine';

export interface ImportResult {
  importedCount: number;
  duplicateCount: number;
  skippedCount: number;
}

export async function importPdf(projectId: string, file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const lines = await extractAllLines(buf);

  const existingCards = getCardsForProject(projectId);
  const existingKeys = new Set(
    existingCards.map((c) => dedupeKey(projectId, c.name, c.street, c.city, c.state, c.zip)),
  );

  let nextOrder =
    existingCards.filter((c) => c.status === 'todo').reduce((max, c) => Math.max(max, c.order), -1) + 1;

  const newCards: Card[] = [];
  let imported = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const line of lines) {
    if (!looksLikeDataRow(line)) continue; // header/footer/front-matter — not a failure

    const record = parseVoterLine(line);
    if (!record) {
      skipped++;
      continue;
    }

    const key = dedupeKey(projectId, record.name, record.street, record.city, record.state, record.zip);
    if (existingKeys.has(key)) {
      duplicates++;
      continue;
    }
    existingKeys.add(key);

    newCards.push({
      id: crypto.randomUUID(),
      projectId,
      name: record.name,
      street: record.street,
      city: record.city,
      state: record.state,
      zip: record.zip,
      status: 'todo',
      order: nextOrder++,
      createdAt: new Date().toISOString(),
    });
    imported++;
  }

  addCards(newCards);

  return { importedCount: imported, duplicateCount: duplicates, skippedCount: skipped };
}
