import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computePacking } from '../../src/utils/packingLayout';

const idsArb = fc.uniqueArray(fc.uuid(), { minLength: 0, maxLength: 30 });
const dimArb = fc.integer({ min: 200, max: 700 });

describe('packingLayout', () => {
  // Validates: Requirement 13.1
  it('is deterministic and order independent per id', () => {
    fc.assert(
      fc.property(idsArb, dimArb, dimArb, fc.nat(), (ids, w, h, k) => {
        const rev = [...ids].reverse();
        const cut = ids.length ? k % ids.length : 0;
        const shuffled = [...rev.slice(cut), ...rev.slice(0, cut)];
        const a = computePacking(ids, w, h);
        const b = computePacking(shuffled, w, h);
        expect(computePacking(ids, w, h)).toEqual(a);
        ids.forEach((id, i) => {
          expect(b[shuffled.indexOf(id)]).toEqual(a[i]);
        });
      }),
      { numRuns: 100 },
    );
  });

  // Validates: Requirement 13.1
  it('returns one position per id, rotation within +/-15, inside bounds', () => {
    fc.assert(
      fc.property(idsArb, dimArb, dimArb, (ids, w, h) => {
        const out = computePacking(ids, w, h);
        expect(out).toHaveLength(ids.length);
        for (const p of out) {
          expect(Math.abs(p.rotation)).toBeLessThanOrEqual(15);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(w);
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(h);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Validates: Requirement 13.1
  it('keeps a candy rotation when other candies change', () => {
    fc.assert(
      fc.property(idsArb, fc.uuid(), (ids, extra) => {
        fc.pre(ids.length > 0 && !ids.includes(extra));
        const a = computePacking(ids, 400, 500);
        const b = computePacking([...ids, extra], 400, 500);
        expect(b[0].rotation).toBe(a[0].rotation);
      }),
      { numRuns: 100 },
    );
  });
});
