import { useEffect, useRef, useState } from 'react'
import { computeLogicalNow, type HauntSpeed } from '../features/settings/hauntClock'
import { useTaskStore } from '../features/tasks/taskStore'

interface Anchor {
  speed: HauntSpeed
  wall: number
  logical: number
}

/**
 * Current logical timestamp (ms). Re-anchors whenever Haunt Speed changes so
 * logical time never jumps backward. At 1x it equals Date.now().
 */
export function useHauntClock(): number {
  const { state } = useTaskStore()
  const speed = state.hauntSpeed
  const anchorRef = useRef<Anchor | null>(null)
  if (anchorRef.current === null) {
    const now = Date.now()
    anchorRef.current = { speed, wall: now, logical: now }
  }
  const [logicalNow, setLogicalNow] = useState<number>(() => anchorRef.current!.logical)

  useEffect(() => {
    const prev = anchorRef.current!
    const wall = Date.now()
    if (prev.speed !== speed) {
      const logical = computeLogicalNow(wall, prev.speed, prev.wall, prev.logical)
      anchorRef.current = { speed, wall, logical }
    }
    const a = anchorRef.current!
    setLogicalNow(computeLogicalNow(wall, speed, a.wall, a.logical))
    const tick = () => {
      const cur = anchorRef.current!
      setLogicalNow(computeLogicalNow(Date.now(), cur.speed, cur.wall, cur.logical))
    }
    const id = setInterval(tick, speed > 1 ? 1000 : 60000)
    return () => clearInterval(id)
  }, [speed])

  return logicalNow
}
