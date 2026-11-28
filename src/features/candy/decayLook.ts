import type { DecayStage } from '../tasks/taskTypes';

/**
 * Pure per-stage look parameters for a candy.
 * Glow halo, wisps and crack lines are the non-color distinguishing
 * attributes between stages (Requirements 7.12 and 12.6).
 */
export interface DecayLook {
  highlightOpacity: number;
  sparkleOpacity: number;
  /** CSS filter applied to the monster body group. 'none' when untouched. */
  bodyFilter: string;
  /** 0 none, 1 faint purple halo, 2 strong halo. */
  glowLevel: 0 | 1 | 2;
  /** Number of ghostly wisp paths (0, or 3 for Haunted). */
  wisps: number;
  /** Dark warning crack lines (Cursed only). */
  cracks: boolean;
  /** Sickly green halo (Cursed only). Haunted stays purple. */
  greenGlow: boolean;
  /** Brighter, wider moon-pale rim light on both edges so the silhouette reads on the dark desk (Cursed only). */
  strongRim: boolean;
  /** Darker, wider contact shadow (Cursed only). */
  strongShadow: boolean;
}

const GLOW_FAINT = 'drop-shadow(0 0 3px rgba(176, 110, 255, 0.55))';
const GLOW_STRONG = 'drop-shadow(0 0 6px rgba(190, 120, 255, 0.95))';
/**
 * Cursed glow colors (static, no animation in any motion mode):
 * - green: #9be37a (token --color-cursed-glow). Back halo in DecayOverlay:
 *   radial gradient 0.6 at the core, 0.35 at 55 percent, faint purple 0.14 at
 *   80 percent, 0 at the edge, r=70 (was 0.4, 0.2, 0.12, r=64). The halo
 *   overflows the 100x100 candy box (the candy svg has overflow visible).
 *   Body drop-shadow: 7px at 0.65 (was 5px at 0.45).
 * - purple hint: 9px at rgba(176, 110, 255, 0.35), unchanged, so Cursed still
 *   belongs to the purple haunted family.
 */
const GLOW_CURSED =
  'drop-shadow(0 0 7px rgba(155, 227, 122, 0.65)) drop-shadow(0 0 9px rgba(176, 110, 255, 0.35))';
const NOT_CURSED = { greenGlow: false, strongRim: false, strongShadow: false };

const LOOKS: Record<DecayStage, DecayLook> = {
  Fresh: {
    highlightOpacity: 0.75,
    sparkleOpacity: 0.9,
    bodyFilter: 'none',
    glowLevel: 0,
    wisps: 0,
    cracks: false,
    ...NOT_CURSED,
  },
  Dull: {
    highlightOpacity: 0.35,
    sparkleOpacity: 0.3,
    bodyFilter: 'saturate(0.75) brightness(0.92)',
    glowLevel: 0,
    wisps: 0,
    cracks: false,
    ...NOT_CURSED,
  },
  Spooky: {
    highlightOpacity: 0.31,
    sparkleOpacity: 0.25,
    bodyFilter: `saturate(0.7) brightness(0.88) ${GLOW_FAINT}`,
    glowLevel: 1,
    wisps: 0,
    cracks: false,
    ...NOT_CURSED,
  },
  Haunted: {
    highlightOpacity: 0.26,
    sparkleOpacity: 0.2,
    bodyFilter: `saturate(0.65) brightness(0.85) ${GLOW_STRONG}`,
    glowLevel: 2,
    wisps: 3,
    cracks: false,
    ...NOT_CURSED,
  },
  Cursed: {
    highlightOpacity: 0.13,
    sparkleOpacity: 0.1,
    bodyFilter: `saturate(0.15) brightness(0.72) ${GLOW_CURSED}`,
    glowLevel: 2,
    wisps: 0,
    cracks: true,
    greenGlow: true,
    strongRim: true,
    strongShadow: true,
  },
};

export function decayLook(stage: DecayStage): DecayLook {
  return LOOKS[stage];
}
