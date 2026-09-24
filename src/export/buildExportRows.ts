import type { Column, Voter } from '../types';

export interface ExportRow {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  status: string;
}

/** Sorts by board column order (first column → last), then alphabetically by name within each status. */
export function buildExportRows(voters: Voter[], columns: Column[]): ExportRow[] {
  const indexOf = (status: string) => columns.findIndex((c) => c.id === status);
  const labelOf = (status: string) => columns.find((c) => c.id === status)?.label ?? status;
  return [...voters]
    .sort((a, b) => {
      const statusDiff = indexOf(a.status) - indexOf(b.status);
      return statusDiff !== 0 ? statusDiff : a.name.localeCompare(b.name);
    })
    .map((voter) => ({
      name: voter.name,
      street: voter.street,
      city: voter.city,
      state: voter.state,
      zip: voter.zip,
      status: labelOf(voter.status),
    }));
}

/** e.g. "500 voters — 210 mailed, 150 stamped, 80 written, 40 writing, 20 todo" */
export function summarizeByStatus(voters: Voter[], columns: Column[]): string {
  const total = `${voters.length} voter${voters.length === 1 ? '' : 's'}`;
  if (voters.length === 0) return total;

  const counts = new Map<string, number>();
  for (const voter of voters) {
    counts.set(voter.status, (counts.get(voter.status) ?? 0) + 1);
  }

  const parts = columns
    .filter((column) => (counts.get(column.id) ?? 0) > 0)
    .map((column) => `${counts.get(column.id)} ${column.label.toLowerCase()}`);

  return `${total} — ${parts.join(', ')}`;
}
