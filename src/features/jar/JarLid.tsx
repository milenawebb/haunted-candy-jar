import { useId } from 'react';
import { JAR_LID_PIVOT } from './jarGeometry';

export interface JarLidProps {
  /**
   * Optional SVG transform string applied to the whole lid, for example
   * `translate(0 -22) rotate(-14 200 30)`. Coordinates are jar viewBox units.
   * SVG rotates around the viewBox origin unless told otherwise, so pass the
   * pivot explicitly: use JAR_LID_PIVOT (the center of the lid underside,
   * x 200, y 30) as the rotate center. See `lidTransform`.
   */
  transform?: string;
}

/**
 * Builds a lid transform that lifts the lid by `lift` units and tilts it by
 * `tiltDeg` degrees around JAR_LID_PIVOT. Pure helper for LidAnimation.
 */
export function lidTransform(lift: number, tiltDeg: number): string {
  const { x, y } = JAR_LID_PIVOT;
  return `translate(0 ${-lift}) rotate(${tiltDeg} ${x} ${y})`;
}

/**
 * Jar lid: a dark bronze cap with a glass-rim highlight and a round knob,
 * sized to sit on the neck of the jar (outer neck spans x 56 to 344 at y 28).
 * Static SVG, so it has no motion fallback; LidAnimation owns movement and
 * its reduced-motion behavior. Pointer events are off so candies stay
 * tappable. Renders SVG content only, so it must sit inside the JarScene <svg>.
 */
export function JarLid({ transform }: JarLidProps) {
  const uid = useId().replace(/:/g, '');
  const capId = `hcj-lid-cap-${uid}`;
  const knobId = `hcj-lid-knob-${uid}`;
  const { x: cx } = JAR_LID_PIVOT;

  return (
    <g
      data-testid="jar-lid"
      aria-hidden="true"
      pointerEvents="none"
      style={{ pointerEvents: 'none' }}
      transform={transform}
    >
      <defs>
        <linearGradient id={capId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b4a8c" />
          <stop offset="0.5" stopColor="#3d2656" />
          <stop offset="1" stopColor="#21132f" />
        </linearGradient>
        <radialGradient id={knobId} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#f0d9ff" />
          <stop offset="0.45" stopColor="#8a62b0" />
          <stop offset="1" stopColor="#2c1a40" />
        </radialGradient>
      </defs>

      {/* Soft shadow where the lid meets the glass rim. */}
      <ellipse cx={cx} cy="31" rx="146" ry="3" fill="#000000" opacity="0.28" />

      {/* Knob stem and round knob. */}
      <rect x={cx - 9} y="14" width="18" height="8" rx="3" fill="#2c1a40" />
      <circle cx={cx} cy="11" r="11" fill={`url(#${knobId})`} />
      <circle cx={cx - 4} cy="7" r="3" fill="#ffffff" opacity="0.55" />

      {/* Cap body, slightly wider than the neck. */}
      <path
        d="M 52 30 V 26 Q 52 20 60 20 H 340 Q 348 20 348 26 V 30 Q 348 33 344 33 H 56 Q 52 33 52 30 Z"
        fill={`url(#${capId})`}
        stroke="#14091f"
        strokeOpacity="0.6"
        strokeWidth="1"
      />

      {/* Glass-rim highlight along the top edge and a bright rim glint. */}
      <path
        d="M 60 21.5 H 340"
        stroke="var(--color-glass-rim)"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="84" y="24" width="48" height="2.5" rx="1.25" fill="#ffffff" opacity="0.35" />
      <path
        d="M 56 33 H 344"
        stroke="var(--color-glass-rim)"
        strokeOpacity="0.4"
        strokeWidth="1"
        fill="none"
      />
    </g>
  );
}
