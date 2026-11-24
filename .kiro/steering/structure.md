# Project Structure and Naming Conventions

## Folder layout

The app uses a feature-first layout inside `src/`.

Top-level directories:

- `public/fonts/`: Creepster-Regular.woff2 and Inter-VariableFont.woff2 (self-hosted)
- `public/images/desk-scene.png`: the single allowed bitmap (1672x941 desk background)
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

**candy/** contains MonsterShape.tsx, monsters/ (PumpkinMonster, MummyMonster, SkeletonMonster, SpiderMonster, FrankensteinMonster, VampireMonster, BatMonster, GravestoneMonster), BandageNote.tsx, DecayOverlay.tsx, CandyCrack.tsx, GhostCheer.tsx, CandyItem.tsx

**jar/** contains JarScene.tsx, JarBackGlass.tsx, JarFrontGlass.tsx, JarLid.tsx, DeskGlow.tsx, LidAnimation.tsx, JarPile.tsx, ListView.tsx, EmptyState.tsx

**contextMenu/** contains ContextMenu.tsx

**forms/** contains MonsterPicker.tsx, AddTaskForm.tsx, EditTaskForm.tsx

**focus/** contains FocusOverlay.tsx, DurationPicker.tsx, CandleTimer.tsx

**scene/** contains DeskBackground.tsx, AmbientScene.tsx, CandleGlow.tsx

**settings/** contains SettingsPanel.tsx, hauntClock.ts

**undo/** contains UndoToast.tsx

**audio/** contains audioContext.ts, sounds.ts, whisperGain.ts

## File responsibilities

- `tasks/taskTypes.ts`: Task, DecayStage, MonsterKind. Pure types, no logic.
- `tasks/taskReducer.ts`: AppReducer. Pure, no side effects.
- `tasks/decayFunction.ts`: Pure function `(Task, logicalNow) => DecayStage`.
- `tasks/taskStore.tsx`: Context and provider, wires reducer to persistence.
- `tasks/sampleData.ts`: Six sample candies for demo mode.
- `candy/MonsterShape.tsx`: Dispatches to one of 8 SVG candy monsters by task.monster.
- `candy/monsters/`: PumpkinMonster, MummyMonster, SkeletonMonster, SpiderMonster, FrankensteinMonster, VampireMonster, BatMonster, GravestoneMonster.
- `candy/BandageNote.tsx`: Mummy-bandage note (linen strip, frayed edges, tilt, tail toward candy), truncated title, Inter min 12px.
- `candy/DecayOverlay.tsx`: Per-stage look: Fresh (glossy), Dull (duller body), Spooky (faint purple glow), Haunted (strong glow and wisps), Cursed (grey, cracks, glow).
- `candy/CandyCrack.tsx`: SVG crack overlay driven by press-and-hold progress (0 to 1).
- `candy/GhostCheer.tsx`: Friendly ghost sprite shown after task completion.
- `candy/CandyItem.tsx`: Composed candy with bandage note, overlays, and gesture handling.
- `jar/JarScene.tsx`: Composes JarBackGlass, candies (clipped), JarFrontGlass, JarLid, and DeskGlow.
- `jar/JarBackGlass.tsx`: Back glass layer.
- `jar/JarFrontGlass.tsx`: Front glass layer (rim, streaks, reflection, thick base).
- `jar/JarLid.tsx`: Lid with round knob.
- `jar/DeskGlow.tsx`: Soft shadow and warm glow on the desk under the jar.
- `jar/LidAnimation.tsx`: Lid lift, tilt, settle; coordinates candy drop in and float out.
- `jar/JarPile.tsx`: Precomputed packing layout, drop-in animation, jar capacity 24, extra candies spill onto the desk.
- `jar/ListView.tsx`: Accessible list view for keyboard and screen reader use.
- `jar/EmptyState.tsx`: Friendly prompt shown when task list is empty.
- `contextMenu/ContextMenu.tsx`: Complete, Focus, Edit, Delete actions.
- `forms/MonsterPicker.tsx`: Grid of 8 small monster buttons, each with an accessible name.
- `forms/AddTaskForm.tsx`: Title, due date, monster picker.
- `forms/EditTaskForm.tsx`: Same fields pre-populated. Monster picker writes to task.monster.
- `focus/FocusOverlay.tsx`: Darkened full-screen focus overlay.
- `focus/DurationPicker.tsx`: 1 to 90 min input with 15, 25, 50 presets. Default 25.
- `focus/CandleTimer.tsx`: Animated burning candle or numeric countdown fallback.
- `scene/DeskBackground.tsx`: Full-bleed desk-scene.png, top gradient, mobile object-position 82%.
- `scene/AmbientScene.tsx`: Optional code-drawn fog and ghost overlays on top of the background.
- `scene/CandleGlow.tsx`: Pulsing radial gradient over the left candles.
- `settings/SettingsPanel.tsx`: Sound toggle, Haunt Speed, export, import.
- `settings/hauntClock.ts`: Logical clock with Haunt_Speed multiplier.
- `undo/UndoToast.tsx`: 6-second dismissible undo notification.
- `audio/audioContext.ts`: Singleton AudioContext factory.
- `audio/sounds.ts`: All synthesised sound functions (includes lid creak and glass clink).
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
- `monsterKind.ts`: MONSTER_KINDS list and `taskIdToMonster(id)`, deterministic default monster.
- `(optional) icsParser.ts`: Pure .ics parser for the calendar import feature.
- `packingLayout.ts`: Seeded packing layout computation (task IDs as seed).

## Naming conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase, .tsx | CandyItem.tsx |
| Custom hooks | camelCase, use prefix, .ts | usePressAndHold.ts |
| Pure utilities | camelCase, .ts | decayFunction.ts |
| CSS design tokens | kebab-case, color- or monster- prefix | color-bg, monster-pumpkin |
| localStorage keys | hcj_ prefix, snake-case | hcj_tasks, hcj_sound |
| Test files | .test.ts(x) suffix | decayFunction.test.ts |

## Feature-first rule

Code belonging to a single feature lives inside `src/features/<feature>/`. Code shared across features goes in `src/hooks/` (custom hooks) or `src/utils/` (pure functions and services). Do not create a flat `src/components/` directory.

## Pure logic boundary

These files must remain pure (no side effects, no DOM access, no module-level mutable state):
`decayFunction.ts`, `taskReducer.ts`, `taskSchema.ts`, `exportImport.ts`, `monsterKind.ts`, `packingLayout.ts`

Keep all side effects (localStorage, AudioContext, timers, DOM events) in service files and hooks.
