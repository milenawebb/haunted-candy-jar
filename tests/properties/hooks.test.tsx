import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from '../../src/hooks/useReducedMotion'
import { useHauntClock } from '../../src/hooks/useHauntClock'
import { TaskStoreProvider, useTaskStore } from '../../src/features/tasks/taskStore'

describe('useReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('reflects matchMedia and updates on change', () => {
    let listener: ((e: MediaQueryListEvent) => void) | null = null
    const removed = vi.fn()
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => {
        listener = l
      },
      removeEventListener: removed,
    }))
    const { result, unmount } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
    act(() => listener!({ matches: false } as MediaQueryListEvent))
    expect(result.current).toBe(false)
    unmount()
    expect(removed).toHaveBeenCalled()
  })
})

describe('useHauntClock', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <TaskStoreProvider>{children}</TaskStoreProvider>
  )

  it('advances at 60x and never goes backward when speed changes', () => {
    const { result } = renderHook(
      () => ({ clock: useHauntClock(), store: useTaskStore() }),
      { wrapper },
    )
    expect(result.current.clock).toBe(1_000_000)

    act(() => result.current.store.dispatch({ type: 'SET_HAUNT_SPEED', speed: 60 }))
    const start = result.current.clock
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.clock).toBe(start + 600_000)

    const before = result.current.clock
    act(() => result.current.store.dispatch({ type: 'SET_HAUNT_SPEED', speed: 3600 }))
    expect(result.current.clock).toBeGreaterThanOrEqual(before)
    const mid = result.current.clock
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.clock).toBe(mid + 3_600_000)

    act(() => result.current.store.dispatch({ type: 'SET_HAUNT_SPEED', speed: 1 }))
    expect(result.current.clock).toBe(Date.now())
  })
})
