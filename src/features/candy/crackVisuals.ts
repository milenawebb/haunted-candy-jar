/**
 * Pure mapping from press-and-hold progress to hold-crack visuals (Req 4.2, 4.3, 4.7, 4.10).
 * No side effects, no DOM access.
 */
export const CRACK_SEGMENT_COUNT = 8;
export const CRACK_MIN_WIDTH = 0.5;
export const CRACK_MAX_WIDTH = 1.6;
export const CRACK_MIN_OPACITY = 0.35;
export const CRACK_MAX_OPACITY = 0.95;

export interface CrackVisuals {
  /** Hairline stroke width in the 100x100 candy box. */
  strokeWidth: number;
  /** Opacity of the crack lines, 0 to 1. */
  opacity: number;
  /** How many of the CRACK_SEGMENT_COUNT segments are revealed. */
  segments: number;
}

/** Clamp to [0,1]. NaN becomes 0. */
export function clampProgress(progress: number): number {
  if (Number.isNaN(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

/**
 * Normal motion: segments, width and opacity grow with progress.
 * Reduced motion: nothing before progress reaches 1, then full cracks at once.
 */
export function crackVisuals(progress: number, reduced: boolean): CrackVisuals {
  const p = clampProgress(progress);
  if (reduced) {
    return p >= 1
      ? { strokeWidth: CRACK_MAX_WIDTH, opacity: CRACK_MAX_OPACITY, segments: CRACK_SEGMENT_COUNT }
      : { strokeWidth: 0, opacity: 0, segments: 0 };
  }
  if (p === 0) return { strokeWidth: 0, opacity: 0, segments: 0 };
  return {
    strokeWidth: CRACK_MIN_WIDTH + (CRACK_MAX_WIDTH - CRACK_MIN_WIDTH) * p,
    opacity: CRACK_MIN_OPACITY + (CRACK_MAX_OPACITY - CRACK_MIN_OPACITY) * p,
    segments: Math.ceil(p * CRACK_SEGMENT_COUNT),
  };
}
