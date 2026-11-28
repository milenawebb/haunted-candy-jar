// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonsterShape } from '../../src/features/candy/MonsterShape';
import { DecayOverlay } from '../../src/features/candy/DecayOverlay';
import { decayLook } from '../../src/features/candy/decayLook';
import { DECAY_STAGE_ORDER } from '../../src/features/tasks/taskTypes';

function shape(stage: (typeof DECAY_STAGE_ORDER)[number]) {
  return render(<MonsterShape kind="pumpkin" decayStage={stage} />).container;
}

describe('Cursed readability on the dark desk', () => {
  it('Cursed renders the green glow layer, strong rim and strong shadow. Validates: Requirement 7.9', () => {
    const c = shape('Cursed');
    expect(c.querySelector('[data-part="glow-halo"][data-glow="green"]')).not.toBeNull();
    expect(c.querySelector('[data-part="rim-light"][data-rim="strong"]')).not.toBeNull();
    expect(c.querySelector('[data-part="contact-shadow"][data-shadow="strong"]')).not.toBeNull();
    expect(decayLook('Cursed').bodyFilter).toMatch(/brightness\(0\.72\)/);
    expect(decayLook('Cursed').bodyFilter).toMatch(/155, 227, 122/);
    expect(c.querySelectorAll('[data-part="decay-crack"]').length).toBeGreaterThan(0);
  });

  it('other stages get no green glow, strong rim or strong shadow. Validates: Requirement 7.12', () => {
    for (const s of DECAY_STAGE_ORDER.filter((x) => x !== 'Cursed')) {
      const c = shape(s);
      expect(c.querySelector('[data-glow="green"]')).toBeNull();
      expect(c.querySelector('[data-rim="strong"]')).toBeNull();
      expect(c.querySelector('[data-shadow="strong"]')).toBeNull();
      expect(decayLook(s).greenGlow).toBe(false);
    }
  });

  it('Haunted keeps its purple glow and wisps. Validates: Requirement 7.8', () => {
    const c = shape('Haunted');
    expect(c.querySelector('[data-part="glow-halo"]')).not.toBeNull();
    expect(c.querySelectorAll('[data-part="wisp"]').length).toBe(3);
  });

  it('the Cursed glow, rim and shadow carry no animation. Validates: Requirement 12.6', () => {
    const { container } = render(
      <svg>
        <DecayOverlay stage="Cursed" layer="back" uid="t" reducedMotion />
        <DecayOverlay stage="Cursed" layer="front" uid="t" reducedMotion />
      </svg>,
    );
    expect(container.querySelector('[data-glow="green"]')).not.toBeNull();
    expect(container.querySelector('animate, animateTransform, [class*="animated"]')).toBeNull();
    const css = readFileSync('src/features/candy/DecayOverlay.css', 'utf8');
    expect(css).not.toMatch(/\[data-glow|data-rim|data-shadow|glow-halo/);
    const c = shape('Cursed');
    expect(c.querySelector('animate, animateTransform, [class*="animated"]')).toBeNull();
  });
});
