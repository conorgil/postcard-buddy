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
// addresses have before the real city.
const TAIL = /,\s*([A-Za-z .'-]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/;

function isStreetStartToken(token: string): boolean {
  const bare = token.replace(/,$/, '');
  return /^\d/.test(bare) || /^p\.?o\.?$/i.test(bare) || /^room$/i.test(bare);
}

/** Parses "name + street, City, ST ZIP" (no leading row index) into a record. */
function parseAddressLine(rest: string): ParsedRecord | null {
  const tailMatch = TAIL.exec(rest);
  if (!tailMatch) return null;
  const [tailFull, city, state, zip] = tailMatch;
  const beforeTail = rest.slice(0, rest.length - tailFull.length).trim();

  const tokens = beforeTail.split(/\s+/).filter(Boolean);
  const splitIdx = tokens.findIndex(isStreetStartToken);
  if (splitIdx <= 0) return null;

  const name = tokens.slice(0, splitIdx).join(' ').trim();
  const street = tokens
    .slice(splitIdx)
    .join(' ')
    .replace(/,\s*$/, '')
    .trim();
  if (!name || !street) return null;

  return { name, street, city: city.trim(), state, zip };
}

/**
 * Parses one raw line of extracted PDF text into a name/address record.
 * Returns null for anything that isn't a data row (headers, footers,
 * front-matter) or that doesn't fit the expected shape.
 */
export function parseVoterLine(rawLine: string): ParsedRecord | null {
  const prefixMatch = ROW_PREFIX.exec(rawLine.trim());
  if (!prefixMatch) return null;
  return parseAddressLine(prefixMatch[2]);
}

/**
 * Parses one line of hand-pasted voter text. Same shape as parseVoterLine,
 * but the leading row index is optional since pasted lists rarely have one.
 */
export function parsePastedLine(rawLine: string): ParsedRecord | null {
  const trimmed = rawLine.trim();
  if (!trimmed) return null;
  const prefixMatch = ROW_PREFIX.exec(trimmed);
  return parseAddressLine(prefixMatch ? prefixMatch[2] : trimmed);
}

/** True for any line that looks like a data row (starts with an index number),
 * regardless of whether it actually parses. Used to distinguish "not a data
 * row" (ignored) from "looked like data but failed to parse" (reported). */
export function looksLikeDataRow(rawLine: string): boolean {
  return /^\d+\s/.test(rawLine.trim());
}
