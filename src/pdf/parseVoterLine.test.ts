import { describe, expect, it } from 'vitest';
import { looksLikeDataRow, parseVoterLine } from './parseVoterLine';

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

  it('is false for header/footer lines', () => {
    expect(looksLikeDataRow('# WRITE TO MAIL TO')).toBe(false);
    expect(looksLikeDataRow('page 2 of 26')).toBe(false);
  });
});
