import type { ImportResult } from '../pdf/importPdf';

export function formatImportMessage(result: ImportResult): string {
  const parts = [`Imported ${result.importedCount} new card${result.importedCount === 1 ? '' : 's'}.`];
  if (result.duplicateCount > 0) {
    parts.push(`${result.duplicateCount} duplicate${result.duplicateCount === 1 ? '' : 's'} skipped.`);
  }
  if (result.skippedCount > 0) {
    parts.push(
      `${result.skippedCount} line${result.skippedCount === 1 ? '' : 's'} couldn't be parsed and ${
        result.skippedCount === 1 ? 'was' : 'were'
      } skipped.`,
    );
  }
  if (result.suspectedLines.length > 0) {
    parts.push(
      `${result.suspectedLines.length} line${result.suspectedLines.length === 1 ? '' : 's'} might be ${
        result.suspectedLines.length === 1 ? 'an address' : 'addresses'
      } — review ${result.suspectedLines.length === 1 ? 'it' : 'them'} now.`,
    );
  }
  return parts.join(' ');
}
