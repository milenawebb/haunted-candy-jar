import { useId } from 'react';
import { JAR_INSIDE_PATH, JAR_OUTER_PATH } from './jarGeometry';

/**
 * Front glass layer: bright side rims, slightly darker edges, vertical light
 * streaks, a faint window reflection on the right, a thick glass base and a
 * warm candle glow on the left. Static SVG (no animation), so no motion
 * fallback is needed. Pointer events are off so candies stay tappable.
 * Renders SVG content only, so it must sit inside the JarScene <svg>.
 */
export function JarFrontGlass() {
  const uid = useId().replace(/:/g, '');
  const rimId = `hcj-front-rim-${uid}`;
  const baseId = `hcj-front-base-${uid}`;
  const glowId = `hcj-front-glow-${uid}`;
  const edgeId = `hcj-front-edge-${uid}`;
  const winId = `hcj-front-window-${uid}`;
  const clipId = `hcj-front-clip-${uid}`;
  const wallPath = `${JAR_OUTER_PATH} ${JAR_INSIDE_PATH}`;
  return (
    <g
      data-testid="jar-front-glass"
      aria-hidden="true"
      pointerEvents="none"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id={rimId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--color-glass-rim)" stopOpacity="0.85" />
          <stop offset="0.12" stopColor="var(--color-glass-rim)" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="var(--color-glass-rim)" stopOpacity="0.25" />
          <stop offset="0.88" stopColor="var(--color-glass-rim)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--color-glass-rim)" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id={baseId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-glass-rim)" stopOpacity="0.1" />
          <stop offset="0.6" stopColor="var(--color-glass-rim)" stopOpacity="0.45" />
          <stop offset="1" stopColor="#6a8ab8" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={edgeId} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0.75" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
        </radialGradient>
        <linearGradient id={glowId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--color-candle)" stopOpacity="0.4" />
          <stop offset="0.5" stopColor="var(--color-candle-deep)" stopOpacity="0.12" />
          <stop offset="1" stopColor="var(--color-candle-deep)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={winId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-moon)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--color-moon)" stopOpacity="0.05" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={JAR_INSIDE_PATH} />
        </clipPath>
      </defs>
      {/* Darker inner edges, then warm candle glow on the left side. */}
      <path d={JAR_INSIDE_PATH} fill={`url(#${edgeId})`} />
      <g clipPath={`url(#${clipId})`}>
        <rect x="40" y="100" width="150" height="544" fill={`url(#${glowId})`} />
        {/* Vertical light streaks. */}
        <rect x="62" y="130" width="9" height="400" rx="4.5" fill="#ffffff" opacity="0.4" />
        <rect x="78" y="150" width="3" height="260" rx="1.5" fill="#ffffff" opacity="0.28" />
        <rect x="334" y="140" width="5" height="340" rx="2.5" fill="#ffffff" opacity="0.22" />
        {/* Soft window reflection on the right: a pane with two mullions. */}
        <g transform="translate(262 190) skewY(-4)" opacity="0.3">
          <rect width="70" height="96" rx="4" fill={`url(#${winId})`} />
          <rect x="33" width="4" height="96" fill="#ffffff" opacity="0.12" />
          <rect y="46" width="70" height="4" fill="#ffffff" opacity="0.12" />
        </g>
      </g>
      {/* Thick glass base with a bright top edge. */}
      <path
        d="M 40 608 Q 40 636 68 636 H 332 Q 360 636 360 608 Q 360 618 332 618 H 68 Q 40 618 40 608 Z"
        fill={`url(#${baseId})`}
      />
      <path
        d="M 44 618 H 356"
        stroke="#ffffff"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Glass wall between the outer and inside outlines. */}
      <path d={wallPath} fillRule="evenodd" fill={`url(#${rimId})`} />
      <path
        d={JAR_OUTER_PATH}
        fill="none"
        stroke="var(--color-glass-rim)"
        strokeOpacity="0.6"
        strokeWidth="1.5"
      />
      <path
        d={JAR_INSIDE_PATH}
        fill="none"
        stroke="#000000"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
    </g>
  );
}
