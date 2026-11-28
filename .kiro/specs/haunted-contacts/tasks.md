# Implementation Plan: Haunted Contacts

## Overview

Evolve Haunted Candy Jar into a to-do and relationship jar. Order: steering docs, then pure logic with property tests, then the reducer and storage, then UI, then the daily desk, then jars and shelf, then the optional AI endpoints, then the sample jar and polish, then deploy. Each task fits one focused sub-agent run and names the files it creates or edits. Pure files (listed in the design's folder plan) stay free of side effects and DOM access. All new UI needs accessible names, 44 px hit areas, focus traps in dialogs, and a reduced-motion fallback (opacity fade of 150 ms at most). Never write files with shell commands, and never use em dashes. Tasks marked `*` are optional test tasks. Requirement numbers refer to `requirements.md` in this folder, and property numbers to the Correctness Properties section of `design.md`.

---

## Tasks

### Phase 1: Contacts core

- [x] 1. Update steering files for the new scope (docs only)
  - Edit `.kiro/steering/tech.md` per the design's Steering changes table: no network calls except same-origin `/api` calls the user starts by tapping an AI action; static bundle plus Cloudflare Pages Functions with Workers AI and KV bindings (no contact content stored, no secrets in the repo); storage key `hcj_data` (version 2), `hcj_tasks` read for migration only; add Workers AI models, `wrangler.toml`, KV rate counter, and CSP to the stack list
  - Edit `.kiro/steering/product.md`: spooky to-do and relationship jar ("contacts that never go stale"); add Persons, Desk, Jars, Shelf to the core experience and the audience
  - Edit `.kiro/steering/structure.md`: add `people/`, `jars/`, `desk/`, `shelf/`, `ai/`, `stats/`, root `worker/` and `functions/api/`, and the new pure files
  - Edit `.kiro/steering/style.md`: add the new pure files to the pure list and the properties 1 to 25 to the property test list, and reduced-motion rules for the sparkle, highlight, and crowding chip
  - _Requirements: Steering updates needed_

- [-] 2. Define the Candy union types and zod schemas
  - Create `src/features/people/personTypes.ts`: `PersonCandy`, `ContactEntry`, `ImportantDate`, `Rhythm` (`{n, unit: 'day'|'week'|'month'}`), pure `validatePersonInput` (name, email, phone digit, Rhythm 1 to 365, tag dedupe, 30 char date label)
  - Create `src/features/candy/candyTypes.ts`: `Candy = TaskCandy | PersonCandy` with `kind` and `jarId`; keep `taskTypes.ts` unchanged
  - Create `src/features/jars/jarTypes.ts` (`Jar`, default jar ids `jar-clients`, `jar-leads`, `jar-friends`, `jar-todos`) and `Settings`, `Stats`, `DataV2` types
  - Create `src/utils/dataSchema.ts` with the zod `DataV2Schema` and `PersonFieldsSchema`
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 6.1, 6.2_
  - [ ]* 2.1 Write property tests for person and Rhythm validation and serialization
    - Create `tests/properties/personValidation.test.ts` and `tests/properties/dataSerialization.test.ts`
    - **Property 20: Person and Rhythm validation**
    - **Property 21: Serialization round trip**
    - **Validates: Requirements 2.2 to 2.6, 12.4, 14.6**

- [ ] 3. Implement pure migration and parse helpers
  - Create `src/utils/migrate.ts` exporting `migrateV1`, `parseStored`, `toExport`, `fromImport` as in the design (deterministic, no clock, no random ids; each Task becomes `{...t, kind: 'task', jarId: 'jar-todos'}`)
  - Keep `exportImport.ts` pure; do not edit it in this task
  - _Requirements: 14.1, 14.2, 14.3, 14.6, 6.10_
  - [ ]* 3.1 Write property tests for migration and import
    - Create `tests/properties/migrate.test.ts` with generated valid Task lists and valid `DataV2`
    - **Property 7: Migration round trip, no loss, idempotent**
    - **Property 8: Import accepts v1 and v2**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.5, 14.6, 12.4, 12.5, 6.10**

- [ ] 4. Implement storage v2 with safe load order
  - Edit `src/utils/persistence.ts`: add `loadAll()` following the design's four-step load order (valid `hcj_data`; invalid or newer version means read-only warning; only `hcj_tasks` means migrate, write, read back and compare; neither means seed). Never delete `hcj_tasks`. Add `saveAll()` that is disabled when the session is read-only
  - Edit `src/features/tasks/taskStore.tsx` to hold `DataV2` and call `loadAll`/`saveAll`; show a non-blocking warning toast on failure ("Could not save yet. Your old candies are safe.")
  - _Requirements: 14.4, 14.5, 12.1_
  - [ ]* 4.1 Write unit tests for load order with a mocked `localStorage`
    - Create `tests/persistence.test.ts` covering the four cases, quota error, and mismatch
    - **Validates: Requirements 14.4, 14.5**

- [ ] 5. Implement `personDecay`, `rhythm`, and `stageOf`
  - Create `src/features/people/rhythm.ts`: pure `addRhythm(anchor, rhythm)` (day and week are fixed 24 h units, month uses calendar arithmetic with day clamping) and `periodOf`
  - Create `src/features/people/personDecay.ts`: `personDecay` and `elapsedAndPeriod` with thresholds 0.5, 0.8, 1.0, 1.5 (Haunted includes 1.5, Cursed above)
  - Create `src/features/candy/stageOf.ts`: `stageOf(c, now)` delegating to `decayFunction` for Tasks
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.8_
  - [ ]* 5.1 Write property tests for person decay
    - Create `tests/properties/personDecay.test.ts`
    - **Property 1: Person decay thresholds**
    - **Property 2: Person decay is monotonic**
    - **Property 3: Month period is positive and calendar-correct**
    - **Property 4: Task decay is unchanged**
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6, 3.8, 2.6, 1.3**

- [ ] 6. Wire `stageOf` everywhere `decayFunction` is used for rendering
  - Grep `decayFunction(` in `src/` and replace each render-time call with `stageOf` in `CandyItem.tsx`, `DecayOverlay` callers, `JarPile.tsx`, `ListView.tsx`, and the ARIA label builder; leave `decayFunction.ts` itself unchanged
  - Make `CandyItem.tsx` kind aware (a Person shows its name on the Bandage_Note); ARIA label includes kind and stage
  - _Requirements: 3.7, 3.8, 1.3_

- [ ] 7. Add reducer actions for Persons with undo
  - Edit `src/features/tasks/taskReducer.ts` (stay pure, `now` passed in): `CREATE_PERSON`, `EDIT_PERSON`, `LOG_CONTACT {id, type, note, now}`, `ADD_NOTE`, `EDIT_ENTRY`, `DELETE_HISTORY_ENTRY`; each undoable through the existing undo snapshot; `LOG_CONTACT` sets `lastContactAt = now`, adds one history entry, keeps the jar, clears `snoozedUntil`; `LOG_CONTACT` and `ADD_NOTE` trim history to the newest 50 entries per Person (drop the oldest), and trimming never changes `lastContactAt`
  - Create `src/features/people/personHistory.ts`: pure helpers (`newestLogged`, `recomputeLast`, `HISTORY_LIMIT = 50` trim helper that drops the oldest entries)
  - Existing Task actions (`COMPLETE_TASK`, `DELETE_TASK`, undo) must behave unchanged
  - _Requirements: 4.4, 4.5, 4.7, 4.9, 4.10, 4.12, 12.9, 1.6_
  - [ ]* 7.1 Write property tests for the reducer and history
    - Create `tests/properties/personReducer.test.ts`
    - **Property 5: Reached out resets and undo restores**
    - **Property 6: History deletion recomputes last contact**
    - **Property 24: Existing properties still hold** (re-run the base reducer and decay tests against the extended reducer)
    - **Validates: Requirements 4.4, 4.5, 4.7, 4.9, 4.10, 1.3, 3.8, 14.1**

  - [ ]* 7.2 Write property tests for history trimming
    - Extend `tests/properties/personReducer.test.ts`
    - **Property 25: History is bounded and trimming keeps last contact**
    - **Validates: Requirements 4.12, 12.9**

- [ ] 8. Add the Person/Task switch to the Add form
  - Edit `src/features/forms/AddTaskForm.tsx`: radio group "Candy kind" (Person, Task, default Task), 44 px targets; Task path unchanged
  - Create `src/features/people/PersonFields.tsx`: name, phone, email, tags, notes, Rhythm (N and unit, prefilled from the chosen jar default), Important dates (month, day, label, add and remove), jar select, with inline error messages from `validatePersonInput` and labels on every field
  - On submit dispatch `CREATE_PERSON`; default monster from `taskIdToMonster(id)`
  - _Requirements: 1.2, 1.3, 1.4, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.11_

- [ ] 9. Add the Person edit form
  - Edit `src/features/forms/EditTaskForm.tsx` to render `PersonFields` prefilled for Persons, with no kind control and the monster picker writing to `monster`; add a Jar select that dispatches `MOVE_CANDY` (add this action to `taskReducer.ts` if missing)
  - _Requirements: 1.5, 2.10, 2.11, 6.11_

- [ ] 10. Implement the contact sheet and Reached out flows
  - Create `src/features/people/ContactSheet.tsx`: dialog or bottom sheet with focus trap, four type radios (Call, Text, Email, Other), optional note, one primary "Reached out" button, last used type preselected (`settings.lastContactType`, default other)
  - Create `src/features/candy/ContactSparkle.tsx` (soft stars, no shatter; reduced motion uses an opacity fade of 150 ms at most)
  - Edit `src/features/candy/CandyItem.tsx`: when the 0.8 s hold completes on a Person, open `ContactSheet` instead of `COMPLETE_TASK`
  - Edit `src/features/contextMenu/ContextMenu.tsx` and `BottomSheet.tsx`: Persons show Reached out, Focus, Edit, Delete; Tasks unchanged
  - Show the Undo_Toast for 6 seconds after logging; sound hook point follows the Sound_Toggle (soft chime added when the sound task exists)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 4.11, 13.4, 13.5_

- [ ] 11. Implement the history timeline panel
  - Create `src/features/people/HistoryTimeline.tsx`: newest first, shows type, date, note; add note, edit note text, delete entry (44 px buttons, aria-labels); opened from a new Context_Menu item "History" for Persons (edit `ContextMenu.tsx` and `BottomSheet.tsx`)
  - _Requirements: 4.8, 4.9, 4.10, 13.3_

- [ ] 12. Update export and import for v2 with v1 compatibility
  - Edit `src/utils/exportImport.ts` (pure) to use `toExport`/`fromImport` from `migrate.ts`
  - Edit the export and import handlers in the settings area (or in `App.tsx` if the SettingsPanel is not built yet, see Notes) so import validates before touching state, rejects invalid files with a clear message, and keeps existing data untouched; show the line "This file has your people in it. Keep it somewhere safe." before download
  - _Requirements: 12.4, 12.5, 14.2_
  - [ ]* 12.1 Write property tests for import and export of the new reducer action
    - Extend `tests/properties/migrate.test.ts` with an `IMPORT_DATA` reducer round trip
    - **Property 8: Import accepts v1 and v2**
    - **Validates: Requirements 12.4, 12.5, 14.2**

- [ ] 13. Checkpoint, run all tests
  - Run the full Vitest suite and `tsc --noEmit`; fix failures; confirm old tasks still load in the To-dos jar by hand
  - _Requirements: 14.1, 3.8_

---

### Phase 2: Daily desk

- [ ] 14. Implement `selectDesk`, `celebrations`, and `fitDesk`
  - Create `src/features/desk/celebrations.ts`: `celebrationsOn(persons, now)` with Feb 29 matching Feb 28 in non-leap years; stable id `celebration:<personId>:<dateId>:<YYYY-MM-DD>`
  - Create `src/features/desk/selectDesk.ts`: `selectDesk(candies, jars, settings, now)` returning `personDesk`, `cursedTasks`, `celebrations`, `overflow`, `personDueCount` per the design rules (Person cap, ratio descending, name ascending, snooze, per-jar capacity 40); export `CURSED_TASK_CAP = 3` so `cursedTasks` holds at most 3 Cursed Tasks, most overdue first, separate from the Desk_Cap and never crowding out Persons; extra Cursed Tasks stay in their jar with the Cursed look
  - Create `src/features/desk/fitDesk.ts`: priority fill with a "more" count for the "+N more on the Shelf" chip
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.13, 5.16, 5.17, 5.18, 6.8, 6.9_
  - [ ]* 14.1 Write property tests for desk selection, snooze, and celebrations
    - Create `tests/properties/selectDesk.test.ts`
    - **Property 9: Desk selection invariants** (include the Cursed Task cap of 3, independent of the Person cap)
    - **Property 10: Snooze affects only eligibility**
    - **Property 11: Celebrations** (include Feb 29 in leap and non-leap years)
    - **Property 12: Crowding keeps priority and counts**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.13, 5.14, 5.16, 5.17, 5.18, 2.8, 2.9, 6.8, 6.9**

- [ ] 15. Replace `partitionTasks` in `layoutPile` and `JarPile`
  - Edit `src/features/jar/jarPileLayout.ts` (or the current layout file): replace `partitionTasks` with `partitionJar(jarCandies, selection)`; `PileEntry` gets `reason: 'person'|'cursed'|'overflow'|'celebration'`; spill order celebrations, persons, cursed tasks (at most 3, from `selectDesk`), overflow; Cursed Tasks beyond the cap stay in the jar
  - Edit `src/features/jar/JarPile.tsx` to call `selectDesk` and pass the selection; keep the escape and return lid events: change `ZoneSnapshot` to `{zone, escaped}` and update `diffZoneEvents` and the lid queue in `src/features/jar/lidQueue.ts`
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.16, 5.17, 6.8_
  - [ ]* 15.1 Write property tests for zone events and the lid queue
    - Create `tests/properties/zoneEvents.test.ts`
    - **Property 22: Zone events and lid queue**
    - **Validates: Requirements 5.1, 6.7, 4.4**

- [ ] 16. Add the Desk cap setting
  - Add `deskCap` (default 5, range 1 to 20, reject out of range) to `Settings` and a `SET_DESK_CAP` reducer case in `taskReducer.ts`
  - Add a number control with a label to `src/features/settings/SettingsPanel.tsx`. If the existing spec's task 42 is not done yet, create a minimal `SettingsPanel.tsx` with only this control and mount it from `App.tsx`; the later full SettingsPanel task extends the same file (overlap with existing spec task 42)
  - _Requirements: 5.3_

- [ ] 17. Add desk menu actions and contact links
  - Create `src/features/desk/contactLinks.ts` (pure): sanitize phone to digits, `+`, `*`, `#`; build `tel:`, `sms:`, `mailto:` with `encodeURIComponent`
  - Add pure `menuItemsFor(candy, onDesk)` in `src/features/contextMenu/menuItems.ts`: on the desk, Call and Text only with a phone, Email only with an email, Not today, Reached out, Focus, Edit, Delete
  - Edit `ContextMenu.tsx` and `BottomSheet.tsx` to use it; add `SNOOZE_PERSON` (sets `snoozedUntil = startOfNextLocalDay(now)`, no undo toast) to `taskReducer.ts`
  - Opening a link must not log a contact
  - _Requirements: 5.8, 5.9, 5.10, 5.11, 5.13, 5.14, 5.15_
  - [ ]* 17.1 Write unit tests for `contactLinks` and `menuItemsFor`
    - Create `tests/contactLinks.test.ts` for sanitizing and menu visibility rules
    - **Validates: Requirements 5.9, 5.10**

- [ ] 18. Implement the "Log it?" prompt
  - Create `src/features/desk/LogItPrompt.tsx` (44 px buttons, dismissible, `role="status"`) and an in-memory record `{personId, type, openedAt}` set when a link opens
  - On `visibilitychange` to visible, if the record is under 30 minutes old, show the prompt; one tap dispatches `LOG_CONTACT` with the matching type
  - _Requirements: 5.11, 5.12_

- [ ] 19. Implement celebration candy visuals and the desk crowding chip
  - Create `src/features/desk/CelebrationCandy.tsx` (distinct star-shaped candy with a text cue such as "Birthday", a 44 px hit area; static under reduced motion)
  - Create `src/features/desk/DeskMoreChip.tsx` ("+N more on the Shelf", a button that opens the Shelf once task 25 exists, otherwise opens nothing yet and stays a visible label)
  - Edit `JarPile.tsx` to render both using `fitDesk` with `deskSlots(compact)` of 9 (desktop) and 7 (mobile), already exported by `jarPileLayout.ts`
  - _Requirements: 5.5, 5.6, 5.7, 13.3, 13.5, 13.6_

- [ ] 20. Checkpoint, run all tests
  - Run the full suite and `tsc --noEmit`; check by hand that Due and Cursed Persons escape, Not today returns them, and the lid events still play
  - _Requirements: 5.1, 5.13_

---

### Phase 3: Jars and Shelf

- [ ] 21. Implement the jar model and rules
  - Create `src/features/jars/jarRules.ts` (pure): create, rename, change default Rhythm, delete (only when empty), reorder with dense `order`, name unique case-insensitive and 1 to 30 characters, at least one jar remains
  - Add reducer actions `CREATE_JAR`, `RENAME_JAR`, `SET_JAR_RHYTHM`, `DELETE_JAR` (with a move target when not empty), `REORDER_JARS`, `SET_ACTIVE_JAR` to `taskReducer.ts`; default jars Clients (30 days), Leads (14), Friends (60), To-dos (none)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [ ]* 21.1 Write property tests for jar rules
    - Create `tests/properties/jarRules.test.ts`
    - **Property 19: Jar rules**
    - **Validates: Requirements 6.3, 6.4, 6.5, 6.6**

- [ ] 22. Implement the jar switcher and jar manager
  - Create `src/features/jars/JarSwitcher.tsx`: one jar shown at a time, radio semantics (or `aria-pressed`) with the jar name as the accessible name, 44 px tabs
  - Create `src/features/jars/JarManager.tsx`: create, rename, default Rhythm, delete-with-move, reorder with up and down buttons plus drag, all keyboard operable, in a focus-trapped dialog
  - Mount both from `App.tsx`
  - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 13.3, 13.4_

- [ ] 23. Per-jar capacity and per-jar layout
  - Edit `JarPile.tsx` and `jarPileLayout.ts` so the active jar shows its own candies with capacity 40, overflow spilling to the desk; the desk still pulls from all jars; switching jars emits no lid events
  - _Requirements: 6.7, 6.8, 6.9_

- [ ] 24. Implement the pure search index and Shelf sorting
  - Create `src/features/shelf/searchIndex.ts`: `searchCandies(candies, query)` with case and accent folding across name or title, tags, notes, email, phone
  - Create `src/features/shelf/shelfSort.ts`: sort by most overdue, name, next check-in; filters by jar, tag, kind combined with search
  - _Requirements: 7.2, 7.3, 7.4_
  - [ ]* 24.1 Write property tests for search, sort, and filter
    - Create `tests/properties/shelf.test.ts`
    - **Property 13: Search completeness**
    - **Property 14: Shelf sort and filter**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [ ] 25. Implement the Shelf view
  - Create `src/features/shelf/Shelf.tsx`: replaces the stand-alone ListView screen and reuses the `ListView.tsx` rows, search box, sort select, filters (jar, tag, kind), friendly empty message when nothing matches, rows expose name, kind, jar, and stage to screen readers; add an App header button "Shelf" with an aria-label
  - This view replaces ListView and satisfies the existing spec's task 45; keep the `ListView.tsx` row components and styles and reuse them
  - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.9, 7.10_

- [ ] 26. Add the jar-view search highlight
  - Add a search box to the Jar view; matching candies get an outline plus a "match" badge (non-color cue), others dim; clearing the search removes both; reduced motion uses an opacity fade of 150 ms at most
  - Edit `CandyItem.tsx` and `CandyItem.css`; add `useSearchState` in `src/features/shelf/`
  - _Requirements: 7.7, 7.8, 13.5, 13.6_

- [ ] 27. Checkpoint, run all tests
  - Run the full suite and `tsc --noEmit`; check by hand that the Shelf lists hidden desk items and that the crowding chip opens it
  - _Requirements: 6.1, 7.1_

---

### Phase 4: AI

- [ ] 28. Scaffold Pages Functions, the worker folder, and `wrangler.toml`
  - Create `worker/models.ts`, `worker/schemas.ts` (zod request and response schemas), `worker/prompts.ts`, `worker/handlers.ts` (injected bindings so they stay testable), and `functions/api/import.ts`, `draft.ts`, `group-draft.ts`, `[[path]].ts` (404 JSON for any other `/api/*`) as thin adapters
  - Create `wrangler.toml` with `[ai] binding = "AI"`, `[[kv_namespaces]] binding = "RATE"`, and `[vars]` `AI_DAILY_LIMIT = "20"`, `MODEL_VISION`, `MODEL_TEXT`; no secrets (`RATE_SALT` is a dashboard secret); add `@cloudflare/workers-types` as a dev dependency
  - Verify the Workers AI model IDs for `MODEL_VISION` and `MODEL_TEXT` against the current Cloudflare Workers AI docs at build time (the design names are candidates only), and record the chosen IDs in `worker/models.ts` and `wrangler.toml`
  - Implement the request pipeline order from the design (method, Origin, content type, size, schema, rate limit, AI call with a 15 s timeout, output validation) and friendly error JSON
  - _Requirements: 8.2, 8.3, 8.12, 12.3_

- [ ] 29. Implement the daily rate limiter
  - Create `worker/rateLimit.ts`: key `rl:` plus hex SHA-256 of `RATE_SALT + clientIp + YYYY-MM-DD (UTC)`, count value, `expirationTtl` 172800; over the limit returns 429 with `Retry-After` and "The ghosts are resting. Try again tomorrow."; add the comment `shortcut: KV counter is approximate, upgrade to a Durable Object for exact limits`
  - _Requirements: 8.3_
  - [ ]* 29.1 Write tests with a mocked KV
    - Create `tests/worker/rateLimit.test.ts`
    - **Property 23: Rate limit**
    - **Validates: Requirement 8.3**

- [ ] 30. Implement `POST /api/import`
  - Implement the handler in `worker/handlers.ts` for `{text}` or `{imageBase64, mime}` (png, jpeg, webp, body at most 4 MB); lenient JSON parse of model output; `ImportResponseSchema` in `worker/schemas.ts` drops invalid rows and caps at 50, returning `{contacts, dropped}`
  - Reuse `validatePersonInput` from `personTypes.ts` in the schema
  - _Requirements: 8.5, 8.6, 12.2_
  - [ ]* 30.1 Write property tests for import response validation
    - Create `tests/properties/importResponse.test.ts`
    - **Property 16: Import row and AI response validation**
    - **Validates: Requirements 8.5, 8.6, 2.2 to 2.4**

- [ ] 31. Implement the AI client and the import UI
  - Create `src/features/ai/aiClient.ts`: one function per endpoint taking an `AbortSignal`, returning `{ok:true,data} | {ok:false,reason:'offline'|'limit'|'error'|'aborted'}`; called only from a user tap and never for samples; downscale images to at most 1600 px before upload
  - Create `src/features/ai/ImportPreview.tsx`: paste text box, screenshot upload, loading and cancel states, editable preview table with per-row include checkboxes and inline errors, "Add selected" disabled while an included row is invalid, one `IMPORT_PEOPLE` dispatch into the chosen jar on confirm (add the action to `taskReducer.ts`)
  - Add an "Import people" entry in the Jar manager or header
  - _Requirements: 8.1, 8.4, 8.5, 8.6, 8.11, 9.6_

- [ ] 32. Implement `POST /api/draft` and the draft UI for one person
  - Add the handler (inputs: firstName, notes up to 500, up to 5 recent entries, channel, tone; output `{subject?, body}`) in `worker/handlers.ts` and prompts in `worker/prompts.ts`
  - Create `src/features/ai/DraftSheet.tsx` (editable text or email draft, loading, cancel, error state, "Open text" or "Open email" button using `contactLinks.ts` with the draft as body); add a Draft button to the Person desk menu and the contact sheet
  - _Requirements: 8.4, 8.7, 8.10, 8.11, 12.2_

- [ ] 33. Implement mailto batching
  - Create `src/features/ai/mailtoBatch.ts` (pure): trim and dedupe recipients case-insensitively, greedy batches by `maxLen = 1800`, `bodyOmitted` flag when the subject and body leave no room
  - _Requirements: 8.8, 8.9_
  - [ ]* 33.1 Write property tests for batching
    - Create `tests/properties/mailtoBatch.test.ts`
    - **Property 15: Mailto batching**
    - **Validates: Requirements 8.8, 8.9**

- [ ] 34. Implement `POST /api/group-draft` with the group message UI
  - Add the handler (groupName, context up to 500, channel email, tone, optional firstNames) in `worker/handlers.ts`
  - Extend `DraftSheet.tsx` with a group mode for a jar or a tag: editable draft, "Open email" using `mailtoBatch` (one button per batch, with "Batch 1 of N" labels), and a copy-recipients fallback button
  - _Requirements: 8.8, 8.9, 8.10_

- [ ] 35. Implement client template fallbacks
  - Create `src/features/ai/templates.ts` (pure): fixed short templates for a check-in text, check-in email, and group message with the playful voice (no em dashes)
  - Make `aiClient.ts` callers use a template and show one short sentence when the reason is `offline`, `limit`, or `error`
  - _Requirements: 8.4_
  - [ ]* 35.1 Write unit tests for templates
    - Create `tests/templates.test.ts`: no em dash, names inserted, non-empty
    - **Validates: Requirements 8.4, 13.2**

- [ ] 36. Add the service worker denylist and the CSP
  - Edit `vite.config.ts`: workbox `navigateFallbackDenylist: [/^\/api\//]` and `runtimeCaching` with `NetworkOnly` for `/api/`
  - Create `public/_routes.json` (`{"version":1,"include":["/api/*"]}`) and edit `public/_headers` with the design's CSP (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`), `X-Content-Type-Options`, and `Referrer-Policy`; keep the existing `_redirects` catch-all
  - _Requirements: 12.2, 12.7_

- [ ] 37. Write Worker endpoint tests with a mocked AI binding
  - Create `tests/worker/endpoints.test.ts`: mock `AI.run` and KV; cover wrong method, bad Origin, oversized body, bad JSON, schema failure, 429, AI timeout, malformed model output, and a happy path for each of the three endpoints; assert that nothing is logged
  - _Requirements: 8.2, 8.3, 12.3_

- [ ] 38. Checkpoint, run all tests
  - Run the full suite and `tsc --noEmit`; run `npx wrangler pages dev` only if available, and note the result; confirm no key or secret exists in the repo with a read-only grep
  - _Requirements: 8.2_

---

### Phase 5: Sample jar and polish

- [ ] 39. Implement the sample jar and "Start my own jar"
  - Create `src/features/people/sampleCandies.ts` (pure, `sampleCandies(now)`): about eight fictional Persons ("Mina Moonbeam", `mina@example.com`, `555-0142`) across the default jars, covering all five stages through `lastContactAt = now - r * period`, plus one with an Important Date today or soon; all have `isSample: true`
  - Seed from `loadAll()` step 4; show a "Sample" label on sample Persons in the UI and the Shelf
  - Add a "Start my own jar" button (in the header menu or the intro) that dispatches `CLEAR_SAMPLES` and keeps user data
  - Coordinate with the existing spec's task 39 (`SAMPLE_TASKS`): the new samples replace it; if task 39 is done by then, remove the task samples
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

- [ ] 40. Coordinate the sample jar with the first-visit intro
  - Edit `src/features/help/IntroGuide.tsx` so the intro appears once and mentions the sample jar and "Start my own jar"; do not show it twice when samples seed
  - _Requirements: 9.5_

- [ ] 41. Implement freshness score and streak (pure)
  - Create `src/features/stats/freshness.ts` (`freshnessScore(persons, now): number | null`) and `src/features/stats/streak.ts` (`recordContact`, `currentStreak`, local-day keys, calendar-day step); a day counts only when a real Reached out (`LOG_CONTACT`) is logged that day, and snoozes, notes, and an empty desk never change the stats
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7, 10.8_
  - [ ]* 41.1 Write property tests for freshness and streak
    - Create `tests/properties/stats.test.ts`
    - **Property 17: Freshness score bounds**
    - **Property 18: Streak rules** (only `LOG_CONTACT` counts, snooze and notes never count)
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.7, 10.8**

- [ ] 42. Implement the stats line UI
  - Create `src/features/stats/StatsLine.tsx`: "Your network is 82% fresh" and "Streak 3 days, best 7" as text, with a check mark plus text on a cleared day; hidden when there are no Persons
  - Create `src/hooks/useThrottledAnnouncement.ts` for a polite live region updating at most once per minute
  - Add `RECORD_DESK_COUNT` to `taskReducer.ts`, dispatched from an effect when `personDueCount` changes and only while Haunt Speed is 1
  - _Requirements: 10.1, 10.3, 10.5, 10.9, 13.7_

- [ ] 43. Implement the app icon badge
  - Create `src/features/desk/badge.ts` (side effects): `updateBadge(count)` uses `navigator.setAppBadge` or `clearAppBadge` when they exist, in try and catch with no message; never call `Notification.requestPermission`
  - Run it from an effect in `App.tsx` when `personDueCount` changes and on `visibilitychange`
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [ ]* 43.1 Write unit tests with mocked `navigator`
    - Create `tests/badge.test.ts`: supported, unsupported, thrown error, zero clears, no permission call
    - **Validates: Requirements 11.1 to 11.4**

- [ ] 44. Update intro and How it works copy
  - Edit `src/features/help/IntroGuide.tsx` and `HowItWorks.tsx`: explain Persons, the Desk, Reached out, Jars, the Shelf; short, playful, spooky-cute, no em dashes
  - _Requirements: 13.1, 13.2_

- [ ] 45. Implement "Delete all my data"
  - Add a button in `SettingsPanel.tsx` (create the minimal panel from task 16 if still missing) opening a confirm dialog with a focus trap and two buttons; on confirm remove `hcj_data`, `hcj_tasks`, `hcj_sound`, `hcj_seen_intro`, clear the badge, and reset state with a `RESET_ALL` action; copy stays friendly ("Poof, all gone")
  - _Requirements: 12.6_

- [ ] 46. Accessibility pass for the new UI
  - Check every new component (`ContactSheet`, `HistoryTimeline`, `JarSwitcher`, `JarManager`, `Shelf`, `DraftSheet`, `ImportPreview`, `LogItPrompt`, `CelebrationCandy`, `DeskMoreChip`, `StatsLine`): accessible name, 44 px hit area, focus trap, text or shape cue besides color, reduced-motion fallback of at most 150 ms
  - Fix gaps in the files themselves and add `tests/a11y/newUi.test.tsx` with jest-axe style checks if the repo already uses them, otherwise simple role and name assertions
  - _Requirements: 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ] 47. Checkpoint, run all tests
  - Run the full suite and `tsc --noEmit`; walk through a first-visit session and a returning-user session by hand
  - _Requirements: 9.1, 14.1_

---

### Phase 6: Deploy

- [ ] 48. Document Cloudflare Pages project settings
  - Edit `README.md`: build command `npm run build`, output directory `dist`, Node version (set `NODE_VERSION` and match `engines` in `package.json`), root directory, and where `functions/` and `wrangler.toml` live
  - _Requirements: 8.2_

- [ ] 49. Document bindings and environment variables
  - Edit `README.md`: add a Pages Functions section for the `AI` binding, the `RATE` KV binding, vars `AI_DAILY_LIMIT`, `MODEL_VISION`, `MODEL_TEXT`, and the dashboard secret `RATE_SALT`; state that no secret is stored in the repo and that AI features work only when bindings exist (fallback templates otherwise)
  - _Requirements: 8.2, 8.3_

- [ ] 50. Prepare the preview deploy
  - Run `npm run build` and fix any error; check that `dist/` has `_headers`, `_redirects`, `_routes.json`, and `sw.js`; push the branch only if the user asks; record the preview URL steps in `README.md`
  - Edit `public/_headers` so `sw.js` has `Cache-Control: no-cache`
  - _Requirements: 12.7_

- [ ] 51. Write the production deploy checklist
  - Create `docs/deploy-checklist.md`: set `AI_DAILY_LIMIT` (suggested 20), verify CSP in the browser console, confirm `sw.js` cache headers, confirm the KV namespace and secret exist, confirm `/api/unknown` returns JSON 404
  - _Requirements: 8.3, 12.2_

- [ ] 52. Write the smoke test checklist and README updates
  - Add to `docs/deploy-checklist.md`: offline after first load, install as app, badge appears, an AI action falls back to a template when the limit is hit or offline, export then import round trip, old v1 data migrates
  - Edit `README.md` Features section (use the update-README steering) and the Credits section to describe Persons, Desk, Jars, Shelf, AI helpers, and privacy; no em dashes
  - _Requirements: 8.4, 12.7, 13.1_

- [ ] 53. Final checkpoint, full suite green, no TypeScript errors
  - Run `npm test`, `tsc --noEmit`, `npm run lint`, and `npm run build`; confirm all property tests run at least 100 iterations
  - _Requirements: 3.5, 14.6_

---

## Notes

- Tasks marked with `*` are optional test tasks. Skipping them leaves the pure logic untested, so keep them for the pure files.
- Property numbers refer to the 25 properties in `design.md`. Property 24 re-runs the base spec properties against the extended code.
- The existing `haunted-candy-jar` spec stays in place and unchanged. Its unfinished tasks relate to this spec as follows:
  - 16a Ambient scene (optional): kept, independent.
  - 34 to 36 Focus mode (DurationPicker, CandleTimer, FocusOverlay): kept. Persons can use Focus from the menu, so build these as planned; this spec only adds the menu item.
  - 37, 37a, 38 Sound system: kept. Task 10 here adds a soft contact chime hook that follows the Sound_Toggle once task 37 exists.
  - 39 `sampleData.ts`: superseded by task 39 here (Person samples). Task samples may remain only as a few To-dos if wanted.
  - 40 Clear samples: merged into task 39 here ("Start my own jar" uses the same `CLEAR_SAMPLES` action).
  - 41 Haunt_Speed control: kept. Stats and the streak pause while Haunt Speed is above 1 (task 42).
  - 42 SettingsPanel: merged. Task 16 here creates a minimal panel if task 42 is not done, and task 42 then extends the same file. Task 45 here adds "Delete all my data" to it.
  - 43 BottomSheet: kept (a `BottomSheet.tsx` already exists and is reused here).
  - 44, 46, 47, 48 Accessibility, keyboard, reduced motion, a11y suite: kept; task 46 here covers only the new UI.
  - 45 ListView: replaced. The Shelf (task 25) replaces the ListView screen, reuses its `ListView.tsx` rows, and satisfies the accessible list view requirement.
  - 49, 50 Export and Import: superseded in behavior by task 12 here (v2 plus v1 import); build the buttons once in the SettingsPanel.
  - 51 to 53a Mobile layout, cross-browser, Credits: kept. Task 52 here also edits the README Features and Credits.
  - 54 Final checkpoint: kept, and run again after task 53 here.
  - 55, 56 Wallpaper mode and `.ics` import (optional): kept, out of scope here.
- If the base spec's SettingsPanel, ListView, or export tasks are done before this spec starts, edit those files instead of creating minimal versions.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["4.1", "5.1"] },
    { "id": 3, "tasks": ["6", "7.1"] },
    { "id": 4, "tasks": ["7.2", "8"] },
    { "id": 5, "tasks": ["9", "10"] },
    { "id": 6, "tasks": ["11", "12.1"] },
    { "id": 7, "tasks": ["13"] },
    { "id": 8, "tasks": ["14.1", "16"] },
    { "id": 9, "tasks": ["15.1", "17.1"] },
    { "id": 10, "tasks": ["18", "19"] },
    { "id": 11, "tasks": ["20"] },
    { "id": 12, "tasks": ["21.1", "24.1"] },
    { "id": 13, "tasks": ["22", "25"] },
    { "id": 14, "tasks": ["23", "26"] },
    { "id": 15, "tasks": ["27"] },
    { "id": 16, "tasks": ["28", "29.1"] },
    { "id": 17, "tasks": ["30.1", "31"] },
    { "id": 18, "tasks": ["32", "33.1"] },
    { "id": 19, "tasks": ["34", "35.1"] },
    { "id": 20, "tasks": ["36", "37"] },
    { "id": 21, "tasks": ["38"] },
    { "id": 22, "tasks": ["39", "41.1"] },
    { "id": 23, "tasks": ["40", "42", "43.1"] },
    { "id": 24, "tasks": ["44", "45"] },
    { "id": 25, "tasks": ["46"] },
    { "id": 26, "tasks": ["47"] },
    { "id": 27, "tasks": ["48"] },
    { "id": 28, "tasks": ["49", "51"] },
    { "id": 29, "tasks": ["50"] },
    { "id": 30, "tasks": ["52"] },
    { "id": 31, "tasks": ["53"] }
  ]
}
```
