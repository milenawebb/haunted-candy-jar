# Requirements Document
## Introduction
Haunted Candy Jar: contacts that never go stale. This spec (Haunted Contacts) evolves the App from a spooky to-do jar into a spooky relationship jar. A Candy can now be a Person (someone to stay in touch with) as well as a Task. A Person decays the longer it has been since the last contact, compared with a check-in rhythm the user chooses. Persons who are due, or long overdue, escape the jar onto the desk, where the user can call, text, email, snooze, or mark them as reached out. Candies live in several jars (Clients, Leads, Friends, To-dos), can be searched on a Shelf, and optional AI helpers can import contacts and draft messages.

This spec builds on `.kiro/specs/haunted-candy-jar/requirements.md` (the "base spec"), which stays as is. **All existing jar, decay, escape, Context_Menu, form, Undo_Toast, help, focus, sound, and accessibility behavior of the base spec is kept unless a requirement in this document changes it explicitly.** Where a requirement here says "as for Tasks", it means the base spec behavior applies unchanged. Everything stays local-first: contact data lives in the browser on the device, with no account.
## Glossary
Terms from the base spec (App, Jar, Candy, Monster_Kind, Bandage_Note, Decay_Stage, Haunt_Speed, Persistence_Store, Context_Menu, Undo_Toast, Sample_Candy, Motion_Preference, Decay_Function) keep their meaning. New or extended terms:
- **Candy_Kind**: Either Person or Task. Every Candy has exactly one Candy_Kind.
- **Person**: A Candy that represents one contact the user wants to stay in touch with.
- **Rhythm**: The check-in interval of a Person: N days, weeks, or months, with N from 1 to 365.
- **Contact_Entry**: One history item of a Person: a logged contact (type call, text, email, or other, with an optional note) or a plain note, with a timestamp.
- **History_Timeline**: The list of a Person's Contact_Entry items, newest first.
- **Last_Contact**: The timestamp of the newest logged contact of a Person, or none.
- **Elapsed_Ratio (r)**: The elapsed logical time since Last_Contact (or since the Person was added when there is none) divided by the Rhythm length.
- **Due**: A Person whose Decay_Stage is Haunted (1.0 <= r <= 1.5).
- **Reached_Out**: The action that logs a contact for a Person, resets it to Fresh, and keeps it in its Jar.
- **Jar_Set**: The ordered collection of Jars. Each Jar has a name, a default Rhythm (or none), and a capacity of 40.
- **Jar_Switcher**: The control that shows one Jar at a time.
- **Desk**: The area of the Desk_Scene next to the Jar where escaped and overflow Candy items sit.
- **Desk_Cap**: The user setting (default 5, range 1 to 20) limiting how many Persons escape to the Desk at once.
- **Person_Desk_Count**: The number of Persons currently on the Desk because of Due or Cursed status, excluding snoozed Persons and Celebration_Candy items.
- **Snooze**: The "Not today" action that removes a Person from the Desk until the start of the next local day.
- **Celebration_Candy**: A special Candy shown on the Desk on the local day of a Person's important date.
- **Important_Date**: An optional yearly repeating date of a Person (birthday, home anniversary, or custom label).
- **Shelf**: The list view of all Persons and Tasks across all Jars, with search, sort, and filters.
- **Freshness_Score**: The rounded percentage of Persons whose Decay_Stage is Fresh, Dull, or Spooky.
- **Streak**: The count of consecutive local days on which at least one contact was logged through Reached_Out.
- **AI_Endpoint**: The Cloudflare Worker with a Workers AI binding that serves the optional AI features.
- **Template_Fallback**: A fixed local text template used when AI is unavailable or the daily limit is reached.
---
## Requirements
### Requirement 1: Candy Kinds
**User Story:** As a user, I want to choose whether a new candy is a person or a task, so that I can use one jar for both relationships and to-dos.
#### Acceptance Criteria
1. THE App SHALL give every Candy exactly one Candy_Kind, either Person or Task.
2. THE Add form SHALL offer a switch with the options Person and Task, with an accessible name, and SHALL default it to Task.
3. WHILE the switch is set to Task, THE Add form and the resulting Candy SHALL behave exactly as in the base spec.
4. WHILE the switch is set to Person, THE Add form SHALL show the Person fields from Requirement 2 instead of the Task due-date field.
5. THE App SHALL NOT allow the Candy_Kind of an existing Candy to be changed in the Edit form.
6. WHEN a Person is added, THE App SHALL create a Candy with Decay_Stage Fresh in the chosen Jar, using the Lid_Animation of the base spec.
---
### Requirement 2: Person Fields and Validation
**User Story:** As a user, I want to store the details of a person, so that I have what I need to reach out to them.
#### Acceptance Criteria
1. THE App SHALL store for each Person: a name (required), phone, email, tags, notes, a Jar, a Rhythm, and zero or more Important_Date items.
2. IF the name is empty after trimming, THEN THE App SHALL show an inline validation message and SHALL NOT create or save the Person.
3. IF an email is given and is not in the form `local@domain.tld`, THEN THE App SHALL show an inline validation message and SHALL NOT save the Person.
4. THE App SHALL accept phone as free text and SHALL require at least one digit when the phone is not empty.
5. THE App SHALL accept tags as a list of short labels, compared without regard to letter case, with duplicates removed.
6. THE App SHALL accept a Rhythm only as a whole number N from 1 to 365 with a unit of days, weeks, or months, and SHALL reject any other value with an inline message.
7. WHEN a Jar is chosen for a new Person and no Rhythm has been entered, THE App SHALL prefill the Rhythm with the Jar default Rhythm.
8. THE App SHALL accept an Important_Date as a month, a day, and a label (birthday, home anniversary, or a custom label of up to 30 characters), and SHALL repeat it every year.
9. IF an Important_Date is February 29, THEN THE App SHALL show and trigger it on February 28 in years that are not leap years.
10. THE App SHALL provide an Edit form for a Person with the same fields pre-populated and the same validation, reached from the Context_Menu Edit action.
11. THE Add form and Edit form for Persons SHALL satisfy the base spec accessibility rules (labels, 44 px targets, focus trap where in a dialog).
---
### Requirement 3: Person Decay from Time Since Last Contact
**User Story:** As a user, I want a person to look more neglected the longer I stay silent, so that I see who needs me at a glance.
#### Acceptance Criteria
1. THE Decay_Function SHALL, for a Person, compute r as (logical now minus Last_Contact) divided by the Rhythm length, where Last_Contact is the added-at timestamp if no contact has been logged.
2. THE Decay_Function SHALL return Fresh when r < 0.5, Dull when 0.5 <= r < 0.8, Spooky when 0.8 <= r < 1.0, Haunted when 1.0 <= r <= 1.5, and Cursed when r > 1.5.
3. THE App SHALL use the existing logical clock, so that Haunt_Speed accelerates Person decay in the same way as Task decay.
4. THE Decay_Function SHALL be pure and SHALL NOT move a Person backward to an earlier Decay_Stage as logical time increases, until a contact is logged.
5. FOR ALL generated Persons and increasing logical times with no contact logged, the Decay_Stage SHALL NOT decrease (property test, at least 100 iterations).
6. FOR ALL generated Persons and times, the returned Decay_Stage SHALL match the thresholds in criterion 3.2, including the exact boundaries 0.5, 0.8, 1.0, and 1.5 (property test).
7. THE App SHALL update the Candy ARIA label with the new Decay_Stage when it changes, as in the base spec.
8. THE Decay_Function for Tasks SHALL stay unchanged.
---
### Requirement 4: Reached Out, Undo, and History
**User Story:** As a user, I want to record that I got in touch, so that the candy freshens up and I can look back at what happened.
#### Acceptance Criteria
1. WHEN the user completes the press-and-hold crack gesture (0.8 seconds) on a Person, THE App SHALL log a contact instead of completing the Candy.
2. THE Context_Menu for a Person SHALL offer Reached out in place of Complete, together with Focus, Edit, and Delete.
3. WHEN the user chooses Reached out or finishes the gesture, THE App SHALL ask for a contact type (call, text, email, other) and an optional note, with a default type of other, and SHALL allow confirming with one action.
4. WHEN a contact is logged, THE App SHALL add a Contact_Entry with the current time, set Last_Contact to that time, reset the Person to Fresh, keep the Person in its Jar, and set the next check-in to Last_Contact plus the Rhythm.
5. THE App SHALL NOT mark a Person complete or remove it when a contact is logged.
6. WHEN a contact is logged, THE App SHALL show a gentle friendly effect that does not shatter the Candy, and WHILE Motion_Preference is reduce, THE App SHALL use an opacity change of 150 ms at most.
7. WHEN a contact is logged, THE App SHALL show the Undo_Toast for 6 seconds, and WHEN the user undoes, THE App SHALL restore the Person state, Last_Contact, and History_Timeline exactly as before (property test on the reducer).
8. THE App SHALL show for each Person a History_Timeline, newest first, with type, date, and note for each Contact_Entry.
9. THE App SHALL let the user add a plain note to the History_Timeline, edit the note text of a Contact_Entry, and delete a Contact_Entry.
10. WHEN the newest logged contact is deleted, THE App SHALL set Last_Contact to the next newest logged contact, or to none, and SHALL recompute the Decay_Stage.
11. WHERE the Sound_Toggle is enabled, THE App SHALL play a short soft sound for a logged contact, generated via the Web Audio API.
12. WHEN a new Contact_Entry is added and the Person already has 50 Contact_Entry items, THE App SHALL drop the oldest Contact_Entry, and Last_Contact SHALL stay unchanged by the drop.
---
### Requirement 5: Daily Desk
**User Story:** As a user, I want the people who need me today to wait on my desk, so that I know whom to contact without hunting.
#### Acceptance Criteria
1. THE App SHALL send Due and Cursed Persons to the Desk, up to the Desk_Cap, ordered by highest r first, with ties broken by name in ascending order.
2. THE App SHALL keep Persons beyond the Desk_Cap in their Jar, showing their Decay_Stage.
3. THE App SHALL provide a Desk_Cap setting with default 5 and range 1 to 20, and SHALL reject values outside that range.
4. THE App SHALL send Cursed Tasks to the Desk up to a separate cap of 3, ordered by most overdue first, and Cursed Tasks SHALL NOT count toward the Desk_Cap.
5. THE App SHALL keep the base spec behavior that Candy items beyond the Jar capacity spill onto the Desk.
6. WHEN the local day equals the day of a Person Important_Date, THE App SHALL show a Celebration_Candy for that Person on the Desk for that local day.
7. THE Celebration_Candy SHALL have a shape and look clearly distinct from normal Candy items, SHALL show text or a shape cue in addition to color, and SHALL NOT count toward the Desk_Cap.
8. WHEN the user selects a Person on the Desk, THE Context_Menu SHALL offer Call, Text, Email, Not today, and Reached out.
9. THE App SHALL show Call only when the Person has a phone, Text only when the Person has a phone, and Email only when the Person has an email.
10. WHEN the user chooses Call, Text, or Email, THE App SHALL open a `tel:`, `sms:`, or `mailto:` link respectively.
11. THE App SHALL NOT log a contact when a device app is opened.
12. WHEN the user returns to the App after choosing Call, Text, or Email, THE App SHALL show a one-tap prompt "Log it?" that logs a contact of the matching type, and SHALL let the user dismiss it.
13. WHEN the user chooses Not today, THE App SHALL remove the Person from the Desk until the start of the next local day, return it to its Jar, and exclude it from the Person_Desk_Count and the Desk_Cap for the rest of that day.
14. WHEN the next local day starts, THE App SHALL clear all snoozes and recompute the Desk.
15. THE Desk Context_Menu SHALL satisfy the base spec focus trap and 44 px rules.
16. THE App SHALL keep Cursed Tasks beyond the cap of 3 in their Jar, showing the Cursed look.
17. THE Desk Cursed Task cap SHALL NOT reduce the number of Persons shown on the Desk.
18. WHEN Candy items qualify for the Desk beyond the spacing capacity of the Desk, THE App SHALL show a "+N more on the Shelf" chip, where N is the number of hidden Candy items, and WHEN the user activates the chip, THE App SHALL open the Shelf.
---
### Requirement 6: Multiple Jars
**User Story:** As a user, I want separate jars for clients, leads, friends, and to-dos, so that I can keep different parts of my life tidy.
#### Acceptance Criteria
1. THE App SHALL start with the default Jars Clients, Leads, Friends, and To-dos.
2. THE App SHALL give default Rhythms of 30 days for Clients, 14 days for Leads, 60 days for Friends, and none for To-dos, because Tasks use due date or age.
3. THE App SHALL allow the user to create a Jar with a name of 1 to 30 characters, and SHALL reject an empty name and a name equal to an existing Jar name, without regard to letter case.
4. THE App SHALL allow the user to rename a Jar and to change its default Rhythm.
5. THE App SHALL allow the user to delete a Jar only when it is empty, or after the user has moved its Candy items to another Jar.
6. THE App SHALL allow the user to reorder Jars with a keyboard-operable control and a pointer-operable control.
7. THE Jar_Switcher SHALL show exactly one Jar at a time, with the Jar name as an accessible name and the active Jar marked with aria-pressed or radio semantics.
8. THE Desk SHALL pull Persons and Cursed Tasks from all Jars.
9. THE App SHALL give each Jar a capacity of 40, with overflow spilling onto the Desk as in the base spec.
10. THE App SHALL place all existing Tasks in the To-dos Jar.
11. THE App SHALL let the user move a Candy to another Jar from the Edit form.
---
### Requirement 7: Shelf and Search
**User Story:** As a user, I want to find any person or task quickly, so that I never dig through jars.
#### Acceptance Criteria
1. THE Shelf SHALL list all Persons and Tasks across all Jars.
2. THE Shelf search SHALL match case-insensitively against name or title, tags, notes, email, and phone.
3. THE Shelf SHALL offer sort by most overdue (highest r first), by name, and by next check-in, ascending.
4. THE Shelf SHALL offer filters by Jar, tag, and Candy_Kind, and filters SHALL combine with search.
5. THE Shelf SHALL be operable by keyboard and expose its rows to screen readers with the name, Candy_Kind, Jar, and Decay_Stage.
6. THE Shelf SHALL satisfy the accessible list view requirement of the base spec.
7. WHEN the user types a search on the Jar view, THE App SHALL highlight matching Candy items with a non-color cue (an outline or a badge) and SHALL dim the others.
8. WHEN the search is cleared, THE App SHALL remove all highlight and dimming.
9. IF a search matches nothing, THEN THE App SHALL show a short friendly empty message.
10. THE Shelf SHALL replace the existing ListView and SHALL reuse the ListView rows.
---
### Requirement 8: Optional AI Helpers
**User Story:** As a user, I want optional help to import contacts and write messages, so that I save typing but stay in control.
#### Acceptance Criteria
1. THE App SHALL call the AI_Endpoint only when the user taps an AI action, and SHALL NOT call it in the background.
2. THE AI_Endpoint SHALL be a Cloudflare Worker with a Workers AI binding, and the repository SHALL NOT contain any API key or secret.
3. THE AI_Endpoint SHALL enforce a daily rate limit per client.
4. IF AI is unavailable or the daily limit is reached, THEN THE App SHALL use a Template_Fallback and tell the user in one short sentence.
5. WHEN the user imports contacts from a screenshot or pasted text, THE App SHALL show a preview table with editable fields and per-row include checkboxes, and SHALL save nothing until the user confirms.
6. THE preview table SHALL apply the validation of Requirement 2 to each row and SHALL block confirming rows that are invalid.
7. WHEN the user asks for a personal draft for a Person, THE App SHALL send only that Person name, notes, and recent history entries, and SHALL show an editable text or email draft.
8. WHEN the user asks for a group message for a Jar or a tag, THE App SHALL show an editable draft and open the email app with all recipients in BCC.
9. IF the BCC `mailto:` link would exceed a safe length, THEN THE App SHALL split the recipients into batches or offer a copy action.
10. THE App SHALL NOT send any message automatically, and the user SHALL always review and send from the device app.
11. THE App SHALL show a loading state and a clear error state for each AI action, and each AI action SHALL be cancellable.
12. THE AI_Endpoint SHALL use Workers AI models chosen at build time from the current Cloudflare documentation.
---
### Requirement 9: Sample Jar and First Visit
**User Story:** As a first-time visitor, I want to see a lively sample jar, so that I understand the app in seconds.
#### Acceptance Criteria
1. WHEN the App starts with no saved data, THE App SHALL seed a sample jar with fictional Persons, using clearly fictional names, `example.com` emails, and `555` phone numbers.
2. THE sample Persons SHALL cover every Decay_Stage and include at least one Important_Date.
3. THE App SHALL label sample Persons as samples in the UI.
4. THE App SHALL offer a "Start my own jar" action that removes all samples and keeps any data the user added.
5. THE App SHALL coordinate with the existing first-visit intro, so that the intro guide is shown once and mentions the sample jar.
6. THE App SHALL NOT call the AI_Endpoint for samples.
---
### Requirement 10: Freshness Score and Streak
**User Story:** As a user, I want a simple score and a streak, so that keeping in touch feels like a game.
#### Acceptance Criteria
1. THE App SHALL show a Freshness_Score as text such as "Your network is 82% fresh".
2. THE Freshness_Score SHALL equal the number of Persons that are Fresh, Dull, or Spooky divided by the number of Persons, times 100, rounded to a whole number.
3. IF there are no Persons, THEN THE App SHALL hide the Freshness_Score.
4. THE App SHALL count a local day toward the Streak only when at least one contact is logged through Reached_Out on that day.
5. THE App SHALL show the current Streak and the best Streak.
6. THE App SHALL NOT count a Snooze toward the Streak.
7. IF a local day passes with no logged contact, THEN THE App SHALL reset the current Streak to 0 and keep the best Streak.
8. IF no Person exists on a local day, THEN THE App SHALL leave the Streak unchanged for that day.
9. THE Freshness_Score and Streak SHALL be readable by screen readers and SHALL NOT rely on color alone.
---
### Requirement 11: App Icon Badge
**User Story:** As a user, I want the app icon to show how many people wait for me, so that I notice without opening the app.
#### Acceptance Criteria
1. WHERE the Badging API is supported, THE App SHALL set the app badge to the Person_Desk_Count.
2. WHEN the Person_Desk_Count is zero, THE App SHALL clear the badge.
3. WHERE the Badging API is not supported, THE App SHALL skip badging silently, with no error and no message.
4. THE App SHALL NOT request notification permission only to show the badge, even though iOS may require that permission for badges.
5. THE App SHALL update the badge whenever the Person_Desk_Count changes while the App is open.
---
### Requirement 12: Local-First Privacy
**User Story:** As a user, I want my contacts to stay on my device, so that I can trust the app with them.
#### Acceptance Criteria
1. THE App SHALL keep all Person, Jar, and history data in browser storage on the device, with no account and no sign-in.
2. THE App SHALL make network calls only when the user taps an AI action, and SHALL send only the fields needed for that action.
3. THE AI_Endpoint SHALL NOT store or log contact content.
4. THE export SHALL include Persons, Jars, settings that affect the Desk, and history, and THE import SHALL restore them.
5. THE import SHALL validate data with the schema and SHALL reject invalid files with a clear message, leaving existing data untouched.
6. THE App SHALL offer a "Delete all my data" action with a confirmation step, which removes all Persons, Tasks, Jars, history, settings, and samples from storage.
7. THE App SHALL still work fully offline for all non-AI features after the first load.
8. THE App SHALL store Person, Jar, history, and setting data in localStorage under keys with the `hcj_` prefix.
9. THE App SHALL keep at most the 50 newest Contact_Entry items per Person in storage.
---
### Requirement 13: Copy and Accessibility
**User Story:** As a user, I want the new features to feel as polished and accessible as the rest of the app.
#### Acceptance Criteria
1. THE App SHALL update the intro guide cards and the How it works panel to explain Persons, the Desk, Reached out, Jars, and the Shelf.
2. THE new copy SHALL be short, playful, and spooky-cute, never gory, and SHALL contain no em dashes.
3. THE App SHALL give every new interactive element an accessible name and a hit area of at least 44 by 44 CSS pixels.
4. THE App SHALL trap keyboard focus in every new dialog, menu, and bottom sheet while open.
5. WHILE Motion_Preference is reduce, THE App SHALL replace all new movement with an instant change or an opacity fade of 150 ms at most.
6. THE App SHALL NOT use color as the only indicator of state in any new UI.
7. THE App SHALL expose changes to the Freshness_Score, Streak, and desk count to screen readers through a polite live region that updates at most once per minute.
---
### Requirement 14: Data Migration
**User Story:** As an existing user, I want my saved tasks to keep working, so that nothing is lost by the upgrade.
#### Acceptance Criteria
1. WHEN the App loads data saved by the base spec, THE App SHALL load every saved Task unchanged as a Task Candy in the To-dos Jar.
2. THE App SHALL still import exports made by the base spec.
3. THE App SHALL lose no field and no record during migration.
4. IF migration fails, THEN THE App SHALL leave the original stored data untouched, show a non-blocking warning, and start with the original data read-only or in memory.
5. THE App SHALL write migrated data under a schema version marker, and SHALL NOT overwrite the original data before a migration has fully succeeded.
6. FOR ALL valid base spec data sets, migrating and then reading the Tasks SHALL equal the original Tasks (property test).
---
## Steering updates needed
These updates are applied together with this spec.

This spec conflicts with the current steering files. These must change before implementation:
- `.kiro/steering/tech.md`:
  - "No external dependencies at runtime" and "no calls to any external API" become: no calls except to the AI_Endpoint, and only when the user taps an AI action.
  - "No server" and "static-only deployment" become: a static bundle plus one Cloudflare Worker with a Workers AI binding, used for AI features only. The Worker holds no stored contact content and no secrets in the repository.
  - "localStorage only under `hcj_tasks`" must allow new keys (jars, persons, history, settings) with the `hcj_` prefix. Storage stays in localStorage (see Decisions).
  - Add the Workers AI model choice, the Wrangler config, and the rate limit store to the stack list.
- `.kiro/steering/product.md`: redefine the product as a spooky to-do and relationship jar ("contacts that never go stale"), add Persons, the Desk, and Jars to the core experience, and update the audience.
- `.kiro/steering/structure.md`: add feature folders for persons, jars, shelf, desk, and ai, and a `worker/` directory.
- `.kiro/steering/style.md`: add the new pure files (person decay, desk selection, migration) to the pure logic list with property tests.
## Decisions
1. Streak: a day counts only when at least one real Reached out (logged contact) happens that local day. A Snooze alone does not count (Requirement 10).
2. Cursed Tasks on the Desk are capped at 3 (most overdue first), separate from the Desk_Cap, so Persons are never crowded out. Cursed Tasks beyond 3 stay in their Jar showing the Cursed look (Requirement 5).
3. Desk crowding: Candy items beyond the Desk spacing capacity are summarized by a "+N more on the Shelf" chip (Requirement 5).
4. Storage: stay in localStorage. Keep the 50 newest history entries per Person, and drop older entries when a new one is added. Last_Contact is unaffected by the drop (Requirements 4 and 12).
5. The Shelf replaces the existing ListView and reuses its rows (Requirement 7).
6. Workers AI models are chosen at build time from the current Cloudflare documentation (Requirement 8).
## What's next (out of scope)
- Shared jar link.
- Seasonal themes.
- Automatic personalized email sending.
- Candy Jar MCP server.
- Move storage to IndexedDB for longer histories.
