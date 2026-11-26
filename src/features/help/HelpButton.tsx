import './Help.css'

/** Always-visible "?" button, top right. Opens the How it works panel. */
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="help-button" aria-label="How it works" aria-haspopup="dialog" onClick={onClick}>
      <span aria-hidden="true">?</span>
    </button>
  )
}
