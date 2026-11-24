import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { JarScene } from '../../src/features/jar/JarScene';
import { JAR_CANDY_RADIUS, JAR_PACK_BOX } from '../../src/features/jar/jarGeometry';

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

  it('uses a candy diameter of about one sixth of the pack width', () => {
    expect((JAR_CANDY_RADIUS * 2) / JAR_PACK_BOX.width).toBeCloseTo(1 / 6, 2);
  });
});
