import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'

/** Hold duration required to complete a task (Requirement 4.1). */
export const HOLD_THRESHOLD_MS = 800
/** Pointer travel (px) beyond which the hold is cancelled, so scroll or drag never completes. */
export const MOVE_SLOP_PX = 10
/** Duration of the rAF heal after an early release (Requirement 4.3). */
export const HEAL_MS = 200

export interface UsePressAndHoldOptions {
  onComplete: () => void
  thresholdMs?: number
  disabled?: boolean
}

export interface PressAndHoldHandlers {
  onPointerDown: (e: PointerEvent<Element>) => void
  onPointerMove: (e: PointerEvent<Element>) => void
  onPointerUp: (e: PointerEvent<Element>) => void
  onPointerCancel: (e: PointerEvent<Element>) => void
  onPointerLeave: (e: PointerEvent<Element>) => void
  onKeyDown: (e: KeyboardEvent<Element>) => void
  onKeyUp: (e: KeyboardEvent<Element>) => void
  onBlur: () => void
}

export interface UsePressAndHoldResult {
  handlers: PressAndHoldHandlers
  /** 0 to 1. Rises while held, heals back to 0 after an early release. */
  crackProgress: number
}

type Phase = 'idle' | 'holding' | 'done'

function isSpace(e: KeyboardEvent<Element>): boolean {
  return e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space'
}

/**
 * Press-and-hold gesture for pointer and the Space key.
 *
 * Choices: completion is driven by a setTimeout at the threshold (exact, and it still
 * fires in background tabs where rAF pauses). rAF only drives the visual progress.
 * Early release heals via a short rAF tween (HEAL_MS) so the hook owns the reversal.
 * The hook never calls preventDefault on pointer events, so a quick tap still produces a click.
 * Under reduced motion the hook behaves identically; CandyCrack decides the visuals.
 */
export function usePressAndHold({
  onComplete,
  thresholdMs = HOLD_THRESHOLD_MS,
  disabled = false,
}: UsePressAndHoldOptions): UsePressAndHoldResult {
  const [crackProgress, setCrackProgress] = useState(0)

  const phase = useRef<Phase>('idle')
  const source = useRef<'pointer' | 'key' | null>(null)
  const pointerId = useRef<number | null>(null)
  const origin = useRef({ x: 0, y: 0 })
  const startTime = useRef(0)
  const progressRef = useRef(0)
  const raf = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCompleteRef = useRef(onComplete)
  const thresholdRef = useRef(thresholdMs)

  useEffect(() => {
    onCompleteRef.current = onComplete
    thresholdRef.current = thresholdMs
  })

  const setProgress = useCallback((p: number) => {
    progressRef.current = p
    setCrackProgress(p)
  }, [])

  const stopFrames = useCallback(() => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current)
      raf.current = null
    }
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const heal = useCallback(() => {
    const from = progressRef.current
    if (from <= 0) return
    const begin = performance.now()
    const step = () => {
      const t = Math.min(1, (performance.now() - begin) / HEAL_MS)
      setProgress(from * (1 - t))
      raf.current = t < 1 ? requestAnimationFrame(step) : null
    }
    raf.current = requestAnimationFrame(step)
  }, [setProgress])

  const complete = useCallback(() => {
    if (phase.current !== 'holding') return
    phase.current = 'done'
    stopFrames()
    setProgress(1)
    onCompleteRef.current()
  }, [setProgress, stopFrames])

  const start = useCallback(
    (from: 'pointer' | 'key') => {
      stopFrames()
      phase.current = 'holding'
      source.current = from
      startTime.current = performance.now()
      setProgress(0)
      const tick = () => {
        if (phase.current !== 'holding') return
        const p = Math.min(1, (performance.now() - startTime.current) / thresholdRef.current)
        setProgress(p)
        raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
      timer.current = setTimeout(complete, thresholdRef.current)
    },
    [complete, setProgress, stopFrames],
  )

  /** End the gesture. Early release heals; a finished hold just resets. */
  const release = useCallback(() => {
    const was = phase.current
    if (was === 'idle') return
    if (was === 'holding' && performance.now() - startTime.current >= thresholdRef.current) {
      complete()
    }
    const finished = phase.current === 'done'
    stopFrames()
    phase.current = 'idle'
    source.current = null
    pointerId.current = null
    if (finished) setProgress(0)
    else heal()
  }, [complete, heal, setProgress, stopFrames])

  useEffect(() => {
    if (disabled && phase.current !== 'idle') {
      stopFrames()
      phase.current = 'idle'
      source.current = null
      setProgress(0)
    }
  }, [disabled, setProgress, stopFrames])

  useEffect(() => stopFrames, [stopFrames])

  const handlers = useMemo<PressAndHoldHandlers>(
    () => ({
      onPointerDown: (e) => {
        if (disabled || phase.current !== 'idle') return
        if (e.button !== undefined && e.button !== 0) return
        origin.current = { x: e.clientX, y: e.clientY }
        pointerId.current = e.pointerId
        const el = e.currentTarget as Element & { setPointerCapture?: (id: number) => void }
        try {
          el.setPointerCapture?.(e.pointerId)
        } catch {
          // Capture can fail for synthetic or already-released pointers; the hold still works.
        }
        start('pointer')
      },
      onPointerMove: (e) => {
        if (source.current !== 'pointer' || phase.current !== 'holding') return
        const dx = e.clientX - origin.current.x
        const dy = e.clientY - origin.current.y
        if (Math.hypot(dx, dy) > MOVE_SLOP_PX) release()
      },
      onPointerUp: () => {
        if (source.current === 'pointer') release()
      },
      onPointerCancel: () => {
        if (source.current === 'pointer') release()
      },
      onPointerLeave: () => {
        if (source.current === 'pointer') release()
      },
      onKeyDown: (e) => {
        if (!isSpace(e)) return
        if (disabled) return
        e.preventDefault()
        if (e.repeat || phase.current !== 'idle') return
        start('key')
      },
      onKeyUp: (e) => {
        if (!isSpace(e) || source.current !== 'key') return
        e.preventDefault()
        release()
      },
      onBlur: () => {
        if (source.current === 'key') release()
      },
    }),
    [disabled, release, start],
  )

  return { handlers, crackProgress }
}
