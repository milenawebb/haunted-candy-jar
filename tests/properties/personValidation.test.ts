import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validatePersonInput,
  type PersonInput,
} from '../../src/features/people/personTypes';
import { PersonFieldsSchema } from '../../src/utils/dataSchema';

const validBase: PersonInput = {
  name: 'Mina Moonbeam',
  phone: '555-0142',
  email: 'mina@example.com',
  tags: [],
  notes: '',
  rhythm: { n: 14, unit: 'day' },
  importantDates: [],
};

const unitArb = fc.constantFrom('day', 'week', 'month') as fc.Arbitrary<
  'day' | 'week' | 'month'
>;

describe('Property 20: Person and Rhythm validation', () => {
  it('name: accepted exactly when non-empty after trimming. Validates: Requirement 2.2', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (name) => {
        const res = validatePersonInput({ ...validBase, name });
        expect(res.ok).toBe(name.trim().length > 0);
        if (res.ok) expect(res.value.name).toBe(name.trim());
      }),
      { numRuns: 200 },
    );
  });

  it('email: accepted exactly when empty or local@domain.tld. Validates: Requirement 2.3', () => {
    const emailArb = fc.oneof(
      fc.string({ maxLength: 30 }),
      fc
        .tuple(
          fc.stringMatching(/^[a-z0-9]{1,8}$/),
          fc.stringMatching(/^[a-z0-9]{1,8}$/),
          fc.stringMatching(/^[a-z]{2,4}$/),
        )
        .map(([l, d, t]) => `${l}@${d}.${t}`),
    );
    fc.assert(
      fc.property(emailArb, (email) => {
        const trimmed = email.trim();
        const expected = trimmed === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
        expect(validatePersonInput({ ...validBase, email }).ok).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  it('phone: accepted exactly when empty or containing a digit. Validates: Requirement 2.4', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 30 }), (phone) => {
        const trimmed = phone.trim();
        const expected = trimmed === '' || /\d/.test(trimmed);
        expect(validatePersonInput({ ...validBase, phone }).ok).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  it('tags: deduplicated without regard to case. Validates: Requirement 2.5', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[a-zA-Z]{1,8}$/), { maxLength: 15 }),
        (tags) => {
          const res = validatePersonInput({ ...validBase, tags });
          expect(res.ok).toBe(true);
          if (!res.ok) return;
          const lowered = res.value.tags;
          expect(new Set(lowered).size).toBe(lowered.length);
          expect(lowered.every((t) => t === t.toLowerCase())).toBe(true);
          expect(new Set(lowered)).toEqual(new Set(tags.map((t) => t.toLowerCase())));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Rhythm: accepted exactly for integers 1 to 365 with a known unit. Validates: Requirement 2.6', () => {
    const nArb = fc.oneof(
      fc.integer({ min: -5, max: 400 }),
      fc.double({ min: -5, max: 400, noNaN: true }),
      fc.constant(Number.NaN),
      fc.constant(Number.POSITIVE_INFINITY),
    );
    const unitAnyArb = fc.oneof(unitArb, fc.constantFrom('year', 'hour', ''));
    fc.assert(
      fc.property(nArb, unitAnyArb, (n, unit) => {
        const rhythm = { n, unit } as PersonInput['rhythm'];
        const expected =
          Number.isInteger(n) && n >= 1 && n <= 365 && ['day', 'week', 'month'].includes(unit);
        expect(validatePersonInput({ ...validBase, rhythm }).ok).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });

  it('Important Date label: at most 30 characters. Validates: Requirement 2.8', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (label) => {
        const importantDates = [
          { id: 'd1', kind: 'custom' as const, label, month: 2, day: 29 },
        ];
        expect(validatePersonInput({ ...validBase, importantDates }).ok).toBe(
          label.length <= 30,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('PersonFieldsSchema agrees with validatePersonInput on normalized output. Validates: Requirements 2.2 to 2.6', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 40 }),
        fc.string({ maxLength: 20 }),
        fc.integer({ min: -2, max: 400 }),
        unitArb,
        (name, phone, n, unit) => {
          const res = validatePersonInput({ ...validBase, name, phone, rhythm: { n, unit } });
          if (res.ok) {
            expect(PersonFieldsSchema.safeParse(res.value).success).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
