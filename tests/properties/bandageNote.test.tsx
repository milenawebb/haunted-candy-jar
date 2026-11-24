import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { truncateTitle, tiltForId } from '../../src/features/candy/bandageText';
import { BandageNote } from '../../src/features/candy/BandageNote';

describe('bandage note helpers', () => {
  // Validates: Requirement 3.8
  it('truncateTitle never exceeds max chars and leaves short titles unchanged', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), fc.integer({ min: 1, max: 30 }), (title, max) => {
        const out = truncateTitle(title, max);
        expect(Array.from(out).length).toBeLessThanOrEqual(max);
        if (Array.from(title).length <= max) expect(out).toBe(title);
        else expect(out.endsWith('\u2026')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // Validates: Requirement 3.8
  it('tiltForId is deterministic with magnitude in [2, 4]', () => {
    fc.assert(
      fc.property(fc.string(), (id) => {
        const t = tiltForId(id);
        expect(tiltForId(id)).toBe(t);
        expect(Math.abs(t)).toBeGreaterThanOrEqual(2);
        expect(Math.abs(t)).toBeLessThanOrEqual(4);
      }),
      { numRuns: 100 },
    );
  });

  // Validates: Requirement 3.8
  it('truncates the default to 18 chars', () => {
    expect(truncateTitle('Buy pumpkin spice candles')).toBe('Buy pumpkin spice\u2026');
    expect(truncateTitle('Short')).toBe('Short');
  });

  // Validates: Requirements 3.8, 10.1
  it('renders truncated text with the full title as accessible name', () => {
    const long = 'Write the very long report for the ghost council';
    const { getByTestId } = render(
      <svg>
        <BandageNote taskId="abc" title={long} />
      </svg>,
    );
    const note = getByTestId('bandage-note');
    expect(note.getAttribute('aria-label')).toBe(long);
    expect(note.textContent).toContain('\u2026');
  });
});
