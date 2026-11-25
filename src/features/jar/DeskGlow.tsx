import './DeskGlow.css';

/**
 * Soft shadow and warm candle glow on the desk under the jar. Static radial
 * gradients, so it needs no reduced-motion fallback. The layers extend past
 * the jar width and are centered on the jar base (y 656 of 684).
 */
export function DeskGlow() {
  return (
    <div className="desk-glow" data-testid="desk-glow" aria-hidden="true">
      <div className="desk-glow__warm" data-testid="desk-glow-warm" />
      <div className="desk-glow__shadow" data-testid="desk-glow-shadow" />
    </div>
  );
}
