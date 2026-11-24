import { useId } from 'react';
import { JAR_INSIDE_PATH } from './jarGeometry';

/**
 * Back glass layer: a very light inner tint, faint glass tint and slightly
 * darker inner edges, so the desk wall and curtain behind show through.
 * Renders SVG content only, so it must sit inside the JarScene <svg>.
 */
export function JarBackGlass() {
  const uid = useId().replace(/:/g, '');
  const edgeId = `hcj-back-edge-${uid}`;
  const wallId = `hcj-back-wall-${uid}`;
  return (
    <g data-testid="jar-back-glass" aria-hidden="true">
      <defs>
        <linearGradient id={wallId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a1648" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="#1a0a2e" stopOpacity="0.1" />
          <stop offset="1" stopColor="#0d0514" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id={edgeId} cx="0.5" cy="0.55" r="0.62">
          <stop offset="0.7" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
        </radialGradient>
      </defs>
      <path d={JAR_INSIDE_PATH} fill={`url(#${wallId})`} />
      <path d={JAR_INSIDE_PATH} fill="var(--color-glass)" />
      <path d={JAR_INSIDE_PATH} fill={`url(#${edgeId})`} />
      <path
        d={JAR_INSIDE_PATH}
        fill="none"
        stroke="#000000"
        strokeOpacity="0.2"
        strokeWidth="2"
      />
    </g>
  );
}
