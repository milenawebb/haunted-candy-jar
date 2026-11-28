import type { DecayStage } from '../tasks/taskTypes';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { decayLook } from './decayLook';
import './DecayOverlay.css';

/**
 * Stage-specific decoration drawn in the candy's 100x100 SVG space.
 *
 * - layer "back": radial halo behind the candy (purple for Spooky and Haunted,
 *   sickly green with a purple hint for Cursed)
 * - layer "front": wisps (Haunted) and dark warning cracks (Cursed)
 *
 * Cursed cracks are a fixed warning, drawn as thick dark jagged strokes with a
 * faint light edge. They look different from the hairline hold-progress cracks
 * of CandyCrack. Nothing here takes pointer events. The halo is static in
 * every motion mode.
 */
export interface DecayOverlayProps {
  stage: DecayStage;
  layer: 'back' | 'front';
  /** Unique id prefix for gradient ids. */
  uid: string;
  /** Override for tests; defaults to the useReducedMotion hook. */
  reducedMotion?: boolean;
}

const WISP_PATHS = [
  'M36 40 C28 30 44 24 36 14 C30 7 40 2 38 -6',
  'M52 36 C44 26 60 20 52 10 C46 3 56 -2 54 -10',
  'M68 40 C60 30 76 24 68 14 C62 7 72 2 70 -6',
];

const CRACK_PATHS = [
  'M58 22 L52 36 L60 44 L50 58 L57 68',
  'M30 52 L42 56 L46 66 L40 78',
  'M72 50 L64 56 L70 66 L62 74',
];

export function DecayOverlay({ stage, layer, uid, reducedMotion }: DecayOverlayProps) {
  const hookReduced = useReducedMotion();
  const reduced = reducedMotion ?? hookReduced;
  const look = decayLook(stage);

  if (layer === 'back') {
    if (look.glowLevel === 0) return null;
    const gradId = `${uid}-halo`;
    const strong = look.glowLevel === 2;
    if (look.greenGlow) {
      return (
        <g className="decay-overlay" data-part="glow-halo" data-glow="green" pointerEvents="none">
          <defs>
            <radialGradient id={gradId}>
              <stop offset="0%" style={{ stopColor: 'var(--color-cursed-glow, #9be37a)' }} stopOpacity="0.4" />
              <stop offset="55%" style={{ stopColor: 'var(--color-cursed-glow, #9be37a)' }} stopOpacity="0.2" />
              <stop offset="80%" stopColor="#8a4fd8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#8a4fd8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="52" r="64" fill={`url(#${gradId})`} />
        </g>
      );
    }
    return (
      <g className="decay-overlay" data-part="glow-halo" pointerEvents="none">
        <defs>
          <radialGradient id={gradId}>
            <stop offset="0%" stopColor="#b57bff" stopOpacity={strong ? 0.6 : 0.3} />
            <stop offset="60%" stopColor="#8a4fd8" stopOpacity={strong ? 0.28 : 0.12} />
            <stop offset="100%" stopColor="#8a4fd8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="52" r={strong ? 64 : 56} fill={`url(#${gradId})`} />
      </g>
    );
  }

  if (look.wisps === 0 && !look.cracks) return null;
  return (
    <g className="decay-overlay" pointerEvents="none">
      {look.wisps > 0 && (
        <g data-part="wisps">
          {WISP_PATHS.slice(0, look.wisps).map((d, i) => (
            <path
              key={i}
              data-part="wisp"
              className={reduced ? 'decay-wisp' : 'decay-wisp decay-wisp--animated'}
              d={d}
              fill="none"
              stroke="#e3d0ff"
              strokeOpacity="0.6"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </g>
      )}
      {look.cracks && (
        <g data-part="decay-cracks" fill="none" strokeLinejoin="miter" strokeLinecap="butt">
          {CRACK_PATHS.map((d, i) => (
            <g key={i}>
              <path d={d} stroke="rgba(255,255,255,0.25)" strokeWidth="4" transform="translate(0.8 0.8)" />
              <path data-part="decay-crack" d={d} stroke="#12061c" strokeWidth="2.6" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}
