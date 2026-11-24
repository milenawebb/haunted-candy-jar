import { render } from '@testing-library/react';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CandyCrack } from '../../src/features/candy/CandyCrack';
import {
  CRACK_MAX_OPACITY,
  CRACK_MAX_WIDTH,
  CRACK_SEGMENT_COUNT,
  crackVisuals,
} from '../../src/features/candy/crackVisuals';

const prog = fc.double({ min: -2, max: 3, noNaN: false });

describe('crackVisuals', () => {
  it('Validates: Requirement 4.2 (non-decreasing in progress, clamped)', () => {
    fc.assert(
      fc.property(prog, prog, (a, b) => {
        const na = Number.isNaN(a) ? 0 : a;
        const nb = Number.isNaN(b) ? 0 : b;
        const x = crackVisuals(Math.min(na, nb), false);
        const y = crackVisuals(Math.max(na, nb), false);
        expect(y.segments).toBeGreaterThanOrEqual(x.segments);
        expect(y.strokeWidth).toBeGreaterThanOrEqual(x.strokeWidth);
        expect(y.opacity).toBeGreaterThanOrEqual(x.opacity);
        for (const v of [x, y]) {
          expect(v.segments).toBeGreaterThanOrEqual(0);
          expect(v.segments).toBeLessThanOrEqual(CRACK_SEGMENT_COUNT);
          expect(v.strokeWidth).toBeLessThanOrEqual(CRACK_MAX_WIDTH);
          expect(v.opacity).toBeLessThanOrEqual(CRACK_MAX_OPACITY);
          expect(v.opacity).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Validates: Requirement 4.2 (NaN and out-of-range clamp)', () => {
    expect(crackVisuals(Number.NaN, false)).toEqual(crackVisuals(0, false));
    expect(crackVisuals(-5, false)).toEqual(crackVisuals(0, false));
    expect(crackVisuals(9, false)).toEqual(crackVisuals(1, false));
    expect(crackVisuals(1, false).segments).toBe(CRACK_SEGMENT_COUNT);
  });

  it('Validates: Requirement 4.10 (reduced motion jumps to full at 1, nothing before)', () => {
    fc.assert(
      fc.property(fc.double({ min: -1, max: 0.999999, noNaN: true }), (p) => {
        expect(crackVisuals(p, true).segments).toBe(0);
        expect(crackVisuals(p, true).opacity).toBe(0);
      }),
      { numRuns: 100 },
    );
    const full = crackVisuals(1, true);
    expect(full.segments).toBe(CRACK_SEGMENT_COUNT);
    expect(full.opacity).toBe(CRACK_MAX_OPACITY);
    expect(full.strokeWidth).toBe(CRACK_MAX_WIDTH);
  });
});

function visibleCount(c: HTMLElement): number {
  return c.querySelectorAll('[data-part="hold-crack"][data-visible="true"]').length;
}

describe('CandyCrack', () => {
  it('renders no cracks at progress 0 and is aria-hidden', () => {
    const { container } = render(
      <svg>
        <CandyCrack progress={0} reducedMotion={false} />
      </svg>,
    );
    expect(visibleCount(container)).toBe(0);
    expect(container.querySelector('[data-part="candy-crack"]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('reveals more cracks as progress grows', () => {
    const { container } = render(
      <svg>
        <CandyCrack progress={0.5} reducedMotion={false} />
      </svg>,
    );
    expect(visibleCount(container)).toBe(CRACK_SEGMENT_COUNT / 2);
  });

  it('adds the heal transition class when progress drops, and not while rising', () => {
    const { container, rerender } = render(
      <svg>
        <CandyCrack progress={0.2} reducedMotion={false} />
      </svg>,
    );
    const g = () => container.querySelector('[data-part="candy-crack"]')!;
    rerender(
      <svg>
        <CandyCrack progress={0.6} reducedMotion={false} />
      </svg>,
    );
    expect(g().classList.contains('candy-crack--heal')).toBe(false);
    rerender(
      <svg>
        <CandyCrack progress={0} reducedMotion={false} />
      </svg>,
    );
    expect(g().classList.contains('candy-crack--heal')).toBe(true);
  });

  it('shows nothing before 1 under reduced motion, full at 1', () => {
    const { container, rerender } = render(
      <svg>
        <CandyCrack progress={0.9} reducedMotion />
      </svg>,
    );
    expect(visibleCount(container)).toBe(0);
    rerender(
      <svg>
        <CandyCrack progress={1} reducedMotion />
      </svg>,
    );
    expect(visibleCount(container)).toBe(CRACK_SEGMENT_COUNT);
  });
});
