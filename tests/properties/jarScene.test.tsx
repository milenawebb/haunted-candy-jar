import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JarLid, lidTransform } from '../../src/features/jar/JarLid';
import { JarScene } from '../../src/features/jar/JarScene';
import {
  JAR_CANDY_RADIUS,
  JAR_LID_PIVOT,
  JAR_PACK_BOX,
  JAR_VIEWBOX_HEAD,
} from '../../src/features/jar/jarGeometry';
describe('JarScene', () => {
  it('renders back glass and clips candy children', () => {
    render(
      <JarScene>
        <circle data-testid="candy" cx="100" cy="100" r="20" />
      </JarScene>,
    );
    expect(screen.getByTestId('jar-back-glass')).toBeTruthy();
    const clipped = screen.getByTestId('jar-candies');
    expect(clipped.getAttribute('clip-path')).toContain('url(#');
    expect(clipped.contains(screen.getByTestId('candy'))).toBe(true);
  });
  it('puts the lid after the candies in paint order', () => {
    render(<JarScene lid={<g data-testid="lid" />} frontGlass={<g data-testid="front" />} />);
    const nodes = Array.from(screen.getByRole('group', { name: 'Candy jar' }).children);
    const idx = (id: string) => nodes.findIndex((n) => n.getAttribute('data-testid') === id);
    expect(idx('jar-back-glass')).toBeLessThan(idx('jar-candies'));
    expect(idx('jar-candies')).toBeLessThan(idx('front'));
    expect(idx('front')).toBeLessThan(idx('lid'));
  });
  it('renders the default front glass above the candies, and honors an override', () => {
    const { unmount } = render(<JarScene />);
    const front = screen.getByTestId('jar-front-glass');
    expect(front.getAttribute('aria-hidden')).toBe('true');
    expect(front.getAttribute('pointer-events')).toBe('none');
    const nodes = Array.from(screen.getByRole('group', { name: 'Candy jar' }).children);
    expect(nodes.indexOf(front)).toBeGreaterThan(
      nodes.findIndex((n) => n.getAttribute('data-testid') === 'jar-candies'),
    );
    unmount();
    render(<JarScene frontGlass={<g data-testid="front" />} />);
    expect(screen.queryByTestId('jar-front-glass')).toBeNull();
  });
  it('renders the default lid with a knob above the front glass, and honors an override', () => {
    const { unmount } = render(<JarScene />);
    const lid = screen.getByTestId('jar-lid');
    expect(lid.getAttribute('aria-hidden')).toBe('true');
    expect(lid.querySelectorAll('circle').length).toBeGreaterThan(0);
    expect(lid.hasAttribute('transform')).toBe(false);
    const nodes = Array.from(screen.getByRole('group', { name: 'Candy jar' }).children);
    expect(nodes.indexOf(lid)).toBeGreaterThan(nodes.indexOf(screen.getByTestId('jar-front-glass')));
    unmount();
    render(<JarScene lid={<g data-testid="lid" />} />);
    expect(screen.queryByTestId('jar-lid')).toBeNull();
  });
  it('applies the transform prop to the lid', () => {
    render(<JarScene lid={<JarLid transform={lidTransform(20, -12)} />} />);
    expect(screen.getByTestId('jar-lid').getAttribute('transform')).toBe(
      `translate(0 -20) rotate(-12 ${JAR_LID_PIVOT.x} ${JAR_LID_PIVOT.y})`,
    );
    expect(JAR_LID_PIVOT).toEqual({ x: 200, y: 28 });
  });
  it('keeps the whole knob inside the viewBox headroom', () => {
    render(<JarScene />);
    const knob = screen.getByTestId('jar-lid').querySelector('circle');
    const top = Number(knob?.getAttribute('cy')) - Number(knob?.getAttribute('r'));
    expect(top).toBeGreaterThanOrEqual(-JAR_VIEWBOX_HEAD);
  });
  it('renders the default desk glow behind the jar, and honors an override', () => {
    const { unmount } = render(<JarScene />);
    const glow = screen.getByTestId('desk-glow');
    expect(glow.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('desk-glow-warm')).toBeTruthy();
    expect(screen.getByTestId('desk-glow-shadow')).toBeTruthy();
    const svg = screen.getByRole('group', { name: 'Candy jar' });
    expect(glow.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    unmount();
    render(<JarScene deskGlow={<div data-testid="my-glow" />} />);
    expect(screen.getByTestId('my-glow')).toBeTruthy();
    expect(screen.queryByTestId('desk-glow')).toBeNull();
  });
  it('uses a candy diameter of about one fifth of the pack width', () => {
    expect((JAR_CANDY_RADIUS * 2) / JAR_PACK_BOX.width).toBeCloseTo(1 / 5, 2);
  });
});
