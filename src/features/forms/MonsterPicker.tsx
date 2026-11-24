import { useRef, useState, type KeyboardEvent } from 'react';
import { MonsterShape } from '../candy/MonsterShape';
import type { MonsterKind } from '../tasks/taskTypes';
import { MONSTER_KINDS } from '../../utils/monsterKind';
import './MonsterPicker.css';

/**
 * Grid of 8 small monster buttons.
 *
 * - `value` is the chosen monster, or `null` when the monster is auto-assigned
 *   (no button is pressed and a "Surprise me" hint is shown).
 * - Clicking an unselected monster calls `onChange(kind)`. Clicking the
 *   selected monster again calls `onChange(null)`, which returns to auto.
 * - Roving tabindex: only one button is in the tab order. Arrow keys move focus
 *   (wrapping), Home and End jump to the ends. Space and Enter select.
 * - The selected button shows a ring and a check mark, so state is not color only.
 */
export interface MonsterPickerProps {
  value: MonsterKind | null;
  onChange: (kind: MonsterKind | null) => void;
}

const COLUMNS = 4;
const THUMB_SIZE = 38;

export function monsterLabel(kind: MonsterKind): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function MonsterPicker({ value, onChange }: MonsterPickerProps) {
  const [focusIndex, setFocusIndex] = useState(() => Math.max(0, value === null ? 0 : MONSTER_KINDS.indexOf(value)));
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rovingIndex = focusIndex;

  const moveFocus = (index: number) => {
    const count = MONSTER_KINDS.length;
    const next = ((index % count) + count) % count;
    setFocusIndex(next);
    buttonRefs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(0);
        break;
      case 'End':
        event.preventDefault();
        moveFocus(MONSTER_KINDS.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="monster-picker">
      <div
        role="group"
        aria-label="Choose a monster"
        className="monster-picker__grid"
        style={{ gridTemplateColumns: `repeat(${COLUMNS}, 44px)` }}
      >
        {MONSTER_KINDS.map((kind, index) => {
          const selected = kind === value;
          return (
            <button
              key={kind}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              type="button"
              className="monster-picker__button"
              style={{ minWidth: 44, minHeight: 44 }}
              aria-label={monsterLabel(kind)}
              aria-pressed={selected}
              data-monster={kind}
              data-selected={selected ? 'true' : 'false'}
              tabIndex={index === rovingIndex ? 0 : -1}
              onFocus={() => setFocusIndex(index)}
              onKeyDown={(e) => onKeyDown(e, index)}
              onClick={() => onChange(selected ? null : kind)}
            >
              <MonsterShape kind={kind} decayStage="Fresh" size={THUMB_SIZE} />
              {selected && (
                <svg
                  className="monster-picker__check"
                  data-testid={`monster-check-${kind}`}
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                >
                  <circle cx="8" cy="8" r="8" fill="#ffaa44" />
                  <path
                    d="M4 8.5 L7 11.5 L12 5"
                    fill="none"
                    stroke="#1a0a2e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      {value === null && (
        <p className="monster-picker__hint" data-testid="monster-picker-hint">
          Surprise me
        </p>
      )}
    </div>
  );
}
