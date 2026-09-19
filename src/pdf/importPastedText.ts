import { importRecords, type ImportResult } from './importPdf';
import { looksLikeSuspectedAddress, parsePastedLine, type ParsedRecord } from './parseVoterLine';

export function importPastedText(projectId: string, text: string): ImportResult {
  const records: ParsedRecord[] = [];
  const suspectedLines: string[] = [];
  let skipped = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue; // blank lines are just formatting, not a failure

    const record = parsePastedLine(line);
    if (!record) {
      if (looksLikeSuspectedAddress(line)) suspectedLines.push(line);
      skipped++;
      continue;
    }
    records.push(record);
  }

  return importRecords(projectId, records, skipped, suspectedLines);
}
