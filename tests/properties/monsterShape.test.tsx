import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonsterShape } from '../../src/features/candy/MonsterShape';
import type { MonsterKind } from '../../src/features/tasks/taskTypes';

const FOUR: MonsterKind[] = ['pumpkin', 'mummy', 'skeleton', 'spider'];

describe('MonsterShape (Req 7.5, 7.6, 10.7)', () => {
  it.each(FOUR)('%s renders an aria-hidden svg with gradient ids', (kind) => {
    const { container } = render(<MonsterShape kind={kind} decayStage="Fresh" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector(`[data-monster="${kind}"]`)).not.toBeNull();
    const ids = Array.from(container.querySelectorAll('radialGradient[id], linearGradient[id]')).map((n) => n.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(FOUR)('%s applies highlight and sparkle opacity props', (kind) => {
    const { container } = render(
      <MonsterShape kind={kind} decayStage="Dull" highlightOpacity={0.3} sparkleOpacity={0.1} />,
    );
    expect(container.querySelector('[data-part="highlight"]')?.getAttribute('opacity')).toBe('0.3');
    expect(container.querySelector('[data-part="sparkle"]')?.getAttribute('opacity')).toBe('0.1');
  });

  it('uses the default highlight opacity of 0.85', () => {
    const { container } = render(<MonsterShape kind="pumpkin" decayStage="Fresh" />);
    expect(container.querySelector('[data-part="highlight"]')?.getAttribute('opacity')).toBe('0.85');
  });

  it('renders the contact shadow', () => {
    const { container } = render(<MonsterShape kind="spider" decayStage="Fresh" />);
    expect(container.querySelector('[data-part="contact-shadow"]')).not.toBeNull();
  });

  it('gives two instances distinct gradient ids', () => {
    const { container } = render(
      <>
        <MonsterShape kind="pumpkin" decayStage="Fresh" />
        <MonsterShape kind="pumpkin" decayStage="Fresh" />
      </>,
    );
    const ids = Array.from(container.querySelectorAll('[id]')).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders a nested svg with position when requested', () => {
    const { container } = render(
      <svg>
        <MonsterShape kind="mummy" decayStage="Fresh" nested={{ x: 10, y: 20, width: 72 }} />
      </svg>,
    );
    const inner = container.querySelector('svg svg');
    expect(inner?.getAttribute('x')).toBe('10');
    expect(inner?.getAttribute('width')).toBe('72');
  });

  it('falls back to a placeholder for kinds not yet drawn', () => {
    const { container } = render(<MonsterShape kind="bat" decayStage="Fresh" />);
    expect(container.querySelector('[data-monster="bat"]')).not.toBeNull();
  });
});
