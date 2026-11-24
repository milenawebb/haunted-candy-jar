export type HauntSpeed = 1 | 60 | 3600

/**
 * Pure logical clock for Haunt Speed.
 *
 * At 1x, logical time IS wall time: the anchors are ignored and `wallNow` is
 * returned unchanged, so returning to 1x always yields logicalNow === Date.now().
 * At speed > 1x, logical time advances proportionally from the session anchor:
 * sessionStartLogical + (wallNow - sessionStartWall) * speed.
 */
export function computeLogicalNow(
  wallNow: number,
  speed: HauntSpeed,
  sessionStartWall: number,
  sessionStartLogical: number,
): number {
  if (speed === 1) return wallNow
  return sessionStartLogical + (wallNow - sessionStartWall) * speed
}
