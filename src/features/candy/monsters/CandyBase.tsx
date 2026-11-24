import { useId, type ReactNode } from 'react';

/**
 * Shared hard-candy look for every monster.
 *
 * Design choice: each monster is an SVG <g> drawn on a shared 100x100 user
 * space. A monster has no <svg> wrapper of its own, so it can be embedded
 * either in a standalone <svg viewBox="0 0 100 100"> (MonsterShape does this)
 * or nested inside the jar's SVG through a nested <svg> element that maps the
 * 100x100 box to a spot in the jar.
 *
 * All gradient and clip ids come from React useId, so many candies on screen
 * never clash. Everything here is static (no animation).
 */

export interface MonsterArtProps {
  /** Opacity of the bright top-left highlight. Default 0.85. */
  highlightOpacity?: number;
  /** Opacity of the four-point sparkle. Default 0.9. */
  sparkleOpacity?: number;
}

export const DEFAULT_HIGHLIGHT_OPACITY = 0.85;
export const DEFAULT_SPARKLE_OPACITY = 0.9;

/** Ids safe to use inside url(#...) references. */
export function useSafeId(): string {
  return `c${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

interface CandyBaseProps extends MonsterArtProps {
  uid: string;
  /** CSS color (normally var(--monster-*)). */
  color: string;
  /** Draws the body silhouette with the given fill. Called twice (color, shade). */
  body: (fill: string) => ReactNode;
  /** Drawn behind the body (stem, legs). */
  back?: ReactNode;
  /** Drawn on top of the body but under the highlight (face, bands). */
  face?: ReactNode;
  /** Where the highlight sits. Default (31, 30). */
  highlightAt?: { x: number; y: number };
}

export function CandyBase({
  uid,
  color,
  body,
  back,
  face,
  highlightOpacity = DEFAULT_HIGHLIGHT_OPACITY,
  sparkleOpacity = DEFAULT_SPARKLE_OPACITY,
  highlightAt = { x: 31, y: 30 },
}: CandyBaseProps) {
  const bodyId = `${uid}-body`;
  const shadeId = `${uid}-shade`;
  const { x, y } = highlightAt;
  return (
    <g>
      <defs>
        <radialGradient id={bodyId} cx="38%" cy="32%" r="78%">
          <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${color} 62%, white)` }} />
          <stop offset="55%" style={{ stopColor: color }} />
          <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${color} 62%, black)` }} />
        </radialGradient>
        <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="62%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {back}
      {body(`url(#${bodyId})`)}
      {body(`url(#${shadeId})`)}
      {face}
      <ellipse
        data-part="highlight"
        cx={x}
        cy={y}
        rx={11}
        ry={6}
        transform={`rotate(-35 ${x} ${y})`}
        fill="#fff"
        opacity={highlightOpacity}
      />
      <path
        data-part="sparkle"
        d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
        transform={`translate(${x + 16} ${y - 9})`}
        fill="#fff"
        opacity={sparkleOpacity}
      />
    </g>
  );
}

export const FACE_DARK = '#2a1240';
