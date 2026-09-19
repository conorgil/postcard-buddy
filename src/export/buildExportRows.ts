import { COLUMN_LABELS, COLUMN_ORDER, type Card } from '../types';

export interface ExportRow {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  status: string;
}

/** Sorts by board column order (todo → mailed), then alphabetically by name within each status. */
export function buildExportRows(cards: Card[]): ExportRow[] {
  return [...cards]
    .sort((a, b) => {
      const statusDiff = COLUMN_ORDER.indexOf(a.status) - COLUMN_ORDER.indexOf(b.status);
      return statusDiff !== 0 ? statusDiff : a.name.localeCompare(b.name);
    })
    .map((card) => ({
      name: card.name,
      street: card.street,
      city: card.city,
      state: card.state,
      zip: card.zip,
      status: COLUMN_LABELS[card.status],
    }));
}

/** e.g. "500 voters — 210 mailed, 150 stamped, 80 written, 40 writing, 20 todo" */
export function summarizeByStatus(cards: Card[]): string {
  const total = `${cards.length} voter${cards.length === 1 ? '' : 's'}`;
  if (cards.length === 0) return total;

  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.status, (counts.get(card.status) ?? 0) + 1);
  }

  const parts = COLUMN_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map(
    (status) => `${counts.get(status)} ${COLUMN_LABELS[status].toLowerCase()}`,
  );

  return `${total} — ${parts.join(', ')}`;
}
