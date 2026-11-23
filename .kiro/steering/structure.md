# Project Structure and Naming Conventions

## Folder layout

The app uses a feature-first layout inside `src/`.

Top-level directories:

- `public/fonts/`: Creepster-Regular.woff2 and Inter-VariableFont.woff2 (self-hosted)
- `src/main.tsx`: Vite entry point, mounts App
- `src/App.tsx`: root component, providers, scene, jar
- `src/styles/fonts.css`: @font-face for Creepster and Inter
- `src/features/`: feature modules (see below)
- `src/hooks/`: custom hooks shared across features
- `src/utils/`: pure utilities and services
- `tests/properties/`: property-based tests (fast-check + Vitest)
- LICENSE, README.md, vite.config.ts, tsconfig.json, package.json

## Feature modules (src/features/)

**tasks/** contains taskTypes.ts, taskReducer.ts, decayFunction.ts, taskStore.tsx, sampleData.ts

**candy/** contains CandyShape.tsx, CandyTag.tsx, DecayOverlay.tsx, CandyCrack.tsx, GhostCheer.tsx, CandyItem.tsx

**jar/** contains JarScene.tsx, JarPile.tsx, ListView.tsx, EmptyState.tsx

**contextMenu/** contains ContextMenu.tsx

**forms/** contains AddTaskForm.tsx, EditTaskForm.tsx

**focus/** contains FocusOverlay.tsx, DurationPicker.tsx, CandleTimer.tsx

**scene/** contains AmbientScene.tsx, CandleGlow.tsx

**settings/** contains SettingsPanel.tsx, hauntClock.ts

**undo/** contains UndoToast.tsx

**audio/** contains audioContext.ts, sounds.ts, whisperGain.ts

## File responsibilities

- `tasks/taskTypes.ts`: Task, DecayStage, FlavorColor. Pure types, no logic.
- `tasks/taskReducer.ts`: AppReducer. Pure, no side effects.
- `tasks/decayFunction.ts`: Pure function `(Task, logicalNow) => DecayStage`.
- `tasks/taskStore.tsx`: Context and provider, wires reducer to persistence.
- `tasks/sampleData.ts`: Six sample candies for demo mode.
- `candy/CandyShape.tsx`: SVG candy body in three variants (round, twist, gumdrop).
- `candy/CandyTag.tsx`: Paper tag on string, truncated title, Inter min 12px.
- `candy/DecayOverlay.tsx`: Stage-specific overlay (cobweb, goo, face).
- `candy/CandyCrack.tsx`: SVG crack overlay driven by press-and-hold progress (0 to 1).
- `candy/GhostCheer.tsx`: Friendly ghost sprite shown after task completion.
- `candy/CandyItem.tsx`: Composed candy with tag, overlays, and gesture handling.
- `jar/JarScene.tsx`: Glass jar SVG with rim highlights and glass reflections.
- `jar/JarPile.tsx`: Precomputed packing layout, spring drop-in animation, overflow.
- `jar/ListView.tsx`: Accessible list view for keyboard and screen reader use.
- `jar/EmptyState.tsx`: Friendly prompt shown when task list is empty.
- `contextMenu/ContextMenu.tsx`: Complete, Focus, Edit, Delete actions.
- `forms/AddTaskForm.tsx`: Title, due date, flavor color picker, shape picker.
- `forms/EditTaskForm.tsx`: Same fields pre-populated. Shape picker writes to task.shape.
- `focus/FocusOverlay.tsx`: Darkened full-screen focus overlay.
- `focus/DurationPicker.tsx`: 1 to 90 min input with 15, 25, 50 presets. Default 25.
- `focus/CandleTimer.tsx`: Animated burning candle or numeric countdown fallback.
- `scene/AmbientScene.tsx`: Shelf, candlelight, fog, ghost figures in CSS and SVG.
- `scene/CandleGlow.tsx`: Pulsing radial gradient around candle.
- `settings/SettingsPanel.tsx`: Sound toggle, Haunt Speed, export, import.
- `settings/hauntClock.ts`: Logical clock with Haunt_Speed multiplier.
- `undo/UndoToast.tsx`: 6-second dismissible undo notification.
- `audio/audioContext.ts`: Singleton AudioContext factory.
- `audio/sounds.ts`: All synthesised sound functions.
- `audio/whisperGain.ts`: Gain budget manager for Cursed-candy whispers.

## Shared hooks (src/hooks/)

- `usePressAndHold.ts`: Pointer and keyboard hold gesture with progress callback (0 to 1).
- `useHauntClock.ts`: Returns current logical timestamp, respects Haunt_Speed.
- `useReducedMotion.ts`: Reads prefers-reduced-motion media query.

## Shared utilities (src/utils/)

- `persistence.ts`: localStorage read, write, error handling.
- `exportImport.ts`: serializeTaskList and deserializeTaskList.
- `taskSchema.ts`: Zod schema for Task, used by import validation.
- `idGen.ts`: crypto.randomUUID wrapper.
- `candyShape.ts`: `taskIdToShape(id)`, deterministic stable shape assignment.
- `packingLayout.ts`: Seeded packing layout computation.

## Naming conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase, .tsx | CandyItem.tsx |
| Custom hooks | camelCase, use prefix, .ts | usePressAndHold.ts |
| Pure utilities | camelCase, .ts | decayFunction.ts |
| CSS design tokens | kebab-case, color- or flavor- prefix | color-bg, flavor-pumpkin |
| localStorage keys | hcj_ prefix, snake-case | hcj_tasks, hcj_sound |
| Test files | .test.ts(x) suffix | decayFunction.test.ts |

## Feature-first rule

Code belonging to a single feature lives inside `src/features/<feature>/`. Code shared across features goes in `src/hooks/` (custom hooks) or `src/utils/` (pure functions and services). Do not create a flat `src/components/` directory.

## Pure logic boundary

These files must remain pure (no side effects, no DOM access, no module-level mutable state):
`decayFunction.ts`, `taskReducer.ts`, `taskSchema.ts`, `exportImport.ts`, `candyShape.ts`, `packingLayout.ts`

Keep all side effects (localStorage, AudioContext, timers, DOM events) in service files and hooks.
