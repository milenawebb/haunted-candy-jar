import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  DEFAULT_WHISPER_GAIN,
  allocateWhisperGain,
} from '../../src/features/audio/whisperGain'

describe('whisperGain', () => {
  // Feature: haunted-candy-jar, Property 8: Whisper gain budget is bounded
  it('Validates: Requirement 11.1, 11.2 (total gain never exceeds a single whisper, split evenly)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 24 }), (n) => {
        const nodes = allocateWhisperGain(n, DEFAULT_WHISPER_GAIN)
        expect(nodes).toHaveLength(n)
        const total = nodes.reduce((sum, g) => sum + g, 0)
        // Float rounding can push the sum a few ulps over budget, so the
        // tolerance scales with n (n * EPSILON * budget bounds the error).
        expect(total).toBeLessThanOrEqual(
          DEFAULT_WHISPER_GAIN + n * Number.EPSILON * DEFAULT_WHISPER_GAIN,
        )
        nodes.forEach((g) => expect(g).toBe(DEFAULT_WHISPER_GAIN / n))
      }),
      { numRuns: 100 },
    )
  })

  it('returns an empty array for n <= 0', () => {
    expect(allocateWhisperGain(0, DEFAULT_WHISPER_GAIN)).toEqual([])
    expect(allocateWhisperGain(-3, DEFAULT_WHISPER_GAIN)).toEqual([])
  })

  it('gives each of 3 nodes a third of the budget', () => {
    expect(allocateWhisperGain(3, 0.3)).toEqual([0.3 / 3, 0.3 / 3, 0.3 / 3])
  })
})
