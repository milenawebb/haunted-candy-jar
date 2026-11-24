import { useEffect, useId, useRef } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import './GhostCheer.css'

/** Float-up and fade-out duration (ms). Must match GhostCheer.css. */
export const GHOST_CHEER_DURATION_MS = 1800
/** Reduced motion: static ghost stays visible this long (ms), after a 150 ms fade-in. */
export const GHOST_CHEER_REDUCED_MS = 1000

export interface GhostCheerProps {
  /** Called once when the animation (or the reduced-motion timeout) finishes. */
  onDone?: () => void
}

/**
 * Friendly ghost that cheers after a task is completed. Renders an SVG group
 * in the candy's 100x100 box so the parent can place it where the candy was.
 */
export function GhostCheer({ onDone }: GhostCheerProps) {
  const reduced = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const glowId = `ghost-glow-${uid}`
  const bodyId = `ghost-body-${uid}`

  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const ms = reduced ? GHOST_CHEER_REDUCED_MS : GHOST_CHEER_DURATION_MS
    const id = setTimeout(() => onDoneRef.current?.(), ms)
    return () => clearTimeout(id)
  }, [reduced])

  const cls = reduced ? 'ghost-cheer ghost-cheer--static' : 'ghost-cheer ghost-cheer--float'

  return (
    <g className={cls} aria-hidden="true" data-testid="ghost-cheer" style={{ pointerEvents: 'none' }}>
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-moon)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--color-moon)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="var(--color-moon)" />
        </linearGradient>
      </defs>

      {/* soft glow */}
      <circle cx="50" cy="50" r="46" fill={`url(#${glowId})`} />

      {/* body with wavy hem */}
      <path
        d="M30 78 L30 46 C30 32 39 24 50 24 C61 24 70 32 70 46 L70 78
           Q65 72 60 78 Q55 72 50 78 Q45 72 40 78 Q35 72 30 78 Z"
        fill={`url(#${bodyId})`}
        stroke="var(--color-moon-deep)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* cheering arms */}
      <path
        d="M31 54 Q22 50 21 40"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M69 54 Q78 50 79 40"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* happy face: closed smiling eyes, open smile, blush */}
      <path d="M40 45 Q43 41 46 45" fill="none" stroke="var(--color-bg)" strokeWidth="2" strokeLinecap="round" />
      <path d="M54 45 Q57 41 60 45" fill="none" stroke="var(--color-bg)" strokeWidth="2" strokeLinecap="round" />
      <path d="M43 52 Q50 62 57 52 Z" fill="var(--color-bg)" strokeLinejoin="round" />
      <ellipse cx="37" cy="52" rx="3" ry="2" fill="var(--color-candle)" opacity="0.45" />
      <ellipse cx="63" cy="52" rx="3" ry="2" fill="var(--color-candle)" opacity="0.45" />

      {/* tiny sparkle */}
      <path
        d="M82 22 L84 27 L89 29 L84 31 L82 36 L80 31 L75 29 L80 27 Z"
        fill="#ffffff"
        stroke="var(--color-moon)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </g>
  )
}
