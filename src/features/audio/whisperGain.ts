/** Default gain of a single whisper sound (the combined whisper budget). */
export const DEFAULT_WHISPER_GAIN = 0.05

/**
 * Splits a gain budget evenly across n whisper nodes.
 * Returns [] when n <= 0 or n is not finite.
 */
export function allocateWhisperGain(n: number, budget: number): number[] {
  if (!Number.isFinite(n) || n <= 0) return []
  const count = Math.floor(n)
  if (count <= 0) return []
  const each = budget / count
  return Array.from({ length: count }, () => each)
}
