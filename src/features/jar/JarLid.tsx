import { useId } from 'react';
import { JAR_LID_PIVOT } from './jarGeometry';

export interface JarLidProps {
  /**
   * Optional SVG transform string applied to the whole lid, for example
   * `translate(0 -22) rotate(-14 200 28)`. Coordinates are jar viewBox units.
   * SVG rotates around the viewBox origin unless told otherwise, so pass the
   * pivot explicitly: use JAR_LID_PIVOT (the center of the lid underside,
   * x 200, y 28) as the rotate center. See `lidTransform`.
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
 * Jar lid: a glass dome lid (about 40 units tall, base at y 28) with a glass
 * knob, resting on the neck mouth (outer neck spans x 56 to 344 at y 28).
 * Static SVG, so it has no motion fallback; LidAnimation owns movement and
 * its reduced-motion behavior. Pointer events are off so candies stay
 * tappable. Renders SVG content only, so it must sit inside the JarScene <svg>.
 */
export function JarLid({ transform }: JarLidProps) {
  const uid = useId().replace(/:/g, '');
  const capId = `hcj-lid-cap-${uid}`;
  const knobId = `hcj-lid-knob-${uid}`;
  const { x: cx } = JAR_LID_PIVOT;
  const domePath =
    'M 52 28 V 12 Q 52 4 62 3 Q 200 -26 338 3 Q 348 4 348 12 V 28 Z';
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
          <stop offset="0" stopColor="var(--color-moon)" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="var(--color-glass-rim)" stopOpacity="0.3" />
          <stop offset="0.8" stopColor="var(--color-glass)" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6a4a9a" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={knobId} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="var(--color-moon)" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="var(--color-glass-rim)" stopOpacity="0.5" />
          <stop offset="1" stopColor="#6a4a9a" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      {/* Soft shadow where the lid meets the glass rim. */}
      <ellipse cx={cx} cy="30" rx="146" ry="3" fill="#000000" opacity="0.28" />
      {/* Glass knob stem and round knob. */}
      <rect
        x={cx - 12}
        y="-22"
        width="24"
        height="16"
        rx="4"
        fill="var(--color-glass-rim)"
        fillOpacity="0.4"
        stroke="var(--color-glass-rim)"
        strokeOpacity="0.6"
        strokeWidth="1"
      />
      <circle
        cx={cx}
        cy="-38"
        r="22"
        fill={`url(#${knobId})`}
        stroke="var(--color-glass-rim)"
        strokeOpacity="0.7"
        strokeWidth="1.5"
      />
      <ellipse cx={cx - 8} cy="-48" rx="7" ry="4.5" fill="#ffffff" opacity="0.7" transform={`rotate(-30 ${cx - 8} -48)`} />
      <circle cx={cx + 9} cy="-27" r="2.5" fill="#ffffff" opacity="0.35" />
      {/* Domed glass cap, base resting on the neck mouth at y 28. */}
      <path
        d={domePath}
        fill={`url(#${capId})`}
        stroke="var(--color-glass-rim)"
        strokeOpacity="0.75"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Bright highlight along the dome top, and a lower rim band. */}
      <path
        d="M 68 6 Q 200 -20 332 6"
        stroke="#ffffff"
        strokeOpacity="0.85"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 70 14 Q 200 -8 330 14"
        stroke="var(--color-moon)"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="52" y="21" width="296" height="7" fill="#6a4a9a" opacity="0.3" />
      <path
        d="M 52 21 H 348"
        stroke="var(--color-glass-rim)"
        strokeOpacity="0.5"
        strokeWidth="1"
        fill="none"
      />
      {/* Vertical glints on the glass. */}
      <rect x="66" y="8" width="7" height="16" rx="3.5" fill="#ffffff" opacity="0.5" />
      <rect x="318" y="10" width="4" height="12" rx="2" fill="#ffffff" opacity="0.28" />
    </g>
  );
}
