import { useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CRACK_SEGMENT_COUNT, clampProgress, crackVisuals } from './crackVisuals';
import './CandyCrack.css';

/**
 * Hold-progress crack overlay, drawn in the candy's 100x100 box.
 * Renders a <g>, so place it inside any SVG that uses the MonsterShape box
 * (standalone or nested). Hairline, light strokes with a faint dark edge, which
 * keeps it distinct from the thick dark Cursed cracks in DecayOverlay.
 */
export interface CandyCrackProps {
  /** Press-and-hold progress, 0 to 1. Out-of-range and NaN are clamped. */
  progress: number;
  /** Override for tests; defaults to the useReducedMotion hook. */
  reducedMotion?: boolean;
}

const CRACK_SEGMENTS = [
  'M52 18 L47 30 L54 38',
  'M54 38 L48 50 L56 58',
  'M56 58 L50 68 L55 80',
  'M47 30 L36 34 L30 44',
  'M48 50 L38 56 L32 68',
  'M54 38 L66 42 L72 52',
  'M56 58 L67 64 L70 76',
  'M50 68 L42 78 L40 88',
];

export function CandyCrack({ progress, reducedMotion }: CandyCrackProps) {
  const hookReduced = useReducedMotion();
  const reduced = reducedMotion ?? hookReduced;
  const p = clampProgress(progress);

  // Track the previous progress during render so a falling value gets the heal transition.
  const [prev, setPrev] = useState(p);
  const [healing, setHealing] = useState(false);
  if (prev !== p) {
    setPrev(p);
    setHealing(p < prev);
  }

  const v = crackVisuals(p, reduced);
  const cls = ['candy-crack', healing ? 'candy-crack--heal' : '', reduced ? 'candy-crack--reduced' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <g
      className={cls}
      data-part="candy-crack"
      data-revealed={v.segments}
      aria-hidden="true"
      pointerEvents="none"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {CRACK_SEGMENTS.slice(0, CRACK_SEGMENT_COUNT).map((d, i) => {
        const visible = i < v.segments;
        return (
          <g key={i} data-part="hold-crack" data-visible={visible ? 'true' : 'false'}>
            <path
              className="candy-crack__seg"
              d={d}
              pathLength={1}
              stroke="#2a1038"
              strokeWidth={visible ? v.strokeWidth + 0.8 : 0}
              strokeDashoffset={visible ? 0 : 1}
              opacity={visible ? v.opacity * 0.4 : 0}
            />
            <path
              className="candy-crack__seg"
              d={d}
              pathLength={1}
              stroke="#fff8ee"
              strokeWidth={visible ? v.strokeWidth : 0}
              strokeDashoffset={visible ? 0 : 1}
              opacity={visible ? v.opacity : 0}
            />
          </g>
        );
      })}
    </g>
  );
}
