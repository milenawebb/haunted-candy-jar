# Implementation Plan: Haunted Candy Jar

## Overview

Build the Haunted Candy Jar SPA from scratch in React + TypeScript + Vite. Tasks follow a strict dependency order: pure logic first, then the state layer, then rendering, then interactions, then features, then polish. Each task is completable in a single focused session. Tasks marked `*` are optional polish that can be skipped for a shippable hackathon MVP.

---

## Tasks

### Phase 0: Spec update

- [x] 0. Spec update: new visual direction
  - Apply the new visual direction as targeted edits to requirements.md, design.md, tasks.md and .kiro/steering/style.md
  - Keep every existing requirement, acceptance criterion and the decay thresholds

### Phase 1: Project setup

- [x] 1. Scaffold Vite + React + TypeScript project with tooling
  - Run `npm create vite@latest haunted-candy-jar -- --template react-ts` and install dev dependencies: Vitest, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `vitest-axe`, `fast-check`, `@fast-check/vitest`, `zod`
  - Configure `vite.config.ts`: set `test.environment` to `jsdom`, add `test.globals: true`, alias `@` to `src/`
  - Add `vitest.setup.ts` that imports `@testing-library/jest-dom` matchers
  - Add `tsconfig.json` strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
  - _Requirements: 19.1_

- [x] 2. Add LICENSE, README, and Cloudflare Pages config
  - Create `LICENSE` file with the MIT License text, copyright year and author placeholder
  - Create `README.md` with project name, one-line description, local dev command, and build command
  - Create `public/_redirects` with a single-page app rewrite rule (`/* /index.html 200`) for Cloudflare Pages
  - _Requirements: 19.2, 19.3, 19.4_

- [x] 3. Self-host fonts and establish global CSS design tokens
  - Place `Creepster-Regular.woff2` and `Inter-VariableFont.woff2` in `public/fonts/`
  - Create `src/styles/fonts.css` with `@font-face` declarations for both fonts (no CDN fetch)
  - Create `src/styles/tokens.css` defining CSS custom properties for every color token (`--color-bg`, `--color-bg-deep`, `--color-candle`, `--color-candle-deep`, `--color-moon`, `--color-moon-deep`, plus the glass tokens `--color-glass` and `--color-glass-rim`, the bandage tokens `--color-bandage` and `--color-bandage-ink`, and the monster tokens `--monster-pumpkin`, `--monster-mummy`, `--monster-skeleton`, `--monster-spider`, `--monster-frankenstein`, `--monster-vampire`, `--monster-bat`, `--monster-gravestone`), shadow styles, and spacing scale; there are no `flavor-*` tokens (values are in the design palette table)
  - Create `src/styles/reset.css` with a minimal CSS reset (box-sizing, margin/padding zeroing, font inheritance)
  - Import all three CSS files in `src/main.tsx`
  - _Requirements: 10.4, 19.1_

---

### Phase 2: Pure logic and data model

- [x] 4. Define Task types, MonsterKind, and DecayStage
  - Create `src/features/tasks/taskTypes.ts` exporting `DecayStage`, `MonsterKind` (`'pumpkin' | 'mummy' | 'skeleton' | 'spider' | 'frankenstein' | 'vampire' | 'bat' | 'gravestone'`), and the `Task` interface exactly as specified in the design (including `monster: MonsterKind`, `isSample: boolean`, `createdAt`, `completedAt`, `dueDate`; there are no `shape` or `flavorColor` fields)
  - Export `CreateTaskInput` (with `monster: MonsterKind | null`), `EditTaskInput` (with `monster: MonsterKind`), and `FocusSession` interfaces
  - Export `DECAY_STAGE_ORDER: DecayStage[]` array in ascending severity order for ordinal comparisons
  - _Requirements: 1.1, 7.1, 19.1_

- [x] 5. Implement Zod schema for Task validation
  - Create `src/utils/taskSchema.ts` with `MonsterKindSchema` (enum of the eight kinds), `TaskSchema`, and `PersistedTaskListSchema` (array of `TaskSchema`)
  - `TaskSchema` must match the exact fields in the `Task` interface including `monster: MonsterKindSchema`
  - Export a `validateTaskList(unknown): Task[]` helper that runs the array schema and throws a descriptive error on mismatch
  - _Requirements: 2.4, 2.5, 16.3_

- [x] 6. Implement `decayFunction` pure function
  - Create `src/features/tasks/decayFunction.ts` exporting `decayFunction(task: Task, logicalNow: number): DecayStage`
  - Implement the due-date path thresholds from Requirement 7.2 (Fresh > 48 h, Dull ≤ 48 h, Spooky ≤ 24 h, Haunted ≤ 2 h or ≤ 24 h past due, Cursed > 24 h past due)
  - Implement the age-based path thresholds from Requirement 7.3 (Fresh < 3 d, Dull 3–7 d, Spooky 7–14 d, Haunted 14–21 d, Cursed ≥ 21 d)
  - Function must have no side effects and no imported external state
  - _Requirements: 7.2, 7.3, 8.1_

  - [x]* 6.1 Write property tests for `decayFunction`, due-date path correctness (Property 4)
    - **Property 4: Decay function, due-date path correctness**
    - **Validates: Requirements 7.2**

  - [x]* 6.2 Write property tests for `decayFunction`, age-based path correctness (Property 5)
    - **Property 5: Decay function, age-based path correctness**
    - **Validates: Requirements 7.3**

  - [x]* 6.3 Write property tests for `decayFunction`, monotonic non-decrease (Property 6)
    - **Property 6: Decay function monotonicity**
    - Use `fc.integer()` pairs sorted as `[min, max]` to form T1 ≤ T2; assert `stageOrdinal(decayFunction(task, T2)) >= stageOrdinal(decayFunction(task, T1))`
    - **Validates: Requirements 8.2, 8.3**

- [x] 7. Implement `idGen`, `taskIdToMonster`, and `createTask` helper
  - Create `src/utils/idGen.ts` exporting `generateId()`: use `crypto.randomUUID()` with a `Math.random()`-based UUID v4 fallback for old Safari
  - Create `src/utils/monsterKind.ts` (pure) exporting `MONSTER_KINDS` (the eight kinds in a fixed order) and `taskIdToMonster(id: string): MonsterKind` (deterministic hash of `id` modulo 8)
  - Create `src/features/tasks/createTask.ts` exporting `createTask(input: CreateTaskInput, now: number): Task` (pure function, sets `id` via `generateId()`, `createdAt = now`, `completedAt = null`, `isSample = false`, and uses `taskIdToMonster(id)` for `monster` if `input.monster` is null)
  - _Requirements: 1.1, 1.5_

  - [x]* 7.1 Write property tests for `createTask`, required field population (Property 1)
    - **Property 1: Task creation populates all required fields**
    - **Validates: Requirements 1.1**

  - [x]* 7.2 Write property tests for `createTask`, empty-title rejection (Property 2)
    - **Property 2: Empty-title rejection**
    - Generate strings where `s.trim().length === 0`; assert `createTask` throws or returns null
    - **Validates: Requirements 1.4**

- [x] 8. Implement `persistence.ts` localStorage layer
  - Create `src/utils/persistence.ts` with `loadTasks(): Task[]` and `saveTasks(tasks: Task[]): void`
  - `loadTasks` reads key `hcj_tasks` from localStorage, parses JSON, validates with `validateTaskList`; on any error (missing key, parse failure, schema mismatch) logs a warning and returns `[]`
  - `saveTasks` serialises to JSON and writes within a try/catch; on failure logs to console (never throws)
  - `loadTasks` must also read and persist `hcj_sound` boolean key for sound toggle state
  - Export `loadSoundEnabled(): boolean` and `saveSoundEnabled(enabled: boolean): void`
  - _Requirements: 2.1, 2.2, 2.3, 17.5_

- [x] 9. Implement `hauntClock.ts` logical time utility
  - Create `src/features/settings/hauntClock.ts` exporting `computeLogicalNow(wallNow: number, speed: 1 | 60 | 3600, sessionStartWall: number, sessionStartLogical: number): number`
  - When speed is 1×, logical time equals wall time
  - When speed > 1×, advance logical time proportionally from the session's start anchor
  - Export `HauntSpeed` type alias `= 1 | 60 | 3600`
  - _Requirements: 15.5, 15.6, 15.7_

- [x] 10. Implement `exportImport.ts` serialisation helpers
  - Create `src/utils/exportImport.ts` exporting `serializeTaskList(tasks: Task[]): string` (JSON stringify) and `deserializeTaskList(raw: string): Task[]` (parse + Zod validate, throws descriptive error on failure)
  - Export `downloadJson(filename: string, data: string): void`, creates a Blob URL, clicks it, revokes it
  - _Requirements: 2.4, 2.5, 16.1, 16.2, 16.3, 16.4_

  - [ ]* 10.1 Write property tests for `serializeTaskList` / `deserializeTaskList` round-trip (Property 3)
    - **Property 3: Task serialisation round-trip**
    - **Validates: Requirements 2.5, 16.4**

- [-] 11. Implement `packingLayout.ts` stable candy positions
  - Create `src/utils/packingLayout.ts` exporting `computePacking(taskIds: string[], jarWidth: number, jarHeight: number): Array<{x: number, y: number, rotation: number}>`
  - Use a seeded LCG random number generator initialised from a numeric hash of the sorted `taskIds` joined string; positions settle toward the bottom of the jar
  - Rotation per candy is ±15° derived from the individual task `id`
  - Maximum 10% overlap between adjacent candy radii is acceptable
  - _Requirements: 13.1_

- [ ] 12. Implement `whisperGain.ts` gain budget manager
  - Create `src/features/audio/whisperGain.ts` exporting `DEFAULT_WHISPER_GAIN` constant and `allocateWhisperGain(n: number, budget: number): number[]` pure function
  - Returns an array of length `n` where every element equals `budget / n` and sum ≤ `budget + Number.EPSILON`
  - _Requirements: 11.1, 11.2_

  - [ ]* 12.1 Write property tests for whisper gain budget (Property 8)
    - **Property 8: Whisper gain budget is bounded**
    - **Validates: Requirements 11.1, 11.2**

- [ ] 13. Checkpoint, run all property-based tests, fix any failures
  - Execute `npx vitest --run` and confirm all property-based tests pass
  - Ensure all pure modules have no TypeScript errors (`tsc --noEmit`)
  - _Requirements: 8.3_

---

### Phase 3: Core UI shell

- [ ] 14. Implement `AppReducer` and `TaskStoreContext`
  - Create `src/features/tasks/taskReducer.ts` with `appReducer(state: AppState, action: AppAction): AppState`, pure function implementing all 13 action types from the design
  - `CREATE_TASK`: validates non-empty trimmed title (no-op if empty), calls `createTask`, appends to `tasks`
  - `COMPLETE_TASK`: sets `completedAt`, sets `pendingUndo`
  - `DELETE_TASK`: removes from `tasks`, sets `pendingUndo`; if the deleted task is the active focus session task, also clears `focusSession`
  - `EDIT_TASK`: updates title/dueDate/monster on the matching task, validates non-empty title
  - `UNDO`: if `pendingUndo` is non-null, restores the task; clears `pendingUndo`; guard: if null, no-op
  - `UNDO_EXPIRED`: commits the pending action (remove completed/deleted task from list); clears `pendingUndo`
  - `START_FOCUS` / `END_FOCUS` / `SELECT_TASK` / `SET_SOUND` / `SET_HAUNT_SPEED` / `IMPORT_TASKS` / `CLEAR_SAMPLES`: implement per design
  - Create `src/features/tasks/taskStore.tsx` with `TaskStoreProvider` and `useTaskStore()` hook; wire `useReducer` with `appReducer`; on mount load from persistence; write to persistence (via `saveTasks`) in a `useEffect` after every state change
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 5.1, 5.2, 5.3, 5.5, 6.2, 6.4_

  - [ ]* 14.1 Write property tests for undo restoring prior task state (Property 7)
    - **Property 7: Undo restores prior task state**
    - Dispatch `COMPLETE_TASK` or `DELETE_TASK` on a randomly generated task list, then `UNDO`; assert resulting tasks deep-equal the original list
    - **Validates: Requirements 5.2**

- [ ] 15. Implement `useReducedMotion` and `useHauntClock` hooks
  - Create `src/hooks/useReducedMotion.ts` returning `boolean` via `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, with a listener for changes
  - Create `src/hooks/useHauntClock.ts` returning the current logical timestamp; uses `setInterval` at 1 s when `hauntSpeed > 1`, or 60 s when `hauntSpeed === 1`; computes value via `computeLogicalNow` from `hauntClock.ts`
  - _Requirements: 4.7, 7.4, 7.11, 9.7, 10.3, 12.5, 15.6_

- [ ] 16. Wire the desk-scene background (`DeskBackground`)
  - Create `src/features/scene/DeskBackground.tsx` rendering `public/images/desk-scene.png` (1672x941, already in the repo) full-bleed with `object-fit: cover`; this is the single allowed bitmap asset
  - On viewports under 768 px wide use `object-position: 82% center` so the moonlit window shows behind the jar
  - Add a soft dark gradient at the top (CSS `linear-gradient`) so the title stays readable
  - Position the jar slot in the empty middle of the desk (jar stands on the desk)
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]* 16a. Optional code-drawn fog and ghost overlays (`AmbientScene`)
  - Create `src/features/scene/AmbientScene.tsx` as an optional SVG overlay on top of the background with a candlelight glow over the left candles, fog ribbon paths, and ghost figure `<g>` elements
  - Fog ribbons and ghost figures animate with slow CSS `@keyframes` translate/float; under `prefers-reduced-motion` both are static (animation `none`)
  - Maintain 60 fps by using only CSS `transform` and `opacity` for animations (GPU composited)
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 17. Implement `JarScene` composition and back glass layer
  - Create `src/features/jar/JarScene.tsx` composing three layers back to front: back glass, candies (children, rendered inside an SVG `clipPath` matching the jar's inside shape so no candy pokes through the glass), then front glass; add slots for the lid and desk glow
  - Create `src/features/jar/JarBackGlass.tsx`: inner back wall, faint glass tint (`--color-glass`), darker inner edges
  - Jar is sized to `~480 px` on desktop and `~90vw` on mobile via CSS
  - _Requirements: 10.1, 10.6, 13.1_

- [ ] 17a. Implement `JarFrontGlass` layer
  - Create `src/features/jar/JarFrontGlass.tsx`: brighter rim on the sides (`--color-glass-rim`), slightly darker edges, vertical light streaks, a faint window reflection on the right, a thick glass base, and a warm candle glow on the left side
  - _Requirements: 10.6_

- [ ] 17b. Implement `JarLid` with round knob
  - Create `src/features/jar/JarLid.tsx`: SVG lid with a round knob and glass-rim highlight; accepts a `transform` prop (translate and rotate) so `LidAnimation` can lift and tilt it
  - _Requirements: 10.6, 1.7_

- [ ] 17c. Implement `DeskGlow` shadow and warm glow
  - Create `src/features/jar/DeskGlow.tsx`: a soft shadow ellipse plus a warm glow on the desk under the jar (radial gradients, drawn behind the jar)
  - _Requirements: 10.6_

- [ ] 18. Implement `EmptyState` component
  - Create `src/features/jar/EmptyState.tsx` showing a text prompt inside the empty jar inviting the user to add the first candy
  - Prompt must be real accessible text (not an image), announced by screen readers
  - Display only when `tasks.filter(t => !t.completedAt && !t.isSample).length === 0`
  - _Requirements: 14.1, 14.2_

- [ ] 19. Wire `App.tsx` root with providers and scene
  - Create `src/App.tsx` wrapping `<TaskStoreProvider>` around `<DeskBackground>`, `<JarScene>` (with `<EmptyState>` inside), and a placeholder `<UndoToast>` stub
  - Mount `<App>` from `src/main.tsx`
  - Verify the app builds (`npm run build`) and loads in the browser with the desk scene and jar visible
  - _Requirements: 10.1, 19.1_

---

### Phase 4: Candy rendering

- [ ] 20. Implement `MonsterShape` dispatcher and four candy monsters (pumpkin, mummy, skeleton, spider)
  - Create `src/features/candy/MonsterShape.tsx` (props `kind: MonsterKind`, `decayStage`, `size`) that renders the matching monster component and a contact shadow ellipse below
  - Create `src/features/candy/monsters/PumpkinMonster.tsx`, `MummyMonster.tsx`, `SkeletonMonster.tsx`, `SpiderMonster.tsx` as original SVG designs (see the design table for silhouettes and faces)
  - Each monster has the glossy hard-candy look: radial gradient body from its `monster-*` token (lighter center, darker edge), a bright top-left highlight (white, 85% opacity), a small four-point sparkle, and a soft bottom-right inner shadow
  - Highlight and sparkle opacity are exposed as props so `DecayOverlay` can reduce them for the Dull stage
  - Default size: 72 px desktop / 60 px mobile via CSS custom property
  - _Requirements: 7.5, 7.6, 10.7_

- [ ] 21. Implement four more candy monsters (frankenstein, vampire, bat, gravestone)
  - Create `src/features/candy/monsters/FrankensteinMonster.tsx`, `VampireMonster.tsx`, `BatMonster.tsx`, `GravestoneMonster.tsx` as original SVG designs following the same hard-candy look and props as task 20
  - Register all four in `MonsterShape.tsx` so every `MonsterKind` renders (exhaustive `switch` with a `never` check)
  - _Requirements: 10.7_

  - [ ]* 21.1 Refine monster gloss and sparkle
    - Fine-tune gradient stops, highlight shape and sparkle placement across all eight monsters for a more polished glossy hard-candy finish (no raster images)
    - _Requirements: 10.7_

- [ ] 22. Implement `BandageNote` mummy-bandage note component
  - Create `src/features/candy/BandageNote.tsx`: off-white linen strip (`--color-bandage`) with a faint woven texture (SVG `<pattern>`), torn frayed edges (jagged path ends), a slight tilt (2 to 4 degrees, stable per task ID), and a short bandage tail hanging toward its candy
  - Task title truncated to about 18 chars with ellipsis, Inter at minimum 12 px, dark ink color (`--color-bandage-ink`)
  - When `selected` is true, do not expand the note; the full title is shown in the Context_Menu
  - Export a shared bandage style class (linen background, frayed ends, dark ink) that `ListView` rows reuse
  - _Requirements: 3.8, 10.1_

- [ ] 23. Implement `DecayOverlay` for the five stage looks
  - Create `src/features/candy/DecayOverlay.tsx` for the stages Fresh, Dull, Spooky, Haunted, Cursed
  - Stage 1 Fresh: glossy, full highlight, no overlay
  - Stage 2 Dull: duller body and reduced highlight and sparkle opacity, no overlay
  - Stage 3 Spooky: faint purple glow halo behind and around the candy
  - Stage 4 Haunted: strong purple glow plus two or three ghostly wisp paths rising from the candy (slow CSS drift); under `prefers-reduced-motion`, render static wisp shapes
  - Stage 5 Cursed: mostly grey and darker body (low saturation, lower brightness), dark crack lines across the body, and a purple glow; the cracks are a warning only (the task is still finished by press and hold)
  - Glow halo, wisp shapes and crack lines are the non-color distinguishing attributes per Requirements 7.12 and 12.6
  - _Requirements: 7.5, 7.6, 7.7, 7.8, 7.9, 7.11, 7.12, 12.6_

- [ ] 24. Implement `CandyCrack` press-and-hold crack overlay
  - Create `src/features/candy/CandyCrack.tsx` accepting `progress: number` (0–1)
  - Render hairline SVG crack paths over the candy; map `progress` to path stroke-width and opacity
  - On early release (`progress` decreasing to 0), apply a CSS transition to smoothly heal (reverse) the cracks
  - Keep hold cracks visually distinct from the fixed dark Cursed warning cracks drawn by `DecayOverlay`
  - Under `prefers-reduced-motion`, skip progressive crack frames, jump directly to full cracks at threshold, then fade-out in 150 ms on release
  - _Requirements: 4.2, 4.3, 4.7, 4.10_

- [ ] 25. Implement `GhostCheer` post-completion sprite
  - Create `src/features/candy/GhostCheer.tsx`: friendly ghost SVG sprite that appears briefly after completion
  - Animate a gentle float-up and fade-out; under `prefers-reduced-motion`, render as a static image that fades in 150 ms and disappears after 1 s
  - _Requirements: 4.5, 4.7_

- [ ] 26. Implement `usePressAndHold` gesture hook
  - Create `src/hooks/usePressAndHold.ts` returning `{ handlers, crackProgress }` where `crackProgress` is 0–1
  - Support both pointer events (`pointerdown` / `pointermove` cancel / `pointerup`) and keyboard Space key (`keydown` / `keyup`) with the same 0.8 s threshold
  - Use `requestAnimationFrame` to update `crackProgress` smoothly while held
  - On release before threshold: animate `crackProgress` back to 0
  - On threshold reached: call `onComplete()` callback once
  - _Requirements: 4.1, 4.2, 4.3, 4.9_

- [ ] 27. Implement `CandyItem` composed candy component
  - [ ] 27.1 Build `CandyItem` core: compose `MonsterShape` → `DecayOverlay` → `CandyCrack` → `BandageNote`
    - Render `MonsterShape` with `kind = task.monster`
    - Compute `decayStage` by calling `decayFunction(task, logicalNow)` where `logicalNow` comes from `useHauntClock()`
    - Apply stable rotation from `packingLayout` via the `rotation` prop
    - Transparent hit-area `<rect>` enforces minimum 44×44 px tappable target regardless of candy visual size or rotation
    - Wire `usePressAndHold` with `onComplete` dispatching `COMPLETE_TASK`; on `crackProgress` reaching 1, fade the candy out in 150 ms and show `GhostCheer`
    - On tap/click without hold: dispatch `SELECT_TASK`; the selected candy lifts out of the jar (instant state change under reduced motion) and shows its `BandageNote`; deselecting returns it to its slot
    - Early release before 0.8 s heals the cracks; the candy is not completed
    - _Requirements: 3.1, 3.6, 3.7, 4.1, 4.2, 4.3, 4.5, 4.6, 4.10, 12.3_

  - [ ]* 27.2 Implement Canvas 2D shatter particle burst for completion
    - Replace the CSS fade-out shatter placeholder with a full Canvas 2D particle simulation: 12–20 fragment shards fly outward from candy center with easing, fade out over ~600 ms
    - Under `prefers-reduced-motion`, keep the 150 ms fade-out only
    - _Requirements: 4.4, 4.7_

- [ ] 28. Implement `JarPile` packing layout and drop-in animation
  - [ ] 28.1 Build `JarPile` core: packing layout, candy rendering, drop-in animation
    - Create `src/features/jar/JarPile.tsx` calling `computePacking()` to place `CandyItem` components
    - New candies drop from the jar lid to their computed position using a CSS spring transition (`cubic-bezier` bounce); under `prefers-reduced-motion`, fade in (150 ms max)
    - Render the first 24 candies inside the jar's `clipPath`; when task count exceeds 24, spill the extra candies onto the desk next to the jar (no scrolling, no "+N more" badge); all candies remain individually selectable
    - Apply a subtle 5% desaturation + cool tint CSS filter to candies whose position is within ~12 px of a jar wall
    - _Requirements: 1.2, 13.1, 13.2, 13.3_

  - [ ]* 28.2 Add glass-refraction tint to jar-edge candies
    - Refine the edge-candy CSS filter to use a layered `drop-shadow` + `hue-rotate` combination matching the dual candlelight / moonlight sources
    - _Requirements: 10.1_

- [ ] 28a. Implement `LidAnimation` for add and remove
  - Create `src/features/jar/LidAnimation.tsx` that drives `JarLid`: on candy add or remove the lid lifts and tilts (about 350 ms), the candy drops in (existing spring bounce) or floats out, then the lid settles back
  - Queue overlapping add and remove events so the lid opens once per candy, one by one
  - Expose `onLidOpen` and `onLidClose` callbacks (used by the lid sounds task 37a)
  - Under `prefers-reduced-motion` the lid does not move and candies fade in or out (150 ms max), using `useReducedMotion`
  - Hook completion and delete flows to the removal sequence
  - _Requirements: 1.2, 1.7, 1.9, 4.11, 6.4_

---

### Phase 5: Task interactions

- [ ] 29. Implement `ContextMenu` with keyboard support
  - Create `src/features/contextMenu/ContextMenu.tsx` with four buttons: Complete, Focus, Edit, Delete
  - Menu opens beside the lifted candy and its `BandageNote` (the candy lifts out of the jar on selection); dismissing returns the candy to the jar
  - On desktop: positioned adjacent to the lifted candy via CSS absolute positioning; on mobile: `BottomSheet` variant (see task 43)
  - Close on Escape or outside click via a `useClickOutside` hook; dispatch `SELECT_TASK(null)` on close
  - Buttons are keyboard reachable; focus is trapped inside while open
  - Does not obscure other candies in a way that makes them untappable (use `z-index` with pointer-events management)
  - `Complete` button in the Context_Menu dispatches `COMPLETE_TASK` as an alternative to press-and-hold
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 30a. Implement `MonsterPicker` component
  - Create `src/features/forms/MonsterPicker.tsx`: a grid of 8 small monster buttons (one per `MonsterKind`), each showing a small `MonsterShape` thumbnail
  - Each button has an accessible name equal to the monster name (`aria-label`, for example "Pumpkin"), `aria-pressed`, a minimum 44x44 px hit area, arrow-key navigation, and a ring outline plus check mark for the selected one (not color alone)
  - Props: `value: MonsterKind | null`, `onChange(kind)`; `null` means the monster is auto-assigned
  - _Requirements: 1.5, 12.1, 12.3_

- [ ] 30. Implement `AddTaskForm` modal
  - Create `src/features/forms/AddTaskForm.tsx`: title `<input>` (required), due date `<input type="date">` (optional), and the `MonsterPicker` (task 30a) in place of the old flavor and shape pickers
  - Inline validation message on empty-title submit; no task created
  - On valid submit: dispatch `CREATE_TASK`, close form
  - Opens in a modal on desktop; on mobile uses a bottom sheet (task 38 handles the shell)
  - Fully keyboard navigable; closes on Escape or Cancel without creating a task
  - _Requirements: 1.1, 1.4, 1.5, 3.3_

- [ ] 31. Implement `EditTaskForm` modal
  - Create `src/features/forms/EditTaskForm.tsx`: same fields as `AddTaskForm` but pre-populated from the selected task's current title, due date, and `monster` (the `MonsterPicker` shows the task's current monster selected)
  - On valid submit: dispatch `EDIT_TASK`, close form
  - Inline validation on empty-title submit; no update applied
  - On Cancel: discard changes, close form; task record unchanged
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 32. Implement `UndoToast` component
  - Create `src/features/undo/UndoToast.tsx` reading `pendingUndo` from store
  - Show at bottom of screen for 6 s; `setTimeout` dispatches `UNDO_EXPIRED` on natural expiry
  - "Undo" button dispatches `UNDO` and immediately saves restored task to persistence
  - If a second action arrives while toast is active: first `UNDO_EXPIRED` fires immediately, new toast mounts
  - Only one toast visible at a time (enforced by `pendingUndo` being a single slot in `AppState`)
  - Accessible: `role="status"` or `aria-live="polite"`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 33. Checkpoint, verify core task interactions end-to-end
  - Write RTL integration tests for: tap candy → context menu appears; press-and-hold simulation (> 800 ms) → `COMPLETE_TASK` dispatched; release before 800 ms → no completion; undo toast appears after delete; undo restores task
  - Run `npx vitest --run` and confirm all tests pass
  - _Requirements: 3.1, 4.1, 4.3, 5.1, 5.2_

---

### Phase 6: Focus mode

- [ ] 34. Implement `DurationPicker` component
  - Create `src/features/focus/DurationPicker.tsx`: numeric input for 1–90 minutes, pre-populated with 25; three quick-select buttons (15, 25, 50); Confirm and Cancel buttons
  - Confirm: validate 1 ≤ value ≤ 90, dispatch `START_FOCUS`; if invalid, show inline error
  - Cancel: dispatch nothing, close the picker; focus session does not start
  - Fully keyboard navigable
  - _Requirements: 9.2_

- [ ] 35. Implement `CandleTimer` animated burning candle
  - Create `src/features/focus/CandleTimer.tsx`
  - Animated variant: tall thin SVG candle body whose height shrinks from 100% to 0% proportional to remaining time; flame SVG on top with a CSS wobble animation; under `prefers-reduced-motion`, render a `<time>` element with `aria-live="polite"` updating at most once per minute
  - Accepts `totalSeconds` and `remainingSeconds` props
  - _Requirements: 9.3, 9.7, 12.4_

- [ ] 36. Implement `FocusOverlay` full-screen focus session
  - Create `src/features/focus/FocusOverlay.tsx`
  - Renders when `focusSession` is non-null in app state; dims the room background (dark overlay at ~80% opacity) and reduces ambient animation intensity
  - Shows the focused `CandyItem` prominently (larger size, centered)
  - Mounts `CandleTimer` with computed `remainingSeconds = durationSeconds - Math.floor((wallNow - startedAt) / 1000)`
  - When timer reaches zero: dispatch `END_FOCUS({ markComplete: false })` and restore full jar view
  - "End session" button: dispatch `END_FOCUS({ markComplete: false })`
  - "Complete task" button: dispatch `COMPLETE_TASK` then `END_FOCUS({ markComplete: true })`, triggering the standard `Completion_Animation`
  - Keyboard trap while overlay is active
  - _Requirements: 9.1, 9.2, 9.4, 9.5, 9.6, 9.9_

---

### Phase 7: Sound system

- [ ] 37. Implement Web Audio engine and core sound functions
  - Create `src/features/audio/audioContext.ts` with `getAudioContext(): AudioContext` singleton factory; catch `NotAllowedError` on creation silently, disabling audio until user interaction resumes the context
  - Create `src/features/audio/sounds.ts` exporting: `playCandyDrop()`, `playCrunchShatter()`, `playGhostCheer()`, `playFocusChime()`, `playAmbientLoop(): () => void` (returns stop function), `playWhisper(gainNode: GainNode)`, all synthesised with `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `StereoPannerNode`; no audio file loading
  - Each function checks `soundEnabled` state before playing; returns immediately if disabled
  - _Requirements: 1.6, 4.8, 7.10, 9.8, 10.5, 17.4_

- [ ] 37a. Implement lid creak and glass clink sounds and wire them to `LidAnimation`
  - In `src/features/audio/sounds.ts` add `playLidCreak()`: a short creaky door creak of about 0.5 s (sawtooth `OscillatorNode` through a band-pass `BiquadFilterNode` with a slow pitch wobble and a `GainNode` envelope), with a slightly different base pitch each call (small random detune)
  - Add `playGlassClink()`: a soft, short, high sine pair with a fast decay
  - Both check `soundEnabled` and return immediately when disabled; Web Audio only, no audio files
  - Call `playLidCreak()` from `LidAnimation.onLidOpen` and `playGlassClink()` from `onLidClose`; under reduced motion the sounds still follow the Sound_Toggle
  - _Requirements: 1.8, 17.2, 17.4_

- [ ] 38. Wire sounds into app events and implement Sound_Toggle
  - In `TaskStoreProvider`'s effect layer, call sound functions in response to actions: `CREATE_TASK` → `playCandyDrop`, `COMPLETE_TASK` → `playCrunchShatter`, `END_FOCUS` → `playFocusChime`, `START_FOCUS` → start ambient loop
  - In `CandleGlow.tsx` / ambient scene: start `playAmbientLoop` when sound is enabled, stop when disabled or component unmounts
  - Create `src/features/scene/CandleGlow.tsx` pulsing radial gradient overlay around the candle
  - Add `Sound_Toggle` button in `SettingsPanel` (task 42); dispatch `SET_SOUND`; `deactivation must immediately stop all audio`
  - Wire `whisperGain.ts` gain budget to Haunted/Cursed candy whisper nodes: watch count of visible Cursed candies, re-allocate gain via `allocateWhisperGain` on change
  - _Requirements: 1.6, 4.8, 7.10, 9.8, 10.5, 11.1, 11.2, 17.1, 17.2, 17.3, 17.5_

---

### Phase 8: Demo mode

- [ ] 39. Implement `sampleData.ts` and first-run seeding
  - Create `src/features/tasks/sampleData.ts` exporting `SAMPLE_TASKS: Task[]`, six tasks with `isSample: true`, one per each of the five `DecayStage` values (Fresh, Dull, Spooky, Haunted, Cursed) plus one additional, covering all stages; each sample gets an explicit `monster` (use all eight kinds across the samples where possible, for example the two extra samples use `bat` and `gravestone`); `createdAt` and `dueDate` values chosen so each lands in the correct stage at real-time load
  - In `TaskStoreProvider` on mount: if `loadTasks()` returns an empty array, dispatch `IMPORT_TASKS` with `SAMPLE_TASKS`
  - _Requirements: 15.1, 15.2_

- [ ] 40. Implement "Clear samples" action and transition to empty state
  - Add a "Clear samples" button in `SettingsPanel` (task 42) that dispatches `CLEAR_SAMPLES`
  - `CLEAR_SAMPLES` reducer case: remove all tasks where `isSample === true`
  - After clearing, if no non-sample tasks remain, `EmptyState` renders automatically (no extra logic needed)
  - _Requirements: 15.3, 15.4_

- [ ] 41. Implement `Haunt_Speed` control and logical clock wiring
  - Add three-option radio/button group in `SettingsPanel` (task 42): 1×, 60×, 3600×; dispatches `SET_HAUNT_SPEED`
  - `useHauntClock` reads `hauntSpeed` from store and ticks at 1 s intervals when speed > 1×, or 60 s when 1×
  - When `hauntSpeed` returns to 1×: reset logical anchor so `logicalNow === Date.now()`
  - Haunt_Speed is NOT persisted (every load starts at 1×); do not write it to localStorage
  - Decay polling interval in `TaskStoreProvider` or `JarPile`: once per second when `hauntSpeed > 1`, once per minute when 1×
  - _Requirements: 7.4, 15.5, 15.6, 15.7, 15.8_

---

### Phase 9: Accessibility and polish

- [ ] 42. Implement `SettingsPanel` with all controls
  - Create `src/features/settings/SettingsPanel.tsx` with: Sound_Toggle, Haunt_Speed control (1×/60×/3600×), Export button, Import button, "Clear samples" button
  - On desktop: modal or sidebar; on mobile: bottom sheet (uses `BottomSheet` from task 43)
  - All controls keyboard reachable; `aria-label` or `aria-describedby` on every control
  - _Requirements: 15.5, 17.1, 16.1, 16.2_

- [ ] 43. Implement `BottomSheet` reusable component
  - Create `src/features/contextMenu/BottomSheet.tsx`: fixed panel covering the bottom portion of the viewport, drag handle at top, traps keyboard focus while open, dismisses on Escape or scrim tap
  - Under `prefers-reduced-motion`: instant appear/dismiss (no slide animation)
  - Use this component in: `ContextMenu` (mobile), `SettingsPanel` (mobile), `AddTaskForm` (mobile), `EditTaskForm` (mobile)
  - _Requirements: 12.3, 12.5_

- [ ] 44. Add ARIA labels, roles, and live regions throughout
  - Audit every interactive element: candy `<button>` / `<rect>`, context menu buttons, form fields, monster picker buttons (each named by its monster), haunt speed buttons, sound toggle, list view toggle
  - Each candy button's `aria-label` includes task title and current decay stage name; update when decay stage changes (Requirement 12.2)
  - Focus session candle timer: wrap remaining time in `<span aria-live="polite">` updating at most once per minute
  - Empty state prompt: `role="status"` or plain accessible paragraph
  - `ContextMenu` buttons: descriptive `aria-label` values
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 45. Implement `ListView` accessible list view
  - Create `src/features/jar/ListView.tsx`: `<ul>` listing all tasks sorted by decay stage (Cursed first), each `<li>` showing title (Inter ≥ 12 px), due date if set, decay stage `<span>` with ARIA label, and row action buttons (Complete, Focus, Edit, Delete)
  - Add a "List View" toggle button in the top bar with `aria-pressed` state; switches main content between `JarScene` and `ListView`
  - _Requirements: 12.3_

- [ ] 46. Keyboard navigation, Enter to open menu, Space to crack
  - In `CandyItem`: handle `onKeyDown` for Enter → dispatch `SELECT_TASK` (opens context menu); handle Space key via `usePressAndHold` with the same 0.8 s threshold and progressive crack behaviour
  - Ensure candy `<button>` is Tab-reachable (tabIndex managed by `JarPile` or `ListView`)
  - Verify Tab order in the jar visits every candy before reaching the top-bar controls
  - _Requirements: 3.3, 4.9, 12.3_

- [ ] 47. Apply reduced-motion fallbacks globally
  - Audit all animations: optional fog ribbons and ghost floats, candle glow pulse, decay glow pulse and wisp drift, lid lift and tilt, candy lift on select, shatter particles, bottom sheet slide, candy drop bounce
  - Lid: no movement under reduced motion; candies fade in or out (150 ms max)
  - Each animation is guarded by the `useReducedMotion` hook or a CSS `@media (prefers-reduced-motion: reduce)` rule suppressing the animation
  - Candle timer: switches to numerical countdown under reduced motion
  - _Requirements: 1.9, 4.7, 7.11, 9.7, 10.3, 12.5_

- [ ] 48. Run accessibility test suite and fix violations
  - Write `vitest-axe` tests for: initial render, context menu open, focus mode active, settings panel open
  - Fix any reported axe violations before continuing
  - Verify WCAG 2.1 AA 4.5:1 contrast ratio for all interactive text labels
  - _Requirements: 10.4, 12.1_

---

### Phase 10: Export / Import

- [ ] 49. Implement Export action in settings panel
  - In `SettingsPanel`, wire the Export button to call `serializeTaskList(tasks)` then `downloadJson('haunted-candy-jar-tasks.json', data)`
  - _Requirements: 16.1, 16.4_

- [ ] 50. Implement Import action in settings panel
  - In `SettingsPanel`, wire the Import button to open a hidden `<input type="file" accept=".json">` and read the selected file via `FileReader`
  - Pass raw string to `deserializeTaskList`; on success dispatch `IMPORT_TASKS` and persist; on failure display an inline error message; current task list is not modified on failure
  - _Requirements: 16.2, 16.3, 16.4, 16.5_

---

### Phase 11: Mobile layout

- [ ] 51. Responsive layout, jar at ~90vw, FAB add button
  - Add CSS media query for `max-width: 767px`: set jar width to `90vw`, replace any top-bar "Add candy" button with a FAB fixed at bottom-right (minimum 56×56 px)
  - Ensure undo toast renders above the FAB
  - _Requirements: 18.3_

- [ ] 52. Mobile context menu and settings as bottom sheets
  - On mobile viewports, replace the floating `ContextMenu` popover and `SettingsPanel` modal with the `BottomSheet` component (task 43)
  - `AddTaskForm` and `EditTaskForm` also use `BottomSheet` on mobile
  - Verify all touch targets are ≥ 44×44 CSS pixels on mobile viewports
  - _Requirements: 3.5, 18.3_

- [ ] 53. Cross-browser and performance verification
  - Test the built app in Chrome, Firefox, Safari, and Edge; fix any browser-specific rendering or API issues
  - Verify 60 fps during animations using browser DevTools; resolve any frame drops
  - Verify initial page load ≤ 3 s on a simulated 4G throttled connection in Chrome DevTools
  - _Requirements: 18.1, 18.2, 18.4, 19.4_

- [ ] 53a. Add Credits section to the README
  - Add a "Credits" section to `README.md` stating that the desk background art was made by Milena Webb with ChatGPT, that an early visual mockup was sketched with Claude as a reference only, and that all app code was built in Kiro
  - No em dashes
  - _Requirements: 22.1, 22.2_

- [ ] 54. Final checkpoint, full test suite green, no TypeScript errors
  - Run `npx vitest --run`; all tests must pass including property-based, RTL integration, and axe accessibility tests
  - Run `tsc --noEmit`; zero errors
  - Run `npm run build`; production bundle builds without errors
  - Confirm the app is deployable: `dist/` output is a valid static bundle ready for Cloudflare Pages
  - _Requirements: 8.3, 19.2, 19.3_

---

### Phase 12: Optional extras

- [ ]* 55. Wallpaper mode (`?view=wallpaper`)
  - In `App.tsx`, read `new URLSearchParams(location.search).get('view')`; when it equals `wallpaper`, render only `DeskBackground`, `JarScene` and the candies full screen
  - Hide all controls (add button, settings, list toggle, toasts, context menu); candies ignore pointer and keyboard input (read only); decay stages keep updating live through the haunt clock
  - Intended for free live-wallpaper apps such as Plash (Mac) or Lively Wallpaper (Windows); add a short usage note to the README
  - _Requirements: 20.1, 20.2_

- [ ]* 56. Calendar file import (`.ics`)
  - Create a pure `src/utils/icsParser.ts` that parses `.ics` text into `{ title, start }` events (`SUMMARY`, `DTSTART` date and date-time forms, line unfolding, UTC `Z` suffix)
  - In `SettingsPanel`, add an "Import calendar" button using a hidden `<input type="file" accept=".ics">` and `FileReader` (no network, no sign-in)
  - Each upcoming event becomes a candy with `dueDate` set to the event start; candies drop in one by one through the `LidAnimation` queue; parse failure shows an inline error and leaves the task list unchanged
  - Add a small unit test for the parser
  - _Requirements: 21.1, 21.2, 21.3_

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster hackathon MVP; they add visual and audio polish beyond core functionality
- Each task references specific requirements for traceability; all requirements from the specification are covered
- Checkpoints (tasks 13, 33, 54) must pass before proceeding to later phases
- Property-based tests (Properties 1–8) all use `fast-check` + `@fast-check/vitest`; each test file should include a comment identifying the property number and feature name
- `DecayStage` is never stored on the Task record, always derive it at render time via `decayFunction(task, logicalNow)`
- Haunt_Speed is never persisted; every page load initialises to 1×
- All audio is Web Audio API synthesis only, no audio files, no CDN, no third-party audio libraries
- `public/images/desk-scene.png` is the single allowed bitmap asset; every other visual is code-generated
- Decay stages are Fresh, Dull, Spooky, Haunted, Cursed, with the thresholds unchanged (stage 3 faint purple glow, stage 4 strong glow plus wisps, stage 5 grey with cracks and glow)
- New tasks added by the visual direction update use letter suffixes (16a, 17a to 17c, 28a, 30a, 37a, 53a); tasks 55 and 56 are optional extras

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0", "1"] },
    { "id": 1, "tasks": ["2", "3"] },
    { "id": 2, "tasks": ["4"] },
    { "id": 3, "tasks": ["5", "6", "7", "9", "10", "12"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3", "7.1", "7.2", "10.1", "12.1", "8", "11"] },
    { "id": 5, "tasks": ["13"] },
    { "id": 6, "tasks": ["14", "15"] },
    { "id": 7, "tasks": ["14.1", "16", "16a", "17", "18"] },
    { "id": 8, "tasks": ["17a", "17b", "17c", "19"] },
    { "id": 9, "tasks": ["20", "22", "23", "24", "25", "26"] },
    { "id": 10, "tasks": ["21", "27", "27.1"] },
    { "id": 11, "tasks": ["21.1", "27.2", "28", "28.1"] },
    { "id": 12, "tasks": ["28.2", "28a", "29", "30a"] },
    { "id": 13, "tasks": ["30", "31", "32"] },
    { "id": 14, "tasks": ["33"] },
    { "id": 15, "tasks": ["34", "35"] },
    { "id": 16, "tasks": ["36"] },
    { "id": 17, "tasks": ["37"] },
    { "id": 18, "tasks": ["37a", "38", "39"] },
    { "id": 19, "tasks": ["40", "41", "43"] },
    { "id": 20, "tasks": ["42"] },
    { "id": 21, "tasks": ["44", "45", "46", "47", "49", "50"] },
    { "id": 22, "tasks": ["48"] },
    { "id": 23, "tasks": ["51", "52"] },
    { "id": 24, "tasks": ["53", "53a"] },
    { "id": 25, "tasks": ["54"] },
    { "id": 26, "tasks": ["55", "56"] }
  ]
}
```
