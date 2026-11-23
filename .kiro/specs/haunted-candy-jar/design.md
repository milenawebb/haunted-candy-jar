# Design Document

## Overview

Haunted Candy Jar is a React + TypeScript + Vite single-page application that renders a to-do list as a glass jar of Halloween candies. Every visual asset is generated in code (CSS, inline SVG, Canvas 2D); every sound is synthesised via the Web Audio API. The app is fully client-side with no backend: data lives in `localStorage`, and the finished build is a static bundle deployable to Cloudflare Pages.

The design is organised around four concerns:

1. **Core data model and pure logic** — `Task`, `DecayStage`, and the pure `decayFunction` that maps a task + timestamp → stage.
2. **State machine** — a `useReducer`-based store that owns all mutations (create, complete, edit, delete, undo, focus, settings).
3. **Rendering layer** — React components responsible for the jar scene, individual candy shapes, overlays, focus mode, and ambient scene.
4. **Services** — side-effect modules (persistence, audio, export/import) that the reducer dispatches into via effects.

### Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| State management | `useReducer` + React Context | No external library needed; reducer is a pure function, easy to unit-test; keeps dependency count low for a hackathon |
| Persistence | `localStorage` (JSON) | Simpler API than IndexedDB; ≤24 tasks fit well inside the 5–10 MB limit; synchronous reads keep startup fast |
| Property-based testing library | `fast-check` + `@fast-check/vitest` | Standard pairing for TypeScript + Vitest; first-class arbitrary generators; shrinking built-in |
| Visual rendering | Inline SVG for candy shapes; CSS keyframe animations for decay overlays; Canvas 2D for shatter particles | SVG stays crisp at any DPI; CSS GPU-composited animations hit 60 fps without JS; Canvas gives per-frame control for the burst effect |
| Sound synthesis | Web Audio API — `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `StereoPannerNode` | Zero file payload; API is universally supported on target browsers; sufficient for spooky synth tones |

---

## Art Direction

### Mood

Cozy-creepy candy shop at midnight. The scene holds two opposing light sources in tension: warm amber candlelight (bottom-left) and cold blue-white moonlight (top-right). The background sits in deep plum and near-black tones. The result is familiar and inviting at first glance, then unsettling on closer inspection — exactly right for a Halloween task manager.

### Color Palette

| Role | Token | Hex |
|---|---|---|
| Background (deep plum) | `color-bg` | `#1A0A2E` |
| Background (near-black) | `color-bg-deep` | `#0D0514` |
| Candlelight warm | `color-candle` | `#FFAA44` |
| Candlelight amber | `color-candle-deep` | `#C85A00` |
| Moonlight cool | `color-moon` | `#B8D4FF` |
| Moonlight accent | `color-moon-deep` | `#6090CC` |
| Candy: pumpkin | `flavor-pumpkin` | `#FF6B2B` |
| Candy: witch | `flavor-witch` | `#7B2FBE` |
| Candy: blood | `flavor-blood` | `#C0392B` |
| Candy: slime | `flavor-slime` | `#39D353` |
| Candy: bone | `flavor-bone` | `#F5F0DC` |
| Candy: moonlight | `flavor-moonlight` | `#8FB8FF` |

The former `midnight` color (`#1A1A2E`) has been replaced by `moonlight` (`#8FB8FF`). Midnight was near-invisible against the dark background; moonlight is a soft blue used for cool accent highlights and moonlight glow effects. All six `FlavorColor` values are verified visually distinct and legible against the deep-plum/near-black background.

### Typography

| Role | Font | Delivery |
|---|---|---|
| App title + large section headings only | **Creepster** (Google Fonts, OFL) | Self-hosted: `public/fonts/Creepster-Regular.woff2` |
| Task titles, body, UI labels, metadata | **Inter** (Google Fonts / Rasmus Andersson, OFL) | Self-hosted: `public/fonts/Inter-VariableFont.woff2` |

Both fonts are bundled at build time via Vite's static asset pipeline (`@font-face` declarations in `src/styles/fonts.css`). No runtime fetch from Google CDN occurs — the app functions fully offline after first load.

Creepster is used **only** for the app title ("Haunted Candy Jar") and large section headings. It is **not** used for task titles anywhere in the UI. Task titles — on candy tags and in List View — use Inter at a minimum of 12 px. Inter is used for all other UI chrome: buttons, labels, the settings panel, the focus mode countdown, and form fields.

### Lighting Direction

Candlelight originates from **bottom-left**; moonlight originates from **top-right**. This direction governs every element in the scene:

- **Specular highlights** on candy surfaces sit near the **top-left** edge (catching both sources but weighted toward the nearer candle).
- **Inner shadows / darkening** accumulate on the **bottom-right** edge.
- The jar glass shows a warm reflection arc on its left interior wall and a cool blue-white reflection on its right rim.
- Ghost figures in the ambient scene cast soft warm shadows downward-right.

### Shadow Style

Each interactive element carries **two layered drop shadows**:

1. **Near shadow** — 1–2 px offset, candlelight amber (`rgba(200, 90, 0, 0.35)`), sharp, low spread. Simulates the close candleflame.
2. **Far shadow** — 4–8 px offset, cool blue-gray (`rgba(80, 100, 150, 0.2)`), large blur, represents the distant moonlight fill.

Candy items additionally have a **contact shadow** directly below on the jar floor: a soft dark ellipse (`rgba(0,0,0,0.4)`, blur 6 px), scaled to candy width.

---

## Architecture

The app is structured as a feature-first module layout inside `src/`:

```
src/
├── main.tsx                  # Vite entry — mounts <App />
├── App.tsx                   # Root: wraps providers, renders scene + jar
├── styles/
│   └── fonts.css             # @font-face declarations for Creepster + Inter (self-hosted)
├── features/
│   ├── tasks/
│   │   ├── taskTypes.ts      # Task, DecayStage, FlavorColor — pure types
│   │   ├── taskReducer.ts    # AppReducer (pure, no side-effects)
│   │   ├── decayFunction.ts  # Pure: (Task, logicalNow) → DecayStage (derived, not stored)
│   │   ├── taskStore.tsx     # Context + provider, wires reducer ↔ persistence
│   │   └── sampleData.ts     # Six sample candies for demo mode
│   ├── candy/
│   │   ├── CandyShape.tsx    # SVG candy body (round swirl / twist-wrap / gumdrop) by task ID + FlavorColor
│   │   ├── CandyTag.tsx      # Paper tag on string (truncated title, cream/yellowed SVG)
│   │   ├── DecayOverlay.tsx  # Cobweb / goo / face by DecayStage
│   │   ├── CandyCrack.tsx    # Animated crack SVG (press-and-hold progress)
│   │   ├── GhostCheer.tsx    # Ghost sprite post-completion
│   │   └── CandyItem.tsx     # Composed candy + tag + overlays + gesture handling
│   ├── jar/
│   │   ├── JarScene.tsx      # Glass jar SVG with rim highlights and glass reflections
│   │   ├── JarPile.tsx       # Precomputed packing layout, drop-in animation, overflow indicator
│   │   ├── ListView.tsx      # Accessible <ul> list view (keyboard / screen reader primary)
│   │   └── EmptyState.tsx    # Prompt shown when task list is empty
│   ├── contextMenu/
│   │   └── ContextMenu.tsx   # Complete / Focus / Edit / Delete (popover desktop, bottom sheet mobile)
│   ├── forms/
│   │   ├── AddTaskForm.tsx   # Title, due date, flavor color picker, shape picker — modal/bottom sheet
│   │   └── EditTaskForm.tsx  # Same fields pre-populated, opened from context menu Edit action; shape picker writes to task.shape
│   ├── focus/
│   │   ├── FocusOverlay.tsx  # Darkened full-screen overlay
│   │   ├── DurationPicker.tsx# 1–90 min input with 15/25/50 presets
│   │   └── CandleTimer.tsx   # Animated burning candle / numerical fallback
│   ├── scene/
│   │   ├── AmbientScene.tsx  # Shelf, candlelight, fog, ghosts in CSS/SVG
│   │   └── CandleGlow.tsx    # Pulsing radial gradient around candle
│   ├── settings/
│   │   ├── SettingsPanel.tsx # Sound toggle, haunt speed, export, import (bottom sheet on mobile)
│   │   └── hauntClock.ts     # Logical clock with Haunt_Speed multiplier
│   ├── undo/
│   │   └── UndoToast.tsx     # 6-second dismissible toast
│   └── audio/
│       ├── audioContext.ts   # Singleton AudioContext factory
│       ├── sounds.ts         # Synthesised sound functions
│       └── whisperGain.ts    # Gain budget manager for Cursed-candy whispers
├── hooks/
│   ├── usePressAndHold.ts    # Pointer + keyboard hold gesture with progress callback
│   ├── useHauntClock.ts      # Returns current logical timestamp (respects Haunt_Speed)
│   └── useReducedMotion.ts   # Reads prefers-reduced-motion media query
└── utils/
    ├── persistence.ts        # localStorage read / write / error handling
    ├── exportImport.ts       # serializeTaskList / deserializeTaskList
    ├── taskSchema.ts         # Zod schema for Task — used by import validation
    ├── idGen.ts              # crypto.randomUUID wrapper
    ├── candyShape.ts         # Deterministic shape assignment: taskId → 'round'|'twist'|'gumdrop'
    └── packingLayout.ts      # Seeded packing layout computation (task IDs as seed)
```

### Component dependency graph

```mermaid
graph TD
    App --> TaskStoreProvider
    App --> AmbientScene
    App --> JarScene
    App --> UndoToast
    App --> SettingsPanel
    TaskStoreProvider --> taskReducer
    TaskStoreProvider --> persistence
    JarScene --> JarPile
    JarScene --> ListView
    JarPile --> CandyItem
    CandyItem --> CandyShape
    CandyItem --> CandyTag
    CandyItem --> DecayOverlay
    CandyItem --> CandyCrack
    CandyItem --> ContextMenu
    CandyItem --> usePressAndHold
    ContextMenu --> FocusOverlay
    ContextMenu --> EditTaskForm
    FocusOverlay --> DurationPicker
    FocusOverlay --> CandleTimer
    FocusOverlay --> CandyItem
    App --> AddTaskForm
    SettingsPanel --> hauntClock
    SettingsPanel --> exportImport
    sounds --> audioContext
    whisperGain --> audioContext
```

### Data flow

```mermaid
sequenceDiagram
    participant User
    participant CandyItem
    participant Reducer
    participant Persistence
    participant AudioService

    User->>CandyItem: press-and-hold (≥0.8 s)
    CandyItem->>Reducer: dispatch COMPLETE_TASK
    Reducer-->>CandyItem: new state (task marked complete)
    Reducer-->>Persistence: write updated task list (≤300 ms)
    Reducer-->>AudioService: trigger crunch sound (if Sound_Toggle on)
    CandyItem->>CandyItem: play shatter + Ghost_Cheer
    Reducer-->>UndoToast: show toast (6 s)
```

---

## Components and Interfaces

### Task store (Context + Reducer)

The store is the single source of truth for all mutable app state. It is provided at the root via `<TaskStoreProvider>` and consumed through `useTaskStore()`.

```typescript
// AppState shape
interface AppState {
  tasks: Task[];
  selectedTaskId: string | null;
  pendingUndo: { task: Task; action: 'complete' | 'delete' } | null;
  focusSession: FocusSession | null;
  soundEnabled: boolean;
  hauntSpeed: 1 | 60 | 3600;
}

// Dispatcher action union
type AppAction =
  | { type: 'CREATE_TASK'; payload: CreateTaskInput }
  | { type: 'COMPLETE_TASK'; taskId: string }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'EDIT_TASK'; taskId: string; payload: EditTaskInput }
  | { type: 'SELECT_TASK'; taskId: string | null }
  | { type: 'UNDO' }
  | { type: 'UNDO_EXPIRED' }
  | { type: 'START_FOCUS'; taskId: string; durationMinutes: number }
  | { type: 'END_FOCUS'; markComplete: boolean }
  | { type: 'SET_SOUND'; enabled: boolean }
  | { type: 'SET_HAUNT_SPEED'; speed: 1 | 60 | 3600 }
  | { type: 'IMPORT_TASKS'; tasks: Task[] }
  | { type: 'CLEAR_SAMPLES' };
```

### CandyItem

The core interactive component. Owns the press-and-hold gesture, renders the composed candy, and delegates to the context menu.

```typescript
interface CandyItemProps {
  task: Task;
  slot: number;          // position index in the packing layout
  isSelected: boolean;
  rotation: number;      // ±15° stable rotation derived from task ID
  onGestureComplete: () => void;   // fires when hold threshold reached
}
```

Internal state: `crackProgress` (0–1 float, drives the SVG crack overlay opacity/path depth).

Each `CandyItem` renders a stacked composition: `CandyShape` (base SVG body) → `CandyTag` (paper tag with truncated title) → `DecayOverlay` (stage-specific visual) → `CandyCrack` (hold-progress overlay). The candy's tappable hit area is always at least 44×44 px regardless of visual size or rotation, enforced via a transparent hit-area `<rect>` in the SVG.

### CandyShape

Renders one of three SVG candy body shapes, assigned deterministically from the task's `id` (using `candyShape.ts`'s `taskIdToShape(id)` function) so the shape is stable across renders and re-mounts.

```typescript
type CandyShapeVariant = 'round' | 'twist' | 'gumdrop';

interface CandyShapeProps {
  flavorColor: FlavorColor;
  variant: CandyShapeVariant;
  decayStage: DecayStage;   // drives CSS filter: saturate() for Dull stage
  size?: number;             // px, default 72 desktop / 60 mobile
}
```

#### Shape variants

**Round swirl hard candy** — circular SVG body. A radial gradient gives the flavor color a lighter center and darker edge. Two or three painted swirl lines fan from the center. A small white/near-white specular arc sits near the top-left (per lighting direction). An `feTurbulence`-based SVG filter adds a subtle sugar-crystal texture without raster images. A soft dark shadow curves around the bottom-right edge.

**Twist-wrapped candy** — cylindrical pill with pointed twisted ends. A linear gradient runs along the length, lighter on the left (candlelight side), darker on the right. Diagonal highlight stripes simulate the twisted wrapper ridges. The same specular arc sits near the top-left of the cylinder body.

**Gumdrop** — dome shape (half-ellipse over a flat base). A radial gradient brightens toward the top-center. A soft top highlight (white, low opacity) gives the jellied gloss. A subtle sugar texture via `feTurbulence`. Shadow pools at the base.

All variants share:
- Radial or linear gradient body using `flavor-*` color tokens
- Sharp specular highlight arc near top-left (white, `opacity: 0.85`)
- Soft inner shadow on bottom-right edge (`rgba(0,0,0,0.25)`)
- Sugar texture / swirl pattern via SVG `<pattern>` or `feTurbulence` filter — no raster images
- Contact shadow below on the jar floor (soft ellipse, `rgba(0,0,0,0.4)`, blur 6 px)
- Default size: `72px` desktop, `60px` mobile

### CandyTag

A small paper tag attached to each candy by a thin SVG string. The tag is an SVG rectangle with a slightly torn/ragged bottom edge, filled with a cream/yellowed color (`#F5EDD0`). It displays the task title truncated to ~18 characters with an ellipsis.

```typescript
interface CandyTagProps {
  title: string;
  selected: boolean;   // when true, full title shown in the context menu, not the tag itself
}
```

The tag tilts slightly (2–4° stable rotation per task ID) and the string is a short curved SVG path. Font: Inter, minimum 12 px, dark brown ink color.

### DecayOverlay

Conditionally renders the stage-specific visual layer on top of a candy:

| Stage | Overlay |
|---|---|
| Fresh | None |
| Dull | CSS `filter: saturate(0.3)` applied to `CandyShape`, no overlay element |
| Cobwebbed | Inline SVG cobweb path, white at 70% opacity |
| Oozing | CSS `@keyframes` animated green drip path (`<path d="...">` with `stroke-dashoffset` animation) |
| Cursed | SVG spooky face + CSS `wobble` keyframe (suppressed under `prefers-reduced-motion`) |

Each overlay also carries a distinguishing non-color attribute (shape, texture, or movement) to satisfy Requirement 12.6.

### JarPile and JarScene

**JarScene** renders the glass jar as a tall SVG element. The jar body is a rounded rectangle with:
- A thick glass rim at the top with a warm-left / cool-right reflection arc
- Subtle internal glass reflection arcs on both walls (left: amber-tinted, right: blue-white)
- A slight refraction tint on candies visible near the glass edges (5% desaturation + slight cool tint via CSS filter), applied only to candies whose packing position places them within ~12 px of the jar wall

**JarPile** replaces the former `JarGrid`. Candies settle at the bottom of the jar in a precomputed packing layout:
- Layout is computed once per task-set change by `packingLayout.ts`, using a seeded random number generator initialised with a hash of the full set of task IDs. The result is stable — the same set of tasks always produces the same positions.
- Slight overlap between adjacent candies is permitted (max 10% of candy radius).
- Each candy has a stable random rotation between ±15°, also seeded per task ID.
- When a new candy is added, it **drops in from the lid** and animates to its computed position using a CSS spring transition (or `spring()` from a small physics helper). Under `prefers-reduced-motion`, the candy appears instantly at its final position.
- Every candy maintains a minimum 44×44 px tappable hit area regardless of visual size or rotation, enforced via a transparent SVG `<rect>` hit target.

**Overflow (>24 visible candies):** when the task list exceeds 24 incomplete items, the jar interior becomes internally scrollable (CSS `overflow-y: scroll` with a scroll-snap boundary at the lid opening), and a "+N more" badge floats at the top of the pile to indicate hidden candies. All candies, visible or scrolled, remain individually selectable.

### ListView

An accessible `<ul>` list that shows all tasks sorted by decay stage (Cursed first). Each `<li>` shows: task title (Inter, minimum 12 px), due date if set, decay stage label as a `<span>` with an ARIA label, and a row of action buttons (Complete, Focus, Edit, Delete) that map to the same reducer actions as the context menu.

A **"List View" toggle button** sits in the top bar (desktop) or top bar (mobile), keyboard-reachable via Tab. Activating it swaps the main content region from `JarScene` to `ListView` and back. The jar view is the default. The toggle carries `aria-pressed` state.

### AddTaskForm

Opens in a **modal** on desktop and a **bottom sheet** on mobile, triggered by the "Add candy" FAB or bar.

Fields:
- **Title** (`<input type="text">`, required, inline validation on submit)
- **Due date** (`<input type="date">`, optional)
- **Flavor color** — a swatch grid of six color circles (labeled with color name via `aria-label`), keyboard navigable with arrow keys, selection indicated by a ring outline
- **Candy shape** — three shape preview buttons (round, twist, gumdrop SVG thumbnails) letting the user override the deterministic default; selection indicated by a ring outline. Choosing a shape sets `task.shape` to the selected `CandyShapeVariant`; leaving the default unselected stores `null`, which causes `CandyItem` to call `taskIdToShape(id)` at render time.

All fields are fully keyboard navigable. The form closes on Escape or Cancel without creating a task.

### CandyCrack

Renders hairline SVG crack paths over the candy during a press-and-hold. Progress (0–1) maps to opacity and path stroke-width. On early release, the component animates `progress` back to 0 using a CSS transition.

### CandleTimer

```typescript
interface CandleTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  reducedMotion: boolean;   // when true, renders numeric countdown instead
}
```

The animated variant draws a tall, thin SVG rectangle (the candle body) whose height shrinks from 100% to 0% over the session. A flame SVG sits on top with a wobble animation. The numerical fallback is a plain `<time>` element inside an ARIA live region.

### ContextMenu

Keyboard-accessible overlay with four buttons: Complete, Focus, Edit, Delete. On **desktop**, it is positioned adjacent to the candy using CSS absolute positioning within a relative-positioned jar slot. On **mobile**, it renders as a **bottom sheet** that slides up from the bottom edge of the viewport. Closes on `Escape` or outside click via a `useClickOutside` hook.

### UndoToast

Displays a notification at the bottom of the screen. Owns a 6-second `setTimeout`; dispatches `UNDO_EXPIRED` on natural expiry. If a second action fires while visible, the first dispatch fires immediately and the toast re-mounts for the second action.

### AmbientScene

A layered SVG `<svg>` covering the viewport background. Layers from back to front:

1. Dark gradient sky (`<radialGradient>` warm amber → near-black)
2. Wooden shelf planks (CSS `repeating-linear-gradient`)
3. Candlelight glow (pulsing `<radialGradient>` via CSS animation)
4. Fog ribbons (SVG `<path>` with slow horizontal `translate` keyframe; static under `prefers-reduced-motion`)
5. Ghost figures (SVG `<g>` with gentle float animation; static under `prefers-reduced-motion`)

---

## Mobile Layout

The app adapts its chrome and navigation patterns for mobile viewports (< 768 px wide). The core jar experience is preserved; only layout and control surfaces change.

| Element | Desktop | Mobile |
|---|---|---|
| Jar | Centered, fixed width (~480 px) | Centered, `~90vw`, fills most of viewport |
| "Add candy" action | Button in top bar or sidebar | **FAB (floating action button)** fixed at bottom-right, or a full-width bar above the system nav |
| Settings panel | Modal or sidebar | **Bottom sheet** — slides up from the bottom edge, dismissible with swipe-down or a close button |
| Context menu | Floating popover adjacent to candy | **Bottom sheet** — slides up from the bottom, same four actions in a larger touch-friendly list |
| List View toggle | Button in top bar | Button in top bar (same position, smaller label or icon-only with `aria-label`) |
| Undo toast | Bottom-center | Bottom-center, above the FAB |

### Bottom sheet behavior

Both the settings panel and the context menu use the same `BottomSheet` component: a fixed panel that covers the bottom portion of the viewport, with a drag handle at the top. It traps keyboard focus while open, dismisses on Escape or a tap on the scrim, and respects `prefers-reduced-motion` (instant appear/dismiss instead of slide animation).

### Touch targets

All interactive elements on mobile have a minimum hit area of 44×44 CSS pixels. Candy hit areas are enforced via a transparent SVG `<rect>` overlay as described in the JarPile section. FAB is at least 56×56 px per Material/HIG conventions.

---

## Data Models

### Task

```typescript
type DecayStage = 'Fresh' | 'Dull' | 'Cobwebbed' | 'Oozing' | 'Cursed';

type FlavorColor =
  | 'pumpkin'    // #FF6B2B
  | 'witch'      // #7B2FBE
  | 'blood'      // #C0392B
  | 'slime'      // #39D353
  | 'bone'       // #F5F0DC
  | 'moonlight'; // #8FB8FF  (replaces 'midnight' #1A1A2E — cool accent, legible on dark background)

interface Task {
  id: string;               // crypto.randomUUID()
  title: string;            // non-empty after trim
  dueDate: number | null;   // Unix timestamp ms (real wall-clock), or null
  flavorColor: FlavorColor;
  shape: CandyShapeVariant | null; // null → derive from taskIdToShape(id); non-null → user-chosen shape stored explicitly
  isSample: boolean;        // true for seeded demo candies
  createdAt: number;        // real wall-clock timestamp at creation (Date.now(), ms)
  completedAt: number | null; // real wall-clock timestamp on completion, or null
}

type PersistedTaskList = Task[];  // serialised as JSON array in localStorage key 'hcj_tasks'
```

`DecayStage` is **not stored** on the `Task` record. It is a **derived value**, computed fresh on each render (and each haunt-clock tick) by calling `decayFunction(task, logicalNow)`. Storing it would risk stale cached stages after a Haunt_Speed change and would cause the round-trip serialisation property to diverge.

`createdAt`, `dueDate`, and `completedAt` are **always real wall-clock timestamps** (`Date.now()` in ms). They are never overwritten with logical time. Haunt_Speed only affects the `logicalNow` argument passed to `decayFunction` — it never mutates persisted data.

### FocusSession

```typescript
interface FocusSession {
  taskId: string;
  durationSeconds: number;
  startedAt: number;        // wall-clock Date.now()
}
```

### CreateTaskInput / EditTaskInput

```typescript
interface CreateTaskInput {
  title: string;
  dueDate: number | null;
  flavorColor: FlavorColor | null;  // null → auto-assign round-robin
}

interface EditTaskInput {
  title: string;
  dueDate: number | null;
  flavorColor: FlavorColor;
}
```

### Serialisation format

Tasks are stored and exported as a JSON array of `Task` objects. Because `DecayStage` is a derived value (not stored), it is absent from the serialised format; it is recomputed from stored timestamps on load. The `shape` field is included in the serialised format: a `null` value means the shape continues to be derived deterministically from `taskIdToShape(id)`, while a non-null value preserves the user's explicit choice. The import path validates the array against a Zod schema before accepting it; schema mismatch triggers an error message with no state change.

The Zod schema for a `Task` record includes `shape` as a nullable enum of `CandyShapeVariant`:

```typescript
const CandyShapeVariantSchema = z.enum(['round', 'twist', 'gumdrop']);

const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  dueDate: z.number().nullable(),
  flavorColor: z.enum(['pumpkin', 'witch', 'blood', 'slime', 'bone', 'moonlight']),
  shape: CandyShapeVariantSchema.nullable(),
  isSample: z.boolean(),
  createdAt: z.number(),
  completedAt: z.number().nullable(),
});
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Task creation populates all required fields

*For any* non-empty (non-whitespace) title string and optional due-date value, calling `createTask()` shall return a Task record whose `id` is non-empty, `title` equals the trimmed input, `completedAt` is `null`, and `createdAt` is the logical timestamp passed to the function. Because `DecayStage` is derived rather than stored, the initial stage — `'Fresh'` — is verified by calling `decayFunction` on the newly created task with `logicalNow = createdAt`, which must return `'Fresh'`.

**Validates: Requirements 1.1**

---

### Property 2: Empty-title rejection

*For any* string composed entirely of whitespace characters (including the empty string), the task-creation logic shall reject the input and return no Task record.

**Validates: Requirements 1.4**

---

### Property 3: Task serialisation round-trip

*For any* valid `Task` object (which does not include `decayStage`, as that field is derived and not persisted), serialising it to JSON via `serializeTaskList` and then deserialising via `deserializeTaskList` shall produce a `Task` object that deep-equals the original, including the `shape` field (`null` or a `CandyShapeVariant` value).

**Validates: Requirements 2.5, 16.4**

---

### Property 4: Decay function — due-date path correctness

*For any* incomplete Task that has a `dueDate` and *for any* current logical timestamp, `decayFunction(task, now)` shall return the stage defined by the threshold rules in Requirement 7.2: `Fresh` when due date is more than 48 h away; `Dull` within 48 h; `Cobwebbed` within 24 h; `Oozing` within 2 h or up to 24 h past due; `Cursed` more than 24 h past due.

**Validates: Requirements 7.2**

---

### Property 5: Decay function — age-based path correctness

*For any* incomplete Task with no `dueDate` and *for any* current logical timestamp, `decayFunction(task, now)` shall return the stage defined by the age thresholds in Requirement 7.3: `Fresh` < 3 days; `Dull` ≥ 3 d < 7 d; `Cobwebbed` ≥ 7 d < 14 d; `Oozing` ≥ 14 d < 21 d; `Cursed` ≥ 21 d.

**Validates: Requirements 7.3**

---

### Property 6: Decay function monotonicity

*For any* incomplete Task (with or without a due date) and *for any* pair of logical timestamps T1 ≤ T2, the numeric ordinal of `decayFunction(task, T2)` shall be greater than or equal to the ordinal of `decayFunction(task, T1)`. Decay stages never reverse as time advances.

**Validates: Requirements 8.2**

---

### Property 7: Undo restores prior task state

*For any* task list and *for any* task in that list, applying a `COMPLETE_TASK` or `DELETE_TASK` action followed immediately by `UNDO` shall produce a task list that deep-equals the list before the action, including the task's `flavorColor`, `dueDate`, and `createdAt`. Because `decayStage` is derived and not stored, the restored task will naturally produce the same `DecayStage` as before when `decayFunction` is called with the same `logicalNow`. Storing wall-clock timestamps (`createdAt`, `dueDate`, `completedAt`) and passing `logicalNow` as a parameter to `decayFunction` ensures that Haunt_Speed never mutates persisted data and that undo always restores a faithful record.

**Validates: Requirements 5.2**

---

### Property 8: Whisper gain budget is bounded

*For any* integer N (1 ≤ N ≤ 24) representing the number of currently visible Cursed candies with active whisper nodes, the sum of gain values assigned across all N nodes shall not exceed the default single-whisper gain level, and each node shall receive exactly `defaultGain / N`.

**Validates: Requirements 11.1, 11.2**

---

## Error Handling

| Failure scenario | Detection point | Recovery |
|---|---|---|
| `localStorage` unavailable or quota exceeded on write | `persistence.ts` try/catch | Log warning to console; show non-blocking banner; in-memory state continues normally |
| `localStorage` read error on startup | `persistence.ts` try/catch | Show non-blocking warning banner; start with empty task list (Req 2.3) |
| Imported JSON fails `JSON.parse` | `exportImport.ts` | Show inline error message; leave current task list unchanged (Req 16.3) |
| Imported JSON fails Zod schema validation | `taskSchema.ts` | Show inline error with schema mismatch detail; leave current task list unchanged (Req 16.3) |
| `AudioContext` blocked by browser autoplay policy | `audioContext.ts` try/catch | Catch `NotAllowedError`; silently disable audio until user interaction resumes the context |
| `crypto.randomUUID` unavailable (very old Safari) | `idGen.ts` | Fallback to `Math.random()`-based UUID v4 |
| Focus session task deleted while session active | `taskReducer.ts` `DELETE_TASK` case | End focus session automatically; show notification "Focused task was deleted" |
| Undo invoked after toast timeout race condition | `taskReducer.ts` `UNDO` case | Guard: if `pendingUndo` is null, dispatch is a no-op |

---

## Testing Strategy

### Dual approach

The project uses **Vitest** as the test runner throughout.

- **Unit / example-based tests** cover specific scenarios, edge cases, and integration between components.
- **Property-based tests** use `fast-check` + `@fast-check/vitest` to verify universal invariants across a generated input space. Each property test runs a minimum of **100 iterations** per execution.

### Unit tests

Target: `src/features/tasks/taskReducer.ts`, `src/features/tasks/decayFunction.ts`, component behaviour.

Key examples and edge cases:

- `CREATE_TASK` with valid input produces the correct Task shape.
- `CREATE_TASK` with whitespace-only title does not add to the task list.
- `COMPLETE_TASK` → `UNDO` restores the original task list.
- `DELETE_TASK` → `UNDO` restores the original task list.
- `UNDO_EXPIRED` while no pending undo is a no-op.
- Second action while toast active: first action is committed, new toast shown.
- `decayFunction` returns `'Fresh'` for a task due 72 h from now.
- `decayFunction` returns `'Cursed'` for a task due 48 h ago.
- Persistence write is called within 300 ms of a state change.
- Import of malformed JSON shows error and does not mutate task list.
- `whisperGain.allocate(3)` returns `defaultGain / 3` per node.

### Property-based tests

Each test is tagged with a comment identifying its design property.

```typescript
// Feature: haunted-candy-jar, Property 1: Task creation populates all required fields
it.prop([fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), fc.option(fc.integer())])
  ('createTask fills all required fields', (title, dueDate) => { ... });

// Feature: haunted-candy-jar, Property 2: Empty-title rejection
it.prop([fc.string().filter(s => s.trim().length === 0)])
  ('createTask rejects whitespace-only titles', (title) => { ... });

// Feature: haunted-candy-jar, Property 3: Task serialisation round-trip
it.prop([fc.array(arbitraryTask())])
  ('serialize then deserialize is identity', (tasks) => { ... });

// Feature: haunted-candy-jar, Property 4: Decay function due-date path correctness
it.prop([arbitraryDueDateTask(), fc.integer()])
  ('decayFunction due-date path matches thresholds', (task, now) => { ... });

// Feature: haunted-candy-jar, Property 5: Decay function age-based path correctness
it.prop([arbitraryNoDueDateTask(), fc.integer()])
  ('decayFunction age-based path matches thresholds', (task, now) => { ... });

// Feature: haunted-candy-jar, Property 6: Decay function monotonicity
it.prop([arbitraryIncompleteTask(), fc.integer(), fc.integer()])
  ('decayFunction never decreases as time advances', (task, t1raw, t2raw) => {
    const [t1, t2] = [Math.min(t1raw, t2raw), Math.max(t1raw, t2raw)];
    expect(stageOrdinal(decayFunction(task, t2)))
      .toBeGreaterThanOrEqual(stageOrdinal(decayFunction(task, t1)));
  });

// Feature: haunted-candy-jar, Property 7: Undo restores prior task state
it.prop([fc.array(arbitraryTask(), { minLength: 1 }), fc.constantFrom('complete', 'delete')])
  ('undo after action restores original list', (tasks, action) => { ... });

// Feature: haunted-candy-jar, Property 8: Whisper gain budget is bounded
it.prop([fc.integer({ min: 1, max: 24 })])
  ('whisper gain never exceeds single-whisper budget', (n) => {
    const nodes = allocateWhisperGain(n, DEFAULT_WHISPER_GAIN);
    const total = nodes.reduce((sum, g) => sum + g, 0);
    expect(total).toBeLessThanOrEqual(DEFAULT_WHISPER_GAIN + Number.EPSILON);
    nodes.forEach(g => expect(g).toBeCloseTo(DEFAULT_WHISPER_GAIN / n));
  });
```

### Integration / component tests

Use **React Testing Library** (RTL) for DOM-level interaction tests:

- Clicking a candy selects it and shows the Context_Menu.
- Press-and-hold simulation (via pointer events at 800+ ms) triggers `COMPLETE_TASK`.
- Press-and-hold release before 800 ms does not trigger completion.
- Focus mode: selecting "Focus" opens duration picker with presets 15, 25, 50 and default 25.
- Empty-state prompt renders when task list is empty.
- Haunt_Speed control renders with values 1×, 60×, 3600× in settings panel.
- ARIA labels update when a candy's decay stage changes.
- Context_Menu closes on Escape keypress without changing task.
- Undo toast renders after a task deletion; clicking undo re-adds the task.

### Accessibility tests

Use **axe-core** via `@axe-core/react` in development, and `vitest-axe` in CI:

- No accessibility violations on initial render.
- No violations when context menu is open.
- No violations during focus mode.
- Candle timer ARIA live region is present and labelled.
