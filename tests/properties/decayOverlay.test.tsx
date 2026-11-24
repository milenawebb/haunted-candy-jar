// @vitest-environment jsdom
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DecayOverlay } from '../../src/features/candy/DecayOverlay';
import { MonsterShape } from '../../src/features/candy/MonsterShape';
import { decayLook } from '../../src/features/candy/decayLook';
import { DECAY_STAGE_ORDER } from '../../src/features/tasks/taskTypes';
function overlay(stage: (typeof DECAY_STAGE_ORDER)[number], reducedMotion = false) {
  const { container } = render(
    <svg>
      <DecayOverlay stage={stage} layer="back" uid="t" reducedMotion={reducedMotion} />
      <DecayOverlay stage={stage} layer="front" uid="t" reducedMotion={reducedMotion} />
    </svg>,
  );
  return container;
}
describe('decayLook', () => {
  it('is monotonic in severity. Validates: Requirements 7.5, 7.6, 7.7, 7.8, 7.9', () => {
    for (let i = 1; i < DECAY_STAGE_ORDER.length; i++) {
      const a = decayLook(DECAY_STAGE_ORDER[i - 1]!);
      const b = decayLook(DECAY_STAGE_ORDER[i]!);
      expect(b.glowLevel).toBeGreaterThanOrEqual(a.glowLevel);
      expect(b.highlightOpacity).toBeLessThanOrEqual(a.highlightOpacity);
    }
  });
  it('Fresh and Dull differ by highlight and sparkle. Validates: Requirement 7.12', () => {
    const f = decayLook('Fresh');
    const d = decayLook('Dull');
    expect(d.highlightOpacity).toBeLessThan(f.highlightOpacity);
    expect(d.sparkleOpacity).toBeLessThan(f.sparkleOpacity);
  });
  it('any two different stages differ in a non-color attribute. Validates: Requirement 7.12', () => {
    const stage = fc.constantFrom(...DECAY_STAGE_ORDER);
    fc.assert(
      fc.property(stage, stage, (a, b) => {
        fc.pre(a !== b);
        const x = decayLook(a);
        const y = decayLook(b);
        return (
          x.highlightOpacity !== y.highlightOpacity ||
          x.sparkleOpacity !== y.sparkleOpacity ||
          x.glowLevel !== y.glowLevel ||
          x.wisps !== y.wisps ||
          x.cracks !== y.cracks
        );
      }),
      { numRuns: 100 },
    );
  });
});
describe('DecayOverlay', () => {
  it('Fresh and Dull render no glow, wisps or cracks. Validates: Requirements 7.5, 7.6', () => {
    for (const s of ['Fresh', 'Dull'] as const) {
      const c = overlay(s);
      expect(c.querySelector('[data-part="glow-halo"]')).toBeNull();
      expect(c.querySelector('[data-part="wisp"]')).toBeNull();
      expect(c.querySelector('[data-part="decay-crack"]')).toBeNull();
    }
  });
  it('Spooky renders a glow only. Validates: Requirement 7.7', () => {
    const c = overlay('Spooky');
    expect(c.querySelector('[data-part="glow-halo"]')).not.toBeNull();
    expect(c.querySelector('[data-part="wisp"]')).toBeNull();
  });
  it('Haunted renders 2 or 3 wisps and a glow. Validates: Requirement 7.8', () => {
    const c = overlay('Haunted');
    const n = c.querySelectorAll('[data-part="wisp"]').length;
    expect(n === 2 || n === 3).toBe(true);
    expect(c.querySelector('[data-part="glow-halo"]')).not.toBeNull();
    expect(c.querySelector('.decay-wisp--animated')).not.toBeNull();
  });
  it('reduced motion renders static wisps. Validates: Requirement 7.11', () => {
    const c = overlay('Haunted', true);
    expect(c.querySelectorAll('[data-part="wisp"]').length).toBeGreaterThan(1);
    expect(c.querySelector('.decay-wisp--animated')).toBeNull();
  });
  it('Cursed renders crack lines, glow and a grey body filter. Validates: Requirement 7.9', () => {
    const c = overlay('Cursed');
    expect(c.querySelectorAll('[data-part="decay-crack"]').length).toBeGreaterThan(0);
    expect(c.querySelector('[data-part="glow-halo"]')).not.toBeNull();
    expect(decayLook('Cursed').bodyFilter).toMatch(/saturate\(0\.1/);
  });
  it('MonsterShape applies the look and honours overrides. Validates: Requirements 7.6, 7.9', () => {
    const { container } = render(<MonsterShape kind="pumpkin" decayStage="Cursed" sparkleOpacity={0.5} />);
    const body = container.querySelector('[data-part="monster-body"]') as HTMLElement;
    expect(body.style.filter).toContain('brightness');
    expect(container.querySelector('[data-part="highlight"]')?.getAttribute('opacity')).toBe('0.13');
    expect(container.querySelector('[data-part="sparkle"]')?.getAttribute('opacity')).toBe('0.5');
    expect(container.querySelectorAll('[data-part="decay-crack"]').length).toBeGreaterThan(0);
  });
});
