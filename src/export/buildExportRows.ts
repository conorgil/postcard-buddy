import { COLUMN_LABELS, COLUMN_ORDER, type Voter } from '../types';

export interface ExportRow {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  status: string;
}

/** Sorts by board column order (todo → mailed), then alphabetically by name within each status. */
export function buildExportRows(voters: Voter[]): ExportRow[] {
  return [...voters]
    .sort((a, b) => {
      const statusDiff = COLUMN_ORDER.indexOf(a.status) - COLUMN_ORDER.indexOf(b.status);
      return statusDiff !== 0 ? statusDiff : a.name.localeCompare(b.name);
    })
    .map((voter) => ({
      name: voter.name,
      street: voter.street,
      city: voter.city,
      state: voter.state,
      zip: voter.zip,
      status: COLUMN_LABELS[voter.status],
    }));
}

/** e.g. "500 voters — 210 mailed, 150 stamped, 80 written, 40 writing, 20 todo" */
export function summarizeByStatus(voters: Voter[]): string {
  const total = `${voters.length} voter${voters.length === 1 ? '' : 's'}`;
  if (voters.length === 0) return total;

  const counts = new Map<string, number>();
  for (const voter of voters) {
    counts.set(voter.status, (counts.get(voter.status) ?? 0) + 1);
  }

  const parts = COLUMN_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map(
    (status) => `${counts.get(status)} ${COLUMN_LABELS[status].toLowerCase()}`,
  );

  return `${total} — ${parts.join(', ')}`;
}
