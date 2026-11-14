# Real Telemetry · Plan

What we do, step by step, until we submit. Like building a house: each step stands on the one before, so a step is finished before the next one starts.

- What we are building and why: [system_design.md](system_design.md).
- How it is built: [mvp_architecture.md](mvp_architecture.md). The order of the steps is its build order (section 6).
- What decides whether we win: [how_to_win_nasa_space_apps.md](how_to_win_nasa_space_apps.md).
- How we use branches: [branches.md](branches.md).

Tick a task when its "done when" check passes. Each task names the requirement (R) it covers. Inside a step, each team does its tasks from top to bottom.

| Step | What | Like in a house |
| :-- | :-- | :-- |
| 0 | The base runs | Foundations. Done |
| 1 | The database | The ground floor everything stands on |
| 2 | One complete day | The first room, finished |
| 3 | The full panel | The other rooms |
| 4 | Open to the jury | The front door |
| 5 | Show it | Showing the house |

## Teams

| Team | People | Folders | Branch |
| :-- | :-- | :-- | :-- |
| Backend, data and AI | Adolfo, Ivan | `services/api`, `database` | `feat/backend` |
| Design, frontend, web and app | Becky, Alex | `apps` | `feat/frontend` |
| Medical review of the rules | Àngels |  |  |
| Pitch and submission |  |  |  |

- The contracts in the MVP architecture, section 3, are the line between the two teams. They say exactly what the backend returns, so the frontend can build a screen before its endpoint exists.
- A change to a contract is agreed by both teams first.
- Inside a team, say which task you take before you start.

## Step 0 · The base runs (done)

- [x] Database and seed script, with one crew member (Crew 1).
- [x] Two indicators: blood glucose with its rule, and heart rate.
- [x] Backend: crew, panel and indicator history. Its tests pass.
- [x] Frontend: profile picker, panel and indicator detail. The detail shows how to measure, why it matters, the rule, what to do and the source.
- [x] Every dataset of the data document is in `database/datasets`, so nobody downloads anything.

## Step 1 · The database

Backend:

- [x] **D2. Move the database from SQLite to Postgres** (R7, R8). Same five tables and same contracts. Postgres runs in Docker on a laptop, and the same `.sql` files build the deployed one. How to run it is in the README and in `database/postgresql`.
    - Done when: the backend tests pass against Postgres, the panel of Crew 1 shows the same values as before, the README says how to run Postgres on a laptop, and the MVP architecture and the System_design, section 5, say Postgres.

Frontend:

- [ ] **F3. Look of the app** (R1, R10): name, style and alert colours. It needs nothing from the backend, so it runs alongside D2.
    - Done when: someone outside the team can tell at a glance which indicator has an alert.

Step 1 is done when: on `main`, the app runs on Postgres and looks like ours.

## Step 2 · One complete day

One astronaut opens the app, checks in and sees an alert.

Backend:

- [x] **B1. Check-in and mood readings** (R2, R3). The `PUT` check-in endpoint, and the six mood indicators loaded from LifeSnaps.
    - Done when: saving a check-in for 2021-11-02 returns what was saved, and the panel for that day shows it.

Frontend:

- [ ] **F2. Check-in screen** (R2, R3). Six moods, more than one allowed, shown as one card on the panel. The app asks for it when today's is missing. A streak counts the days in a row. It can be built against the contract before B1 is done.
    - Done when: a check-in made on the tablet is still there after reloading.

Both teams:

- [x] **P3.** Local jury: a 3-minute pitch, at 16:00. They nominate 3 teams.
- [ ] **P4.** Start the list of AI tools and outside resources, and keep it up to date. The form asks for it.

Step 2 is done when: on `main`, Crew 1 checks in for 2021-11-02 and sees the glucose alert.

## Step 3 · The full panel

Every MVP indicator, the four crew members and the rest of the rules.

Backend:

- [x] **B3. The other MVP indicators** (R1): resting heart rate, sleep duration, sleep efficiency, skin temperature, very active minutes, steps.
    - Done when: the panel returns all of them for Crew 1 on the demo date.
- [x] **B5. The other three crew members.** Each one's dates are shifted so their data lands on the demo date, 2021-11-02.
    - Done when: the profile picker shows four crew members and each has a full panel on the demo date.
- [x] **B4. Sleep and resting heart rate rules** (R10). The limits are already decided (MVP architecture, section 5).
    - Done when: a night under 7 hours shows the alert with its explanation and what to do.
- [x] **B2. Mood rule** (R10). The rule at the end of this document.
    - Done when: the crew member with the tense fortnight shows the alert on the demo date, and Crew 1 does not.
- [ ] **B6. Panel order** by the priority rule (System_design, section 7): mood, glucose, heart rate, exercise, sleep, temperature.
    - Done when: the panel returns them in that order.

Frontend:

- [ ] **F5. History charts** (R7): readable on a tablet, with the limits of the rule drawn.
    - Done when: the glucose chart shows the 36 mg/dL reading below the line.
- [ ] **F4. Mood alert on the mood card** (R10). It needs B2. The backend sends the mood rule as two extra indicators. They are shown inside the mood card, not as cards of their own.
    - Done when: the tense alert of B2 shows on the mood card with what to do.
- [ ] **F1. CPR flow** (R9). The last MVP task: the panel comes first, because it has to work really well before we add anything else (System_design, section 2). It follows the ISS procedure, with one image per step and the timers.
    - Done when: one tap from the panel opens it, and it can be followed to the last step with the network off.

Both teams:

- [ ] **D1. Public repo with a README.**
    - Done when: the repo opens in a private window and the README has the steps to run it.
- [ ] **P5.** Pick one global award category: Best Use of Science, Best Use of Technology or Best Mission Concept.
- [ ] **P6.** Write the opening sentence: user, problem and result.
- [ ] **P7.** First draft of the project page, in English, submitted.

Step 3 is done when: on `main`, the four crew members each have a full panel on the demo date, the CPR flow can be followed to the end, and the draft page is submitted.

## Step 4 · Open to the jury

The jury opens the app from a link and uses it as if they were the astronauts (How to win, section 1).

Backend:

- [ ] **D3. Backend and Postgres on Railway.** Create the account, a service from the repo with `services/api` as its folder, and a Postgres database next to it. `database/postgresql/scripts/apply.sh` runs once against it to create the tables and load the seeds.
    - Done when: `/api/crew` answers from the Railway address, and a check-in is still there after a restart.

Frontend:

- [ ] **D4. Frontend on Vercel.** It needs D3. Create the account and a project from the repo, with `apps/web` as its folder. A rewrite sends `/api` to the Railway address, so the frontend code does not change.
    - Done when: the Vercel link shows the panel of Crew 1 with its glucose alert.
- [ ] **D5. The app link** goes first in the README and on the project page, before the repo link.
    - Done when: someone outside the team opens it on a phone in a private window and reaches the panel.

Both teams:

- [ ] **P8.** Demo script: a normal day, then the glucose alert of Crew 1 (36 mg/dL), then the CPR flow.
- [ ] **P9.** Pitch of 3 minutes with the five pain points (System_design, section 7) and the five judging criteria. It ends with next steps: what we built first and what we left for later.
- [ ] **P10.** Architecture slide: the target architecture with what is built marked (System_design, section 5).

Step 4 is done when: the app link works from a phone outside our network.

## Step 5 · Show it

From here on nobody adds features. We only fix what is broken. Both teams, in this order:

- [ ] **P11.** Record the video: 30 seconds at most, with English subtitles. Going over makes us ineligible.
- [ ] **P12.** Record a backup of the full demo.
- [ ] **P13.** Rehearse the pitch twice before the local jury. Everyone can explain what they built.
- [ ] **P14.** Final project page: text, screenshots, the app link, the repo link, NASA data used, other data and resources, AI use.
- [ ] **P15.** Test every link in a private window.
- [ ] **P16.** Submit. Submissions close on Sunday 15 at 23:59, and a submission is final.

## After the MVP

These wait until every task above is ticked. They are the planned parts of the target architecture (System_design, section 5).

- [ ] **Onboard AI.** The emergency assistant, E1 to E6.
- [ ] **Link to the ground.** The queue of messages to Earth and what the flight surgeon sees.
- [ ] **Two profile types: commander and crew member.** It adds a `role` to `crew_member` and to `GET /api/crew`, and a commander screen. Decide first what the commander sees (System_design, section 2, Not decided yet).
- [ ] **Mobile app** (`apps/mobile`).
- [ ] The other stretch goals, in the order of the System_design, section 2.

## Mood rule (built, to confirm with Àngels)

Built in B2 as proposed here. Àngels still has to confirm the rule and its texts.

- **The rule.** Warn when "Sad" was chosen on more than half of the last 14 days, that is, 8 or more. The same for "Tense or anxious". They are two separate rules.
- **Where it comes from.** PHQ-2 (depression) and GAD-2 (anxiety) are the standard short screening questionnaires. Both ask how often something happened over the last 2 weeks, and "more than half the days" is the answer that starts to count towards a positive result. ASTRA-HEALTH already names their long versions, PHQ-9 and GAD-7.
- **Why 14 days also fits NASA.** NASA schedules a private psychological conference every 14 days in flight (data document, Reference values from NASA), so the count covers the time since the last one.
- **Its limit.** Each questionnaire has two questions and our moods cover one of each. So this is an adaptation, not a validated screening. It asks for a conversation and never gives a diagnosis.
- **What it tells the astronaut to do.** Bring it up in the next private psychological conference, which NASA already provides in flight (OCHMO-TB-016). This matches the ASTRA-HEALTH response: confidential assessment, no automatic diagnosis.
- **Checked against our data** (the four suggested crew members in LifeSnaps):
    - Tense: it fires for one of them (`621e2fce67b776a240279baa`), with 13 tense days out of 14 up to 2021-06-23. A shift of 132 days puts that day on the demo date.
    - Tense: it does not fire for Crew 1, whose worst fortnight has 7 of 14, exactly half.
    - Sad: it never fires. The worst fortnight has 4 of 14.
- **How to build it without changing the data model.** Two new indicators, `mood_sad_days_14` and `mood_tense_days_14`, each holding how many of the last 14 days had that mood. Each gets a normal rule with `high = 7`. The seed script computes them for the dataset days and the check-in recomputes the one for that day. A day with no check-in counts as not chosen.

Sources:

- PHQ-2: Kroenke, Spitzer and Williams, Medical Care, 2003. <https://www.hiv.uw.edu/page/mental-health-screening/phq-2>
- GAD-2: Kroenke et al., Annals of Internal Medicine, 2007. <https://pubmed.ncbi.nlm.nih.gov/17339617/>
- NASA OCHMO-TB-016, Behavioral Health and Performance, 2023. <https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-016-behavioral-health.pdf>

For the pitch: the same NASA brief says that missions beyond 6 months or beyond low Earth orbit should have "additional minimally obtrusive measures" of psychological state. A daily mood check-in is one.
