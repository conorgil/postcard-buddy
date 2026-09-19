export interface ParsedRecord {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

const ROW_PREFIX = /^(\d+)\s+(.*)$/;
// Anchors the trailing ", City, ST ZIP[-XXXX]" from the right. The city
// character class excludes digits/commas so it can't swallow an internal
// comma segment like "Room 531, Honors College" that some institutional
// addresses have before the real city. Matching this tail is treated as
// strong, general evidence that a line is a real mailing address, regardless
// of which organization's export format produced it.
const TAIL = /,\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/;

function isStreetStartToken(token: string): boolean {
  const bare = token.replace(/,$/, '');
  return /^\d/.test(bare) || /^p\.?o\.?$/i.test(bare) || /^room$/i.test(bare);
}

function isAllCapsName(s: string): boolean {
  return /^[A-Z][A-Z .'-]*$/.test(s);
}

/** Signs of Justice's format: name and street separated by a space, with the
 * street starting at a recognizable token (a number, "PO", or "Room"). */
function splitBySpaceHeuristic(beforeTail: string): { name: string; street: string } | null {
  const tokens = beforeTail.split(/\s+/).filter(Boolean);
  const splitIdx = tokens.findIndex(isStreetStartToken);
  if (splitIdx <= 0) return null;

  // A comma can land on the last name token when the street itself starts
  // with a digit (true for both Signs of Justice's space-separated format
  // and Vote Forward's "NAME, street" format) — strip it so it doesn't leak
  // into the name.
  const name = tokens
    .slice(0, splitIdx)
    .join(' ')
    .replace(/,\s*$/, '')
    .trim();
  const street = tokens
    .slice(splitIdx)
    .join(' ')
    .replace(/,\s*$/, '')
    .trim();
  return name && street ? { name, street } : null;
}

/** Vote Forward's format: an ALL CAPS name immediately followed by a comma,
 * e.g. "AAJAYLAH FRAZIER, 6217 ALGARD ST". */
function splitByCommaHeuristic(beforeTail: string): { name: string; street: string } | null {
  const commaIdx = beforeTail.indexOf(',');
  if (commaIdx === -1) return null;

  const name = beforeTail.slice(0, commaIdx).trim();
  const street = beforeTail.slice(commaIdx + 1).trim();
  return name && street && isAllCapsName(name) ? { name, street } : null;
}

/**
 * Builds a record for a line already confirmed to end in a real City, ST ZIP
 * tail. Tries both known name/street conventions; if neither confidently
 * applies (an export format we haven't seen), keeps the whole prefix as the
 * name rather than silently dropping what is still a real address — the
 * caller can fix up a garbled name in the UI, but can't recover a card that
 * was never imported at all.
 */
function buildRecord(beforeTail: string, city: string, state: string, zip: string): ParsedRecord | null {
  if (!beforeTail) return null;
  const split = splitBySpaceHeuristic(beforeTail) ?? splitByCommaHeuristic(beforeTail);
  const { name, street } = split ?? { name: beforeTail.replace(/,\s*$/, ''), street: '' };
  return { name, street, city, state, zip };
}

function parseLine(rawLine: string): ParsedRecord | null {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;

  const prefixMatch = ROW_PREFIX.exec(trimmed);
  const rest = prefixMatch ? prefixMatch[2] : trimmed;

  const tailMatch = TAIL.exec(rest);
  if (!tailMatch) return null;
  const [tailFull, city, state, zip] = tailMatch;
  const beforeTail = rest.slice(0, rest.length - tailFull.length).trim();

  return buildRecord(beforeTail, city.trim(), state, zip);
}

/**
 * Parses one raw line of extracted PDF text into a name/address record.
 * Returns null only for lines with no real "City, ST ZIP" tail at all
 * (headers, footers, front-matter) — anything with a genuine address tail
 * always produces a record, even a best-effort one.
 */
export function parseVoterLine(rawLine: string): ParsedRecord | null {
  return parseLine(rawLine);
}

/**
 * Parses one line of hand-pasted voter text. Same behavior as
 * parseVoterLine; kept as a separate export since callers care about
 * different things (a pasted line vs. a line read from a PDF).
 */
export function parsePastedLine(rawLine: string): ParsedRecord | null {
  return parseLine(rawLine);
}

/** True for any line ending in a real "City, ST ZIP" tail, regardless of
 * whether the name/street split ahead of it is recognized. Used to
 * distinguish "not a data row" (ignored) from "looked like data but failed
 * to parse" (reported) — kept in sync with parseVoterLine's own tail check
 * so a line is never silently ignored here only to actually be parseable. */
export function looksLikeDataRow(rawLine: string): boolean {
  return TAIL.test(rawLine.trim());
}
