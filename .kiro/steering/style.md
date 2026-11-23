# Style and Code Rules

These rules apply to all code, comments, UI copy, the README, and all documentation.

## No em dashes

Never use em dashes in any user-facing text, code comments, the README, or documentation.
Use commas, periods, or parentheses instead.

Wrong:  a spooky task manager [em dash] for Halloween lovers
Right:  a spooky task manager for Halloween lovers
Right:  a spooky task manager (perfect for Halloween)

## UI copy voice

All user-facing text must be short, playful, and spooky-cute. Never gory.

Principles:
- Friendly and a little mischievous, not scary or violent.
- Halloween aesthetic: ghosts, candy, candles, moonlight, cobwebs. Not blood, death, or horror.
- Short: button labels one or two words, toast messages one sentence max.
- Playful word choices where natural (Cursed, Haunted, Spooky, Ghost, Brew) but never forced.

Examples of good copy: "Add a candy", "Clear samples", "Haunt Speed", "Your jar is empty. Drop in a candy!", "Task completed (a ghost cheers)"

Examples of bad copy: "Delete this task forever", "Task destroyed", "Blood Candy", "Rip and tear"

## Reduced-motion fallbacks

Every animation must have a reduced-motion fallback.

Rules:
- Read the prefers-reduced-motion media query via the useReducedMotion hook.
- When reduced motion is active: replace movement-based animations with instant state changes or opacity fades (150ms max).
- Static visual indicators must convey the same information the animation conveyed.
- The 0.8-second press-and-hold threshold still applies under reduced motion. Only the visual crack frames are skipped.
- The focus mode candle timer shows a numeric countdown instead of the burning animation.
- Background scene animations (fog, ghosts) freeze into a static composition.
- Apply the CSS media query `@media (prefers-reduced-motion: reduce)` for CSS-only animations.
- Use the useReducedMotion hook for JS-driven animation decisions.

## Accessible interactive elements

Every interactive element must have:
1. An accessible name (aria-label, aria-labelledby, or visible text label).
2. A minimum hit area of 44x44 CSS pixels on all viewports.

Specific rules:
- Candy hit areas: enforced via a transparent SVG rect overlay, regardless of candy visual size or rotation.
- Icon-only buttons: must have aria-label describing the action.
- Toggle buttons: must carry aria-pressed (true or false).
- Form fields: must have an associated label element or aria-label.
- Context menu and bottom sheet: must trap keyboard focus while open.
- Decay stage changes: must update the candy ARIA label so screen readers announce the new stage.
- Focus timer: must expose remaining time as an ARIA live region, updating at most once per minute.
- Do not use color as the only indicator of state. Always pair color with a shape, texture, or text difference.

## Pure logic and property tests

Keep the pure logic layer free of side effects and cover it with property-based tests.

Pure files (no side effects, no DOM access, no module-level mutable state):
- decayFunction.ts
- taskReducer.ts
- taskSchema.ts
- exportImport.ts
- candyShape.ts
- packingLayout.ts

Property-based test requirements:
- decayFunction: monotonic non-decrease (stage never goes backward as time moves forward).
- decayFunction: correct stage for both decay paths (due-date and age-based).
- Task serialisation: round-trip property (serialize then deserialize equals original, including shape field).
- taskReducer: undo restores prior task state exactly.
- whisperGain: total gain across N Cursed candies never exceeds single-whisper default gain.

Use fast-check arbitraries to generate random inputs. Run at least 100 iterations per property.
Tag each test with the requirement it validates (e.g., "Validates: Requirement 8.2").
