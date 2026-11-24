import { act, renderHook } from '@testing-library/react'
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HEAL_MS,
  HOLD_THRESHOLD_MS,
  usePressAndHold,
} from '../../src/hooks/usePressAndHold'

const ptr = (x = 0, y = 0) =>
  ({ button: 0, pointerId: 1, clientX: x, clientY: y, currentTarget: {} }) as never
const key = (k: string, repeat = false) =>
  ({ key: k, code: k === ' ' ? 'Space' : k, repeat, preventDefault: () => {} }) as never

const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

describe('usePressAndHold', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('exports the 800 ms threshold', () => {
    expect(HOLD_THRESHOLD_MS).toBe(800)
  })

  it('progress rises while held and onComplete fires only at 800 ms', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onComplete }))
    act(() => result.current.handlers.onPointerDown(ptr()))
    advance(400)
    expect(result.current.crackProgress).toBeGreaterThan(0.4)
    expect(result.current.crackProgress).toBeLessThan(0.6)
    advance(399)
    expect(onComplete).not.toHaveBeenCalled()
    advance(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(result.current.crackProgress).toBe(1)
    advance(2000)
    expect(onComplete).toHaveBeenCalledTimes(1)
    act(() => result.current.handlers.onPointerUp(ptr()))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(result.current.crackProgress).toBe(0)
  })

  it('early release heals to 0 without completing', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onComplete }))
    act(() => result.current.handlers.onPointerDown(ptr()))
    advance(400)
    act(() => result.current.handlers.onPointerUp(ptr()))
    expect(result.current.crackProgress).toBeGreaterThan(0)
    advance(HEAL_MS + 20)
    expect(result.current.crackProgress).toBe(0)
    advance(2000)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('Space works like a pointer hold', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onComplete }))
    act(() => result.current.handlers.onKeyDown(key(' ')))
    advance(800)
    expect(onComplete).toHaveBeenCalledTimes(1)
    act(() => result.current.handlers.onKeyUp(key(' ')))
    expect(result.current.crackProgress).toBe(0)
  })

  it('Space released early does not complete; Enter is ignored', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onComplete }))
    act(() => result.current.handlers.onKeyDown(key('Enter')))
    advance(1000)
    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.crackProgress).toBe(0)
    act(() => result.current.handlers.onKeyDown(key(' ')))
    advance(300)
    act(() => result.current.handlers.onKeyUp(key(' ')))
    advance(2000)
    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.crackProgress).toBe(0)
  })

  it('ignores key auto-repeat so the hold clock is not restarted', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onComplete }))
    act(() => result.current.handlers.onKeyDown(key(' ')))
    for (let i = 0; i < 7; i++) {
      advance(100)
      act(() => result.current.handlers.onKeyDown(key(' ', true)))
    }
    advance(100)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('moving beyond the slop cancels the hold', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onComplete }))
    act(() => result.current.handlers.onPointerDown(ptr(0, 0)))
    advance(200)
    act(() => result.current.handlers.onPointerMove(ptr(5, 5)))
    advance(100)
    expect(result.current.crackProgress).toBeGreaterThan(0)
    act(() => result.current.handlers.onPointerMove(ptr(20, 0)))
    advance(2000)
    expect(onComplete).not.toHaveBeenCalled()
    expect(result.current.crackProgress).toBe(0)
  })

  it('pointer cancel and leave end the hold', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onComplete }))
    act(() => result.current.handlers.onPointerDown(ptr()))
    advance(100)
    act(() => result.current.handlers.onPointerLeave(ptr()))
    act(() => result.current.handlers.onPointerDown(ptr()))
    advance(100)
    act(() => result.current.handlers.onPointerCancel(ptr()))
    advance(2000)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('unmount clears timers and frames', () => {
    const onComplete = vi.fn()
    const { result, unmount } = renderHook(() => usePressAndHold({ onComplete }))
    act(() => result.current.handlers.onPointerDown(ptr()))
    advance(100)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    advance(2000)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('does nothing when disabled', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => usePressAndHold({ onComplete, disabled: true }))
    act(() => result.current.handlers.onPointerDown(ptr()))
    advance(1000)
    expect(onComplete).not.toHaveBeenCalled()
  })

  // Validates: Requirement 4.3
  it('property: onComplete fires iff held duration >= 800 ms', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2000 }), (heldMs) => {
        const onComplete = vi.fn()
        const { result, unmount } = renderHook(() => usePressAndHold({ onComplete }))
        act(() => result.current.handlers.onPointerDown(ptr()))
        advance(heldMs)
        act(() => result.current.handlers.onPointerUp(ptr()))
        advance(HEAL_MS + 20)
        const fired = onComplete.mock.calls.length
        unmount()
        return fired === (heldMs >= HOLD_THRESHOLD_MS ? 1 : 0)
      }),
      { numRuns: 100 },
    )
  })
})
