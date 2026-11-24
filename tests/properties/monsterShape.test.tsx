import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonsterShape } from '../../src/features/candy/MonsterShape';
import { MONSTER_KINDS } from '../../src/utils/monsterKind';
const ALL_KINDS = [...MONSTER_KINDS];
describe('MonsterShape (Req 7.5, 7.6, 10.7)', () => {
  it.each(ALL_KINDS)('%s renders an aria-hidden svg with gradient ids', (kind) => {
    const { container } = render(<MonsterShape kind={kind} decayStage="Fresh" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector(`[data-monster="${kind}"]`)).not.toBeNull();
    const ids = Array.from(container.querySelectorAll('radialGradient[id], linearGradient[id]')).map((n) => n.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it.each(ALL_KINDS)('%s applies highlight and sparkle opacity props', (kind) => {
    const { container } = render(
      <MonsterShape kind={kind} decayStage="Dull" highlightOpacity={0.3} sparkleOpacity={0.1} />,
    );
    expect(container.querySelector('[data-part="highlight"]')?.getAttribute('opacity')).toBe('0.3');
    expect(container.querySelector('[data-part="sparkle"]')?.getAttribute('opacity')).toBe('0.1');
  });
  it('uses the default highlight opacity of 0.75', () => {
    const { container } = render(<MonsterShape kind="pumpkin" decayStage="Fresh" />);
    expect(container.querySelector('[data-part="highlight"]')?.getAttribute('opacity')).toBe('0.75');
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
  it('renders all eight kinds as real monsters (no placeholder)', () => {
    expect(MONSTER_KINDS).toHaveLength(8);
    for (const kind of MONSTER_KINDS) {
      const { container, unmount } = render(<MonsterShape kind={kind} decayStage="Fresh" />);
      expect(container.querySelector(`[data-monster="${kind}"]`)).not.toBeNull();
      expect(container.querySelector('[data-placeholder]')).toBeNull();
      expect(container.querySelectorAll('[data-part="highlight"]')).toHaveLength(1);
      expect(container.querySelectorAll('[data-part="sparkle"]')).toHaveLength(1);
      expect(container.querySelectorAll('[data-part="rim-light"]')).toHaveLength(1);
      unmount();
    }
  });
  it('uses a pale lavender face for the vampire and the red token for the collar only', () => {
    const { container } = render(<MonsterShape kind="vampire" decayStage="Fresh" />);
    const html = container.innerHTML;
    // jsdom may rewrite the hex into rgb().
    expect(html).toMatch(/#cdbcf0|rgb\(205,\s*188,\s*240\)/i);
    expect(html).toContain('var(--monster-vampire)');
    expect(html).not.toMatch(/stop-color:[^"]*var\(--monster-vampire\)/);
  });
});
