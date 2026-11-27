# Product: Haunted Candy Jar

Tagline: contacts that never go stale.

## What it is

Haunted Candy Jar is a spooky to-do and relationship jar with a Halloween aesthetic, plus a focus timer. Tasks and Persons appear as glossy hard candies sitting in a glass jar on a candlelit shelf. Completing a task shatters the candy in a satisfying animation; ignoring a task or a Person causes it to decay through five increasingly spooky visual stages. A focus mode pairs a single candy with a burning candle timer.

There is no account and no sign-in. Everything runs in the browser and persists to localStorage (local-first). The only network use is optional AI helpers that run when the user taps them.

## Who it is for

- Primary audience: hackathon judges evaluating the Kiroween Costume Contest.
- Secondary audience: anyone who wants a spooky, playful alternative to a plain task list, and anyone who wants a gentle nudge to keep in touch with people.

## Kiroween Costume Contest

This project is a Kiroween hackathon entry in the **Costume Contest** category. Entries are judged on:

1. **Design.** Visual quality, polish, and cohesion.
2. **Impact.** How memorable and effective the app feels to use.
3. **Innovation.** Freshness of the concept and execution.
4. **Technical use of Kiro.** How well the AI-assisted development workflow was used.
5. **Presentation.** The demo video and first-impression clarity.

**Visuals and feel are the top priority.** The app must look and feel like a finished, polished product, not a prototype. Every interaction should be delightful. The spooky-cute aesthetic must be consistent from the ambient scene down to the smallest UI detail.

## Core experience

- Each task is a glossy hard candy in the jar.
- Completing a task: press and hold the candy for 0.8 seconds. The glaze cracks progressively and shatters on release. A tiny friendly ghost cheers.
- Ignoring a task: it decays through five stages (Fresh, Dull, Spooky, Haunted, Cursed) based on due date or age.
- Persons: a candy for someone to keep in touch with, with a check-in rhythm (every N days, weeks, or months). Time since the last contact drives the same five stages. "Reached out" (hold the candy, or use the menu) logs the contact and resets it to Fresh. Persons never shatter.
- Daily desk: due Persons (Haunted or Cursed, within a cap) and up to 3 Cursed tasks escape the jar onto the desk. From there the user can call, text, email, snooze for the day, or mark Reached out.
- Multiple jars: candies live in separate jars, switched from the jar switcher.
- The Shelf: a searchable, sortable, filterable list of every candy. It replaces the old list view.
- Optional AI helpers (import contacts, message drafts): they run only when tapped, drafts are editable and never sent automatically, and offline or failed calls fall back to local templates.
- Local-first privacy: contacts stay in the browser. The AI endpoint stores and logs no contact content.
- Focus mode: pick one candy, set a timer, a candle burns down while the room darkens.
- Demo mode: seeds sample candies covering every decay stage so judges can see everything immediately.
