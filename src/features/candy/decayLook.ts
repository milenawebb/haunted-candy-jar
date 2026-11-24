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
  /** 0 none, 1 faint purple halo, 2 strong purple halo. */
  glowLevel: 0 | 1 | 2;
  /** Number of ghostly wisp paths (0, or 3 for Haunted). */
  wisps: number;
  /** Dark warning crack lines (Cursed only). */
  cracks: boolean;
}

const GLOW_FAINT = 'drop-shadow(0 0 3px rgba(176, 110, 255, 0.55))';
const GLOW_STRONG = 'drop-shadow(0 0 6px rgba(190, 120, 255, 0.95))';

const LOOKS: Record<DecayStage, DecayLook> = {
  Fresh: {
    highlightOpacity: 0.85,
    sparkleOpacity: 0.9,
    bodyFilter: 'none',
    glowLevel: 0,
    wisps: 0,
    cracks: false,
  },
  Dull: {
    highlightOpacity: 0.4,
    sparkleOpacity: 0.3,
    bodyFilter: 'saturate(0.75) brightness(0.92)',
    glowLevel: 0,
    wisps: 0,
    cracks: false,
  },
  Spooky: {
    highlightOpacity: 0.35,
    sparkleOpacity: 0.25,
    bodyFilter: `saturate(0.7) brightness(0.88) ${GLOW_FAINT}`,
    glowLevel: 1,
    wisps: 0,
    cracks: false,
  },
  Haunted: {
    highlightOpacity: 0.3,
    sparkleOpacity: 0.2,
    bodyFilter: `saturate(0.65) brightness(0.85) ${GLOW_STRONG}`,
    glowLevel: 2,
    wisps: 3,
    cracks: false,
  },
  Cursed: {
    highlightOpacity: 0.15,
    sparkleOpacity: 0.1,
    bodyFilter: `saturate(0.15) brightness(0.6) ${GLOW_STRONG}`,
    glowLevel: 2,
    wisps: 0,
    cracks: true,
  },
};

export function decayLook(stage: DecayStage): DecayLook {
  return LOOKS[stage];
}
