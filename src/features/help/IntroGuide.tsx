import { useState, type ReactNode } from 'react'
import { MonsterShape } from '../candy/MonsterShape'
import { FormFrame } from '../forms/taskFormShared'
import { DECAY_STAGE_ORDER } from '../tasks/taskTypes'
import './Help.css'

/** The three first-visit cards. The text is the exact copy. */
export const INTRO_CARDS: readonly { text: string; art: () => ReactNode }[] = [
  {
    text: 'Every task is a candy in your jar.',
    art: () => <MonsterShape kind="pumpkin" decayStage="Fresh" size={72} />,
  },
  {
    text: 'Leave it too long and it rots: Fresh, Dull, Spooky, Haunted, Cursed.',
    art: () => (
      <ul className="help-stages help-stages--small" aria-hidden="true">
        {DECAY_STAGE_ORDER.map((stage) => (
          <li key={stage}>
            <MonsterShape kind="pumpkin" decayStage={stage} size={40} />
            <span>{stage}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    text: 'Cursed candies escape onto your desk. Tap a candy for options, or press and hold to crack it open and finish it.',
    art: () => <MonsterShape kind="pumpkin" decayStage="Cursed" size={72} />,
  },
]

function IntroBody({ onClose, headingId }: { onClose: () => void; headingId: string }) {
  const [step, setStep] = useState(0)
  const last = step === INTRO_CARDS.length - 1
  const card = INTRO_CARDS[step]!
  return (
    <div className="help-panel help-intro">
      <h2 id={headingId} className="help-panel__heading">
        Welcome to the jar
      </h2>
      <div className="help-intro__art">{card.art()}</div>
      <p className="help-intro__text">{card.text}</p>
      <div className="help-intro__steps">
        <span aria-live="polite">{`${step + 1} of ${INTRO_CARDS.length}`}</span>
        <span className="help-dots" aria-hidden="true">
          {INTRO_CARDS.map((_, i) => (
            <span key={i} className={i === step ? 'help-dot help-dot--on' : 'help-dot'} />
          ))}
        </span>
      </div>
      <div className="help-intro__actions">
        <button type="button" className="help-link" onClick={onClose}>
          Skip
        </button>
        <div className="help-intro__nav">
          {step > 0 && (
            <button type="button" className="add-task-form__btn add-task-form__btn--ghost" onClick={() => setStep(step - 1)}>
              Back
            </button>
          )}
          <button type="button" className="add-task-form__btn" onClick={() => (last ? onClose() : setStep(step + 1))}>
            {last ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * First-visit guide: three short cards. Skip, "Got it" and Escape all call
 * `onClose`. A modal on desktop, a BottomSheet on mobile.
 */
export function IntroGuide({ onClose }: { onClose: () => void }) {
  return <FormFrame onClose={onClose}>{(headingId) => <IntroBody onClose={onClose} headingId={headingId} />}</FormFrame>
}
