import { useId, type ReactNode } from 'react';

/**
 * Shared hard-candy look for every monster.
 *
 * Design choice: each monster is an SVG <g> drawn on a shared 100x100 user
 * space. A monster has no <svg> wrapper of its own, so it can be embedded
 * either in a standalone <svg viewBox="0 0 100 108"> (MonsterShape does this)
 * or nested inside the jar's SVG through a nested <svg> element that maps the
 * 100x100 box to a spot in the jar.
 *
 * Gloss layers, bottom to top: body gradient (light top-left, dark bottom-right),
 * extra bottom-right shade, face, thin rim light on the bottom-right edge,
 * large soft highlight, small sharp four-point sparkle.
 *
 * All gradient and filter ids come from React useId, so many candies on screen
 * never clash. Everything here is static (no animation).
 */
export interface MonsterArtProps {
  /** Opacity of the soft top-left highlight. Default 0.75. */
  highlightOpacity?: number;
  /** Opacity of the four-point sparkle. Default 0.9. */
  sparkleOpacity?: number;
  /**
   * Cursed look: a wider, brighter moon-pale rim along the bottom-right edge
   * (0.6) plus a faint rim along the top-left edge (0.3), so the silhouette
   * reads on the dark desk. Default false (thin white rim, 0.55 bottom-right).
   */
  strongRim?: boolean;
}

export const DEFAULT_HIGHLIGHT_OPACITY = 0.75;
export const DEFAULT_SPARKLE_OPACITY = 0.9;

/** Ids safe to use inside url(#...) references. */
export function useSafeId(): string {
  return `c${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

interface CandyBaseProps extends MonsterArtProps {
  uid: string;
  /** CSS color (normally var(--monster-*)). */
  color: string;
  /** Draws the body silhouette with the given fill. Called three times (color, shade, rim). */
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
  strongRim = false,
  highlightAt = { x: 31, y: 30 },
}: CandyBaseProps) {
  const bodyId = `${uid}-body`;
  const shadeId = `${uid}-shade`;
  const rimId = `${uid}-rim`;
  const softId = `${uid}-soft`;
  const { x, y } = highlightAt;
  const rimColor = strongRim ? '#e6efff' : '#fff';

  return (
    <g>
      <defs>
        <radialGradient id={bodyId} cx="30%" cy="26%" r="88%">
          <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${color} 50%, white)` }} />
          <stop offset="42%" style={{ stopColor: color }} />
          <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${color} 55%, black)` }} />
        </radialGradient>
        <linearGradient id={shadeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>
        <linearGradient id={rimId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={rimColor} stopOpacity={strongRim ? 0.3 : 0} />
          <stop offset={strongRim ? '28%' : '62%'} stopColor={rimColor} stopOpacity="0" />
          <stop offset="62%" stopColor={rimColor} stopOpacity="0" />
          <stop offset="100%" stopColor={rimColor} stopOpacity={strongRim ? 0.6 : 0.55} />
        </linearGradient>
        <filter id={softId} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      {back}
      {body(`url(#${bodyId})`)}
      {body(`url(#${shadeId})`)}
      {face}
      <g
        data-part="rim-light"
        data-rim={strongRim ? 'strong' : undefined}
        fill="none"
        stroke={`url(#${rimId})`}
        strokeWidth={strongRim ? 3.2 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      >
        {body('none')}
      </g>
      <ellipse
        data-part="highlight"
        cx={x}
        cy={y}
        rx={14}
        ry={7.5}
        transform={`rotate(-38 ${x} ${y})`}
        fill="#fff"
        opacity={highlightOpacity}
        filter={`url(#${softId})`}
      />
      <path
        data-part="sparkle"
        d="M0 -7 L1.5 -1.5 L7 0 L1.5 1.5 L0 7 L-1.5 1.5 L-7 0 L-1.5 -1.5 Z"
        transform={`translate(${x + 18} ${y - 8})`}
        fill="#fff"
        opacity={sparkleOpacity}
      />
    </g>
  );
}

export const FACE_DARK = '#2a1240';
