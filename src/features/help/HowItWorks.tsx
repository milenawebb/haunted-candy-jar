import { MonsterShape } from '../candy/MonsterShape'
import { FormFrame } from '../forms/taskFormShared'
import { DECAY_STAGE_ORDER, type DecayStage } from '../tasks/taskTypes'
import './Help.css'

/** When each stage happens (matches decayFunction.ts: due date path, then age path). */
export const STAGE_LINES: Record<DecayStage, string> = {
  Fresh: 'Due in more than 2 days, or added under 3 days ago.',
  Dull: 'Due within 2 days, or 3 to 7 days old.',
  Spooky: 'Due within a day, or 7 to 14 days old.',
  Haunted: 'Due within 2 hours or up to a day late, or 14 to 21 days old.',
  Cursed: 'More than a day late, or 21 days old or more.',
}

export const ESCAPE_LINE = 'Cursed candies escape the jar and wait on your desk until you deal with them.'

export const GESTURES = [
  'Tap a candy for options.',
  'Press and hold a candy to complete it.',
  'Drag desk candies to move them.',
  'Undo after completing or deleting.',
]

function PanelBody({ onClose, onShowIntro, headingId }: { onClose: () => void; onShowIntro: () => void; headingId: string }) {
  return (
    <div className="help-panel">
      <h2 id={headingId} className="help-panel__heading">
        How it works
      </h2>
      <div className="help-scroll">
        <ul className="help-stages">
          {DECAY_STAGE_ORDER.map((stage) => (
            <li key={stage} data-testid="help-stage">
              <MonsterShape kind="pumpkin" decayStage={stage} size={40} />
              <span>
                <strong>{stage}</strong>
                <br />
                {STAGE_LINES[stage]}
              </span>
            </li>
          ))}
        </ul>
        <p className="help-panel__note">{ESCAPE_LINE}</p>
        <ul className="help-gestures">
          {GESTURES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="help-panel__actions">
        <button type="button" className="help-link" onClick={onShowIntro}>
          Show the intro again
        </button>
        <button type="button" className="add-task-form__btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

/** The "How it works" panel: modal on desktop, BottomSheet on mobile. */
export function HowItWorks({ onClose, onShowIntro }: { onClose: () => void; onShowIntro: () => void }) {
  return (
    <FormFrame onClose={onClose}>
      {(headingId) => <PanelBody onClose={onClose} onShowIntro={onShowIntro} headingId={headingId} />}
    </FormFrame>
  )
}
