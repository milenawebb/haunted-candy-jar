# Requirements Document

## Introduction

Haunted Candy Jar is a browser-only to-do and focus timer app with a spooky Halloween aesthetic. Tasks are represented as glossy hard candies sitting in a glass jar on a candlelit shelf. Completing a task shatters the candy in a satisfying animation; ignoring a task causes it to visually decay through stages of increasing spookiness. A focus mode pairs a single candy with a burning candle timer. The app targets the Kiroween hackathon Costume Contest category and must be polished, distinctive, and accessible. It is built with React, TypeScript, and Vite and deployed as a static site with no backend.

## Glossary

- **App**: The Haunted Candy Jar single-page application running in the browser.
- **Jar**: The glass candy jar rendered on-screen that contains all Candy items, with a visible capacity of 24 Candy items before overflow behaviour activates.
- **Candy**: A visual representation of one task — a glossy hard-candy shape rendered in code (CSS/SVG/Canvas).
- **Flavor_Color**: The user-assigned or auto-assigned color of a Candy, chosen from a fixed palette of Halloween-themed hues.
- **Decay_Stage**: One of five visual states a Candy progresses through based on due-date proximity or age since creation: Fresh → Dull → Cobwebbed → Oozing → Cursed.
- **Completion_Animation**: The crack-and-shatter effect triggered when the user completes a Candy via the press-and-hold gesture at full crack.
- **Ghost_Cheer**: A small friendly ghost sprite that appears briefly after a Completion_Animation.
- **Focus_Session**: A timed work interval in which the user concentrates on a single selected Candy while a candle timer burns down.
- **Candle_Timer**: The animated burning candle that tracks elapsed time during a Focus_Session.
- **Motion_Preference**: The operating-system or browser reduced-motion accessibility setting (`prefers-reduced-motion`).
- **Sound_Toggle**: The UI control that enables or disables all Web Audio API sound effects; off by default.
- **Persistence_Store**: The browser's localStorage or IndexedDB used to persist task data with no server.
- **Task**: The underlying data record for a to-do item, holding title, optional due date, Flavor_Color, Decay_Stage, completion state, and creation timestamp.
- **Context_Menu**: The small overlay menu that appears when a Candy is selected, offering Complete, Focus, Edit, and Delete actions.
- **Undo_Toast**: A non-blocking notification shown for 6 seconds after a Task is completed or deleted, allowing the user to restore the Task.
- **Sample_Candy**: A pre-seeded Candy displayed on first visit, clearly labeled in the UI as a sample, covering all five Decay_Stages.
- **Haunt_Speed**: A multiplier setting (1×, 60×, or 3600×) that accelerates the passage of time used for Decay_Stage calculations, intended for demos.
- **Decay_Function**: A pure function that accepts a Task and the current logical timestamp and returns the Decay_Stage for that Task.

---

## Requirements

### Requirement 1: Task Creation

**User Story:** As a user, I want to add a new task so that it appears as a candy in the jar and I can track it.

#### Acceptance Criteria

1. WHEN the user submits a new task title via the add-task control, THE App SHALL create a Task record with a unique identifier, the provided title, an optional due date if supplied, an auto-assigned or user-selected Flavor_Color, Decay_Stage set to Fresh, a creation timestamp set to the current logical time, and completion state set to incomplete.
2. WHEN a Task record is created, THE App SHALL animate a new Candy dropping into the Jar with a bounce effect.
3. WHEN a Task record is created, THE App SHALL persist the Task to the Persistence_Store before the candy-drop animation completes.
4. IF the user submits an empty title, THEN THE App SHALL display an inline validation message and SHALL NOT create a Task record.
5. THE App SHALL allow the user to assign a Flavor_Color from a palette of at least six Halloween-themed hues when creating a Task; if the user does not choose, THE App SHALL assign a Flavor_Color automatically.
6. WHERE the Sound_Toggle is enabled, WHEN a Candy drops into the Jar, THE App SHALL play a short candy-drop sound generated via the Web Audio API.

---

### Requirement 2: Task Persistence and Data Integrity

**User Story:** As a user, I want my tasks to survive page reloads so that I never lose work.

#### Acceptance Criteria

1. WHEN the App initialises, THE App SHALL load all previously persisted Task records from the Persistence_Store and render the corresponding Candy items in the Jar.
2. WHEN a Task record is created, updated, or deleted, THE App SHALL write the full current Task list to the Persistence_Store within 300 ms of the change.
3. IF the Persistence_Store is unavailable or returns a read error on initialisation, THEN THE App SHALL display a non-blocking warning banner and SHALL start with an empty Task list.
4. THE App SHALL store Task data as a serialisable JSON structure so that the full dataset can be exported and re-imported as plain text.
5. FOR ALL valid Task JSON structures, serialising then deserialising a Task SHALL produce an object equal to the original (round-trip property).

---

### Requirement 3: Candy Selection and Context Menu

**User Story:** As a user, I want to select a candy and choose what to do with it so that I can complete, focus on, edit, or delete a task deliberately.

#### Acceptance Criteria

1. WHEN the user taps or clicks a Candy, THE App SHALL select that Candy and display the Context_Menu adjacent to it; THE App SHALL NOT immediately complete the Task.
2. THE Context_Menu SHALL offer four actions: Complete, Focus, Edit, and Delete.
3. WHEN the user presses the Tab key to focus a Candy and then presses Enter, THE App SHALL display the Context_Menu for that Candy.
4. WHEN the user dismisses the Context_Menu without choosing an action (by tapping or clicking outside it, or by pressing Escape), THE App SHALL close the Context_Menu and deselect the Candy without changing the Task record.
5. THE App SHALL ensure the Context_Menu does not obscure other Candy items in a way that makes them untappable when the Jar contains more than one Candy.

---

### Requirement 4: Task Completion via Press-and-Hold

**User Story:** As a user, I want to complete a task by pressing and holding its candy so that I get a satisfying, deliberate confirmation gesture.

#### Acceptance Criteria

1. WHEN the user presses and holds a Candy (pointer or touch) for a continuous duration of at least 0.8 seconds, THE App SHALL trigger the full Completion_Animation and mark the Task as complete.
2. WHILE the user is holding a Candy and the hold duration is less than 0.8 seconds, THE App SHALL progressively render glaze cracks on the Candy in proportion to the fraction of 0.8 seconds elapsed.
3. WHEN the user releases a Candy before 0.8 seconds have elapsed, THE App SHALL reverse the crack animation until the Candy returns to its pre-hold visual state and SHALL NOT mark the Task as complete.
4. WHEN the Completion_Animation plays, THE App SHALL render the Candy's glaze cracking then shattering, visually ejecting the Candy from the Jar.
5. WHEN the Completion_Animation completes, THE App SHALL display the Ghost_Cheer graphic adjacent to where the Candy was.
6. WHEN the Completion_Animation completes, THE App SHALL mark the corresponding Task record as complete and persist the updated Task list to the Persistence_Store.
7. WHILE Motion_Preference is set to reduce motion, THE App SHALL skip the progressive crack frames and the shatter frames, instead fading the Candy out over 150 ms and displaying the Ghost_Cheer as a static image; the 0.8-second hold threshold SHALL still apply.
8. WHERE the Sound_Toggle is enabled, WHEN the Completion_Animation triggers, THE App SHALL play a crunching sound generated via the Web Audio API.
9. WHEN the user holds the Space key on the keyboard-focused Candy, THE App SHALL apply the same progressive cracking behaviour and the same 0.8-second threshold as the pointer gesture, completing the Task on threshold reached and reversing cracks on early release.

---

### Requirement 5: Undo

**User Story:** As a user, I want to undo an accidental completion or deletion so that I can recover a task without re-entering it.

#### Acceptance Criteria

1. WHEN a Task is completed or deleted, THE App SHALL display an Undo_Toast notification for 6 seconds.
2. WHEN the user activates the undo action in the Undo_Toast before it expires, THE App SHALL restore the Task to the Jar in its state immediately prior to the action that triggered the toast, including its Flavor_Color, due date, and Decay_Stage.
3. WHEN the Undo_Toast expires without activation, THE App SHALL dismiss the toast and permanently apply the completion or deletion.
4. THE App SHALL persist the restored Task to the Persistence_Store immediately upon undo activation.
5. THE App SHALL ensure only one Undo_Toast is visible at a time; if a second completion or deletion occurs while a toast is active, THE App SHALL dismiss the first toast, permanently apply the first action, and show a new toast for the second action.

---

### Requirement 6: Task Editing and Deletion

**User Story:** As a user, I want to edit or delete a task so that I can correct mistakes or remove tasks I no longer need.

#### Acceptance Criteria

1. WHEN the user selects Edit from the Context_Menu, THE App SHALL display an edit form pre-populated with the Task's current title, due date, and Flavor_Color.
2. WHEN the user submits the edit form with a valid title, THE App SHALL update the Task record and persist the change to the Persistence_Store within 300 ms.
3. IF the user submits the edit form with an empty title, THEN THE App SHALL display an inline validation message and SHALL NOT update the Task record.
4. WHEN the user selects Delete from the Context_Menu, THE App SHALL remove the Candy from the Jar with a brief fade-out, delete the Task record, and display an Undo_Toast as defined in Requirement 5.
5. WHEN the user cancels the edit form, THE App SHALL discard all edits and return the Candy to its previous visual state without modifying the Task record.

---

### Requirement 7: Task Decay Stages

**User Story:** As a user, I want overdue or neglected tasks to look increasingly spooky so that I am motivated to complete them.

#### Acceptance Criteria

1. THE App SHALL define five Decay_Stages in ascending order of urgency: Fresh, Dull, Cobwebbed, Oozing, and Cursed.
2. FOR Tasks that have a due date, THE Decay_Function SHALL assign Decay_Stages as follows: Fresh when the due date is more than 48 hours away; Dull when due within 48 hours; Cobwebbed when due within 24 hours; Oozing when due within 2 hours or up to 24 hours past due; Cursed when more than 24 hours past due.
3. FOR Tasks that have no due date, THE Decay_Function SHALL assign Decay_Stages based on age since creation timestamp as follows: Fresh when fewer than 3 days old; Dull when 3 days or more old but fewer than 7 days; Cobwebbed when 7 days or more old but fewer than 14 days; Oozing when 14 days or more old but fewer than 21 days; Cursed when 21 days or more old.
4. WHEN the App initialises and once per minute thereafter while Haunt_Speed is set to 1×, THE App SHALL invoke the Decay_Function for every incomplete Task and update each Candy's visual appearance to match the returned Decay_Stage. WHILE Haunt_Speed is set above 1×, THE App SHALL invoke the Decay_Function for every incomplete Task and update each Candy's visual appearance once per second.
5. WHEN a Candy's Decay_Stage is Fresh, THE App SHALL render it with a glossy, fully-saturated appearance and no overlay effects.
6. WHEN a Candy's Decay_Stage is Dull, THE App SHALL render it with a desaturated glaze and no overlay effects.
7. WHEN a Candy's Decay_Stage is Cobwebbed, THE App SHALL render a cobweb SVG overlay on the Candy.
8. WHEN a Candy's Decay_Stage is Oozing, THE App SHALL render an animated green-goo drip effect on the Candy generated in code.
9. WHEN a Candy's Decay_Stage is Cursed, THE App SHALL render a spooky face on the Candy and apply a continuous wobble animation.
10. WHILE a Candy's Decay_Stage is Oozing or Cursed, THE App SHALL emit a faint whispering ambient sound generated via the Web Audio API when that Candy is visible, provided the Sound_Toggle is enabled.
11. WHILE Motion_Preference is set to reduce motion, THE App SHALL suppress the wobble animation and the animated goo drip, substituting static visual indicators for each Decay_Stage.
12. THE App SHALL ensure each Decay_Stage is distinguishable from adjacent stages by at least one visual attribute other than color (such as shape, texture, or overlay) so that color-blind users can perceive the difference.

---

### Requirement 8: Decay Function Property-Based Testing

**User Story:** As a developer, I want the decay stage calculation guaranteed correct by property tests so that no code change silently regresses decay behaviour.

#### Acceptance Criteria

1. THE Decay_Function SHALL be implemented as a pure function that accepts a Task record and a numeric timestamp representing current logical time and returns a Decay_Stage, with no side effects or external state.
2. FOR ALL incomplete Tasks and FOR ALL pairs of timestamps T1 ≤ T2, the Decay_Stage returned by THE Decay_Function for timestamp T2 SHALL be greater than or equal to the Decay_Stage returned for timestamp T1 (monotonic non-decrease property).
3. THE App SHALL include a property-based test suite that verifies the monotonic non-decrease property stated in criterion 8.2 by generating arbitrary incomplete Task records and timestamp pairs.

---

### Requirement 9: Focus Mode

**User Story:** As a user, I want to enter a focus session on one task so that I can work without distraction while a timer counts down.

#### Acceptance Criteria

1. WHEN the user selects Focus from the Context_Menu on a Candy, THE App SHALL enter a Focus_Session for the corresponding Task, displaying only that Candy prominently and hiding the rest of the Jar.
2. WHEN the user activates Focus Mode, THE App SHALL prompt the user to set a duration in whole minutes between 1 and 90 inclusive before the Focus_Session begins; THE App SHALL display quick-select presets for 15, 25, and 50 minutes and SHALL pre-populate the duration field with 25 minutes; if the user dismisses without confirming a duration, THE App SHALL NOT start the Focus_Session.
3. WHEN a Focus_Session starts, THE App SHALL render an animated Candle_Timer that visually shortens at a rate proportional to the remaining session time.
4. WHILE a Focus_Session is active, THE App SHALL darken the room background and reduce ambient animation intensity to create a quieter visual environment.
5. WHEN the Candle_Timer reaches zero, THE App SHALL end the Focus_Session, restore the full Jar view, and display a session-complete notification.
6. WHEN the user manually ends a Focus_Session before the timer expires, THE App SHALL restore the full Jar view without marking the Task as complete.
7. WHILE Motion_Preference is set to reduce motion, THE App SHALL replace the animated Candle_Timer burn with a numerical countdown display.
8. WHERE the Sound_Toggle is enabled, WHEN a Focus_Session ends, THE App SHALL play a soft chime sound generated via the Web Audio API.
9. THE App SHALL allow the user to mark the focused Candy as complete from within the Focus_Session, triggering the Completion_Animation as defined in Requirement 4 and ending the Focus_Session.

---

### Requirement 10: Spooky Ambient Scene

**User Story:** As a user, I want the app to have a rich, atmospheric spooky environment so that using it feels immersive and distinctive.

#### Acceptance Criteria

1. THE App SHALL render a background scene composed entirely of code-generated assets (CSS, SVG, or Canvas) depicting a dark shelf, candlelight glow, soft fog, and faint ghost figures; no external image files or third-party art SHALL be used.
2. THE App SHALL animate the fog and ghost figures in the background continuously at a frame rate that does not reduce overall UI responsiveness below 60 fps on a mid-range device.
3. WHILE Motion_Preference is set to reduce motion, THE App SHALL freeze all background animations and display the scene as a static composition.
4. THE App SHALL maintain a minimum contrast ratio of 4.5:1 between all interactive text labels and their immediate backgrounds, as defined by WCAG 2.1 AA.
5. WHERE the Sound_Toggle is enabled, THE App SHALL play a low-volume looping ambient soundscape generated entirely via the Web Audio API; no audio files SHALL be loaded.

---

### Requirement 11: Whisper Sound Cap

**User Story:** As a user, I want whisper sounds from multiple overdue candies to remain at a tolerable volume so that the app does not become aurally overwhelming.

#### Acceptance Criteria

1. WHILE two or more Candies with Decay_Stage Cursed are visible and the Sound_Toggle is enabled, THE App SHALL cap the combined output gain of all concurrent whisper sounds so that the total volume does not exceed the volume of a single whisper sound at its default gain level.
2. WHEN the number of Cursed Candies visible in the Jar changes, THE App SHALL redistribute the available gain budget evenly across all active whisper sound nodes.

---

### Requirement 12: Accessibility

**User Story:** As a user with accessibility needs, I want the app to work with my assistive technology and preferences so that I am not excluded.

#### Acceptance Criteria

1. THE App SHALL provide ARIA labels or roles for every interactive element so that a screen reader can announce the element's purpose and current state.
2. WHEN a Candy's Decay_Stage changes, THE App SHALL update the corresponding ARIA label to include the new Decay_Stage name so that screen reader users receive the updated status.
3. THE App SHALL ensure every interactive control is reachable and operable using keyboard Tab and Enter or Space keys alone.
4. WHEN the Focus_Session Candle_Timer is active, THE App SHALL expose the remaining time as an ARIA live region updating at most once per minute so that screen reader users are informed of progress without interruption.
5. WHILE Motion_Preference is set to reduce motion, THE App SHALL honour that preference across all animations as specified in Requirements 4.7, 7.11, 9.7, and 10.3.
6. THE App SHALL not rely on color alone to convey the Decay_Stage of a Candy; each stage SHALL also carry a distinct shape or texture difference visible at the default zoom level.

---

### Requirement 13: Jar Capacity and Overflow

**User Story:** As a user with many tasks, I want the jar to remain usable and tappable even when it contains a large number of candies.

#### Acceptance Criteria

1. THE App SHALL display up to 24 Candy items in the Jar simultaneously without any two Candies overlapping in a way that makes an individual Candy untappable.
2. WHEN the Task list contains more than 24 incomplete Tasks, THE App SHALL either make the Jar scrollable or display a "+N more" indicator that reveals additional Candy items on demand, where N is the count of Tasks beyond the first 24.
3. THE App SHALL ensure that all Candy items, whether visible directly or via overflow, remain individually selectable.

---

### Requirement 14: Empty State

**User Story:** As a user who has completed or removed all tasks, I want to see a friendly prompt so that I know the jar is empty and I am invited to add a new task.

#### Acceptance Criteria

1. WHEN the Task list contains no incomplete Tasks and no Sample_Candy items are present, THE App SHALL display the empty Jar with a visible prompt inviting the user to add the first candy.
2. THE empty-state prompt SHALL be accessible as text (not image-only) so that screen readers can announce it.

---

### Requirement 15: Demo Mode

**User Story:** As a hackathon judge, I want to see all decay stages and app features immediately so that I can evaluate the app without waiting days for tasks to decay naturally.

#### Acceptance Criteria

1. WHEN the App initialises and the Persistence_Store contains no previously saved Tasks, THE App SHALL seed six Sample_Candy items, one representing each of the five Decay_Stages and one additional item, distributing stages so that all five stages are covered including at least one Oozing or Cursed item.
2. THE App SHALL render each Sample_Candy with a visible label indicating it is a sample, distinguishable from user-created Task titles.
3. THE App SHALL provide a "Clear samples" action that removes all Sample_Candy items from the Jar and the Persistence_Store in a single operation.
4. WHEN all Sample_Candy items are removed and no user Tasks exist, THE App SHALL transition to the empty state defined in Requirement 14.
5. THE App SHALL provide a Haunt_Speed control in the settings panel with three options: 1× (real time), 60× (one minute of real time equals one second of elapsed logical time), and 3600× (one hour of real time equals one second of elapsed logical time).
6. WHEN the Haunt_Speed is set to a value other than 1×, THE App SHALL advance the logical clock used by the Decay_Function at the selected multiplier rate and update Candy visuals accordingly, without altering the wall-clock timestamps stored in Task records.
7. WHEN the user sets Haunt_Speed to 1×, THE App SHALL reset the logical clock to real wall-clock time so that all Candy items return to the Decay_Stage they would have based on their actual stored timestamps.
8. THE App SHALL NOT persist the Haunt_Speed setting; every page load SHALL initialise Haunt_Speed to 1×.

---

### Requirement 16: Export and Import

**User Story:** As a user, I want to export and import my task list so that I can back up my data or move it between browsers.

#### Acceptance Criteria

1. THE App SHALL provide an Export action in the settings panel that serialises the full Task list to a JSON file and triggers a browser file download.
2. THE App SHALL provide an Import action in the settings panel that accepts a JSON file from the user, deserialises it, and replaces the current Task list with the imported Tasks.
3. IF the imported JSON file fails to parse or does not conform to the Task data schema, THEN THE App SHALL display an error message and SHALL NOT modify the current Task list.
4. THE exported and imported JSON format SHALL satisfy the round-trip serialisation property defined in Requirement 2.5; for all valid Task lists, exporting then importing SHALL produce a Task list equal to the original.
5. WHEN an import completes successfully, THE App SHALL persist the imported Task list to the Persistence_Store and re-render the Jar.

---

### Requirement 17: Sound System

**User Story:** As a user, I want optional sound effects that match the spooky theme so that the app feels alive, without sounds forcing themselves on me.

#### Acceptance Criteria

1. THE App SHALL initialise with the Sound_Toggle in the off state so that no audio plays until the user explicitly enables it.
2. WHEN the user activates the Sound_Toggle, THE App SHALL enable all audio effects described in Requirements 1.6, 4.8, 7.10, 9.8, and 10.5.
3. WHEN the user deactivates the Sound_Toggle, THE App SHALL immediately stop all currently playing audio and disable future audio playback.
4. THE App SHALL generate all audio using the Web Audio API exclusively; no audio files, CDN-hosted sounds, or third-party audio libraries SHALL be loaded or referenced.
5. THE Sound_Toggle state SHALL be persisted to the Persistence_Store so that the user's preference is restored on the next visit.

---

### Requirement 18: Performance

**User Story:** As a user on desktop or mobile, I want the app to feel fast and smooth so that interactions never feel sluggish.

#### Acceptance Criteria

1. THE App SHALL achieve an initial page load and render of the Jar view within 3 seconds on a 4G mobile connection (10 Mbps download, 50 ms RTT).
2. WHILE animations are playing, THE App SHALL maintain a rendering frame rate of at least 60 fps on a device with a mid-range mobile GPU, measured over any 1-second window during normal use.
3. THE App SHALL be touch-friendly, with all tap targets sized at least 44 × 44 CSS pixels on mobile viewports.
4. THE App SHALL remain fully functional on the latest stable versions of Chrome, Firefox, Safari, and Edge.

---

### Requirement 19: Technical Stack and Deployment

**User Story:** As a developer, I want the app built on a defined open-source stack so that it is maintainable and deployable as a static site.

#### Acceptance Criteria

1. THE App SHALL be implemented using React, TypeScript, and Vite as the core build stack.
2. THE App SHALL be buildable to a static asset bundle (HTML, CSS, and JavaScript files only) that can be served without a server-side runtime.
3. THE App SHALL be deployable to Cloudflare Pages by running the Vite production build command and publishing the output directory.
4. THE App SHALL be released under the MIT License; the repository SHALL contain a LICENSE file with the MIT License text.
5. THE App SHALL not contain code copied from other projects; all implementation SHALL be original work created for this hackathon.
6. THE App SHALL function entirely client-side with no calls to any external API or backend service.

---

## Non-Requirements

The following are explicitly out of scope for this project:

- **No multiplayer**: The App is a single-user application; no real-time collaboration, shared task lists, or multi-device sync features are included.
- **No recurring tasks**: Tasks are one-time items; the App does not support repeating or scheduled-recurrence tasks.
