import type { ReactNode } from 'react'
import './DeskBackground.css'

export interface DeskBackgroundProps {
  /** Rendered in the jar slot: centered on the desk, resting on its surface. */
  children?: ReactNode
}

/**
 * Full-bleed desk scene (the single allowed bitmap) with a soft top gradient
 * for title legibility and a positioned slot for the jar.
 */
export function DeskBackground({ children }: DeskBackgroundProps) {
  return (
    <div className="desk-bg">
      <img
        className="desk-bg__image"
        src="/images/desk-scene.png"
        width={1672}
        height={941}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="desk-bg__top-gradient" aria-hidden="true" />
      <div className="desk-bg__jar-slot">{children}</div>
    </div>
  )
}

export default DeskBackground
