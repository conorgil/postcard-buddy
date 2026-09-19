import { describe, expect, it } from 'vitest';
import { looksLikeDataRow, looksLikeSuspectedAddress, parseVoterLine } from './parseVoterLine';

const cases: Array<[string, ReturnType<typeof parseVoterLine>]> = [
  [
    '1 Sandra Gorrell 14900 Coveshore Dr, Wake Forest, NC 27587',
    { name: 'Sandra Gorrell', street: '14900 Coveshore Dr', city: 'Wake Forest', state: 'NC', zip: '27587' },
  ],
  [
    '9 Henry Carroll Room 531, Honors College, Richmond, VA 23220',
    { name: 'Henry Carroll', street: 'Room 531, Honors College', city: 'Richmond', state: 'VA', zip: '23220' },
  ],
  [
    '10 Tony Bullock SR 2221 Imperial Ave, Wilson, NC 27893',
    { name: 'Tony Bullock SR', street: '2221 Imperial Ave', city: 'Wilson', state: 'NC', zip: '27893' },
  ],
  [
    '41 Forrest Alston PO Box 331, Littleton, NC 27850-0331',
    { name: 'Forrest Alston', street: 'PO Box 331', city: 'Littleton', state: 'NC', zip: '27850-0331' },
  ],
  [
    '58 Howard Henry JR 8585 River Ridge Dr, Charlotte, NC 28213',
    { name: 'Howard Henry JR', street: '8585 River Ridge Dr', city: 'Charlotte', state: 'NC', zip: '28213' },
  ],
  [
    '243 Kelley Harding 1315 Leonard St NE APT 426, Grand Rapids, MI 49505',
    {
      name: 'Kelley Harding',
      street: '1315 Leonard St NE APT 426',
      city: 'Grand Rapids',
      state: 'MI',
      zip: '49505',
    },
  ],
  [
    '466 Daryl Walton Jr. 158 Redwood Ave, Paterson, NJ 07522',
    { name: 'Daryl Walton Jr.', street: '158 Redwood Ave', city: 'Paterson', state: 'NJ', zip: '07522' },
  ],
  [
    '499 Richard Jordan III 100 E Warm Springs Rd Unit 212, Henderson, NV 89011',
    {
      name: 'Richard Jordan III',
      street: '100 E Warm Springs Rd Unit 212',
      city: 'Henderson',
      state: 'NV',
      zip: '89011',
    },
  ],
  ['# WRITE TO MAIL TO', null],
  ['TERMS OF USE. These voter addresses are provided solely to address and mail', null],
  ['page 2 of 26', null],
  ['', null],
  // Vote Forward's format: no row index, ALL CAPS name followed by a comma.
  [
    'AAJAYLAH FRAZIER, 6217 ALGARD ST, PHILADELPHIA, PA 19135',
    { name: 'AAJAYLAH FRAZIER', street: '6217 ALGARD ST', city: 'PHILADELPHIA', state: 'PA', zip: '19135' },
  ],
  [
    'AERIONNA CONNOR, 1316 DUSS AVE UNIT 3, AMBRIDGE, PA 15003',
    { name: 'AERIONNA CONNOR', street: '1316 DUSS AVE UNIT 3', city: 'AMBRIDGE', state: 'PA', zip: '15003' },
  ],
  [
    'KENNEDY STEPHENS, 326 WOODWARD AVE, MC KEES ROCKS, PA 15136',
    { name: 'KENNEDY STEPHENS', street: '326 WOODWARD AVE', city: 'MC KEES ROCKS', state: 'PA', zip: '15136' },
  ],
  [
    'PHINNEAUS GREASON, 701 CASSEL RD LOT 99, MANCHESTER, PA 17345',
    { name: 'PHINNEAUS GREASON', street: '701 CASSEL RD LOT 99', city: 'MANCHESTER', state: 'PA', zip: '17345' },
  ],
  // Return-address artifact lines from the Vote Forward PDF's letterhead —
  // neither ends in a real City, ST ZIP tail, so both are correctly ignored.
  ['5131 W. GIRARD PMB#1, 5131 W. GIRARD PMB#1,', null],
  ['PHILADELPHIA, PA 19131 PHILADELPHIA, PA 19131', null],
];

describe('parseVoterLine', () => {
  for (const [input, expected] of cases) {
    it(`parses: ${input || '(empty line)'}`, () => {
      expect(parseVoterLine(input)).toEqual(expected);
    });
  }
});

describe('looksLikeDataRow', () => {
  it('is true for lines starting with an index number', () => {
    expect(looksLikeDataRow('1 Sandra Gorrell 14900 Coveshore Dr, Wake Forest, NC 27587')).toBe(true);
  });

  it('is true for unindexed comma-separated lines with a real address tail', () => {
    expect(looksLikeDataRow('AAJAYLAH FRAZIER, 6217 ALGARD ST, PHILADELPHIA, PA 19135')).toBe(true);
  });

  it('is false for header/footer lines', () => {
    expect(looksLikeDataRow('# WRITE TO MAIL TO')).toBe(false);
    expect(looksLikeDataRow('page 2 of 26')).toBe(false);
  });

  it('is false for lines with no real City, ST ZIP tail, even if they start with digits', () => {
    expect(looksLikeDataRow('5131 W. GIRARD PMB#1, 5131 W. GIRARD PMB#1,')).toBe(false);
  });
});

describe('looksLikeSuspectedAddress', () => {
  it('is true for a garbled line with a state+zip fragment but no comma before the city', () => {
    expect(looksLikeSuspectedAddress('PHILADELPHIA, PA 19131 PHILADELPHIA, PA 19131')).toBe(true);
  });

  it('is true for a line that looks like the start of a street address', () => {
    expect(looksLikeSuspectedAddress('5131 W. GIRARD PMB#1, 5131 W. GIRARD PMB#1,')).toBe(true);
  });

  it('is true for lines already recognized as full data rows', () => {
    expect(looksLikeSuspectedAddress('AAJAYLAH FRAZIER, 6217 ALGARD ST, PHILADELPHIA, PA 19135')).toBe(true);
  });

  it('is false for header/footer lines with no address-like signal', () => {
    expect(looksLikeSuspectedAddress('# WRITE TO MAIL TO')).toBe(false);
    expect(looksLikeSuspectedAddress('page 2 of 26')).toBe(false);
    expect(looksLikeSuspectedAddress('TERMS OF USE. These voter addresses are provided solely to address and mail')).toBe(
      false,
    );
  });

  it('is false for an empty line', () => {
    expect(looksLikeSuspectedAddress('')).toBe(false);
  });
});

describe('parseVoterLine fallback for unrecognized name/street conventions', () => {
  it('keeps the whole prefix as the name rather than dropping a line with a real address tail', () => {
    // Mixed-case name with a comma before the street and no digit-led street
    // token — neither known heuristic applies, but there's clearly a real
    // address here, so it must still produce a record.
    expect(parseVoterLine('Some Committee, Main Office, Anytown, CA 90001')).toEqual({
      name: 'Some Committee, Main Office',
      street: '',
      city: 'Anytown',
      state: 'CA',
      zip: '90001',
    });
  });
});
