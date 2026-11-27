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
- `functions/api/`: Cloudflare Pages Functions (`import.ts`, `draft.ts`, `group-draft.ts`, `[[path]].ts`), thin adapters over `worker/`
- `worker/`: shared AI endpoint logic (`handlers.ts`, `prompts.ts`, `rateLimit.ts`, `schemas.ts`, `models.ts`), pure or with injected bindings
- `tests/properties/`: property-based tests (fast-check + Vitest)
- `tests/worker/`: endpoint tests
- LICENSE, README.md, vite.config.ts, tsconfig.json, package.json, wrangler.toml

## Feature modules (src/features/)

**tasks/** contains taskTypes.ts, taskReducer.ts, decayFunction.ts, taskStore.tsx, sampleData.ts

**candy/** contains candyTypes.ts (Candy = TaskCandy | PersonCandy), stageOf.ts, MonsterShape.tsx, monsters/ (PumpkinMonster, MummyMonster, SkeletonMonster, SpiderMonster, FrankensteinMonster, VampireMonster, BatMonster, GravestoneMonster), BandageNote.tsx, DecayOverlay.tsx, CandyCrack.tsx, ContactSparkle.tsx, GhostCheer.tsx, CandyItem.tsx

**people/** contains personTypes.ts, rhythm.ts, personDecay.ts, personHistory.ts, PersonFields.tsx, HistoryTimeline.tsx, ContactSheet.tsx

**jars/** contains jarTypes.ts, jarRules.ts, JarSwitcher.tsx, JarManager.tsx

**desk/** contains selectDesk.ts, fitDesk.ts, celebrations.ts, contactLinks.ts, badge.ts, CelebrationCandy.tsx, DeskMoreChip.tsx, LogItPrompt.tsx

**shelf/** contains searchIndex.ts, shelfSort.ts, Shelf.tsx

**ai/** contains aiClient.ts, templates.ts, mailtoBatch.ts, ImportPreview.tsx, DraftSheet.tsx

**stats/** contains freshness.ts, streak.ts, StatsLine.tsx

**jar/** contains JarScene.tsx, JarBackGlass.tsx, JarFrontGlass.tsx, JarLid.tsx, DeskGlow.tsx, LidAnimation.tsx, JarPile.tsx, jarPileLayout.ts, lidQueue.ts, EmptyState.tsx

**contextMenu/** contains ContextMenu.tsx

**forms/** contains MonsterPicker.tsx, AddTaskForm.tsx, EditTaskForm.tsx

**focus/** contains FocusOverlay.tsx, DurationPicker.tsx, CandleTimer.tsx

**scene/** contains DeskBackground.tsx, AmbientScene.tsx, CandleGlow.tsx

**settings/** contains SettingsPanel.tsx, hauntClock.ts

**undo/** contains UndoToast.tsx

**audio/** contains audioContext.ts, sounds.ts, whisperGain.ts

## File responsibilities

- `tasks/taskTypes.ts`: Task, DecayStage, MonsterKind. Pure types, no logic.
- `tasks/taskReducer.ts`: AppReducer. Pure, no side effects. Handles Task and Person actions (for example `LOG_CONTACT`, `SNOOZE_PERSON`, `MOVE_CANDY`).
- `tasks/decayFunction.ts`: Pure function `(Task, logicalNow) => DecayStage`. Unchanged for Tasks.
- `tasks/taskStore.tsx`: Context and provider, wires reducer to persistence.
- `tasks/sampleData.ts`: Six sample candies for demo mode.
- `candy/stageOf.ts`: Dispatches to `decayFunction` for Tasks and `personDecay` for Persons.
- `candy/MonsterShape.tsx`: Dispatches to one of 8 SVG candy monsters by task.monster.
- `candy/monsters/`: PumpkinMonster, MummyMonster, SkeletonMonster, SpiderMonster, FrankensteinMonster, VampireMonster, BatMonster, GravestoneMonster.
- `candy/BandageNote.tsx`: Mummy-bandage note (linen strip, frayed edges, tilt, tail toward candy), truncated title, Inter min 12px.
- `candy/DecayOverlay.tsx`: Per-stage look: Fresh (glossy), Dull (duller body), Spooky (faint purple glow), Haunted (strong glow and wisps), Cursed (grey, cracks, glow).
- `candy/CandyCrack.tsx`: SVG crack overlay driven by press-and-hold progress (0 to 1).
- `candy/ContactSparkle.tsx`: Soft star burst after Reached out on a Person (no shatter).
- `candy/GhostCheer.tsx`: Friendly ghost sprite shown after task completion.
- `candy/CandyItem.tsx`: Composed candy with bandage note, overlays, and gesture handling. Holding a Task completes it. Holding a Person opens the ContactSheet.
- `people/rhythm.ts`: Check-in Rhythm arithmetic (days, weeks, months).
- `people/personDecay.ts`: Pure `(Person, now) => DecayStage` from time since last contact versus the Rhythm.
- `people/personHistory.ts`: Contact history helpers, capped at 50 entries per Person.
- `people/ContactSheet.tsx`: Reached out dialog (Call, Text, Email, Other, optional note).
- `jars/JarSwitcher.tsx`, `jars/JarManager.tsx`: Switch, create, rename, and delete jars.
- `desk/selectDesk.ts`: Single source of truth for who is on the desk (capped Persons plus up to 3 Cursed Tasks).
- `desk/fitDesk.ts`: Fits desk entries into the available slots and produces the "+N more on the Shelf" chip.
- `desk/celebrations.ts`: Birthdays and anniversaries for the local day, derived and never stored.
- `desk/contactLinks.ts`: Builds `tel:`, `sms:`, and `mailto:` links from sanitized values.
- `shelf/Shelf.tsx`: Searchable, sortable, filterable list of all candies for keyboard and screen reader use. Replaces `jar/ListView.tsx` and reuses its row styles and components.
- `ai/aiClient.ts`: The only module that calls `/api`. Runs only after a user tap, validates with Zod, falls back to `templates.ts` on error or offline.
- `stats/`: Freshness score and streak (pure) and the StatsLine.
- `jar/JarScene.tsx`: Composes JarBackGlass, candies (clipped), JarFrontGlass, JarLid, and DeskGlow.
- `jar/JarBackGlass.tsx`: Back glass layer.
- `jar/JarFrontGlass.tsx`: Front glass layer (rim, streaks, reflection, thick base).
- `jar/JarLid.tsx`: Lid with round knob.
- `jar/DeskGlow.tsx`: Soft shadow and warm glow on the desk under the jar.
- `jar/LidAnimation.tsx`: Lid lift, tilt, settle; coordinates candy drop in and float out.
- `jar/JarPile.tsx`: Precomputed packing layout, drop-in animation, jar capacity 40, extra candies spill onto the desk.
- `jar/EmptyState.tsx`: Friendly prompt shown when the active jar is empty.
- `contextMenu/ContextMenu.tsx`: Actions per candy. Task: Complete, Focus, Edit, Delete. Person: Reached out, Focus, Edit, Delete, plus Call, Text, Email, and Not today when on the desk.
- `forms/MonsterPicker.tsx`: Grid of 8 small monster buttons, each with an accessible name.
- `forms/AddTaskForm.tsx`: Person or Task switch, then Task fields (title, due date) or Person fields, jar, monster picker.
- `forms/EditTaskForm.tsx`: Same fields pre-populated, no kind switch. Monster picker writes to task.monster.
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

- `persistence.ts`: localStorage read, write, error handling (`hcj_data` version 2, `hcj_tasks` read for migration only).
- `exportImport.ts`: serializeTaskList and deserializeTaskList. Accepts v1 and v2 files.
- `taskSchema.ts`: Zod schema for Task, used by import validation.
- `dataSchema.ts`: Zod schema for the version 2 data (candies, jars, settings, stats).
- `migrate.ts`: Pure migration from `hcj_tasks` (v1) to `hcj_data` (v2).
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
| localStorage keys | hcj_ prefix, snake-case | hcj_data, hcj_sound |
| Test files | .test.ts(x) suffix | decayFunction.test.ts |

## Feature-first rule

Code belonging to a single feature lives inside `src/features/<feature>/`. Code shared across features goes in `src/hooks/` (custom hooks) or `src/utils/` (pure functions and services). Do not create a flat `src/components/` directory. Server code lives only in `functions/api/` and `worker/`.

## Pure logic boundary

These files must remain pure (no side effects, no DOM access, no module-level mutable state):
`decayFunction.ts`, `taskReducer.ts`, `taskSchema.ts`, `exportImport.ts`, `monsterKind.ts`, `packingLayout.ts`, `stageOf.ts`, `personDecay.ts`, `rhythm.ts`, `personHistory.ts`, `selectDesk.ts`, `fitDesk.ts`, `celebrations.ts`, `contactLinks.ts`, `searchIndex.ts`, `shelfSort.ts`, `jarRules.ts`, `freshness.ts`, `streak.ts`, `mailtoBatch.ts`, `templates.ts`, `dataSchema.ts`, `migrate.ts`, and the pure parts of `worker/`.

Keep all side effects (localStorage, AudioContext, timers, DOM events, network) in service files and hooks.
