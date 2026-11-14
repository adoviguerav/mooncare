# Real Telemetry · Plan

What is left until we submit, in order of priority, and the backlog of what is done.

- What we are building and why: [system_design.md](system_design.md).
- How it is built: [mvp_architecture.md](mvp_architecture.md).
- What decides whether we win: [how_to_win_nasa_space_apps.md](how_to_win_nasa_space_apps.md).
- How we use branches: [branches.md](branches.md).

Reorganised on 15 Nov. All the product code is on `main` and deployed. Sunday 15 is for showing it: submissions close at 23:59 and a submission is final. Nobody adds features; we only fix what is broken.

This plan has two parts: what is left, in order of priority, and at the end the backlog of what is done.

## Sunday 15 Nov · what is left, in order of priority

| Priority | What | Why it comes here |
| :-- | :-- | :-- |
| 1 | Submit: pitch, video, project page | Without it nothing else counts |
| 2 | The demo runs on the live link | The jury opens the link, not our laptop |
| 3 | The landing online | The form asks for links, and it is our letter of introduction |
| 4 | The ground receives the report | Only if the first three are done. It closes the story of the demo |
| Not for Sunday | Commander view, assistant on board, solar flare | They go in the pitch as next steps |

### Priority 1 · Submit

In this order:

- [ ] **P5.** Pick one global award category: Best Use of Science, Best Use of Technology or Best Mission Concept.
- [ ] **P6.** Write the opening sentence: user, problem and result.
- [ ] **P8.** Demo script: a normal day, then the glucose alert, then the possible infection closed with the voice guide and the report that waits for the link.
- [ ] **P9.** Pitch of 3 minutes with the five pain points (System_design, section 7) and the five judging criteria. It ends with next steps: what we built first and what we left for later.
- [ ] **P10.** Architecture slide: the target architecture with what is built marked (System_design, section 5).
- [ ] **P11.** Record the video: 30 seconds at most, with English subtitles. Going over makes us ineligible.
- [ ] **P12.** Record a backup of the full demo.
- [ ] **P13.** Rehearse the pitch twice. Everyone can explain what they built.
- [ ] **P4.** List of AI tools and outside resources. The form asks for it.
- [ ] **P14.** Project page, in English: text, screenshots, the app link, the repo link, NASA data used, other data and resources, AI use.
- [ ] **P15.** Test every link in a private window.
- [ ] **P16.** Submit. Submissions close on Sunday 15 at 23:59, and a submission is final.

### Priority 2 · The demo runs on the live link

The app is at https://mooncare-ten.vercel.app and the backend at https://mooncare-73hi.onrender.com.

- [ ] **E6. The voice guide works on the live link.**
    - Put `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` in the environment of the server on Render. Without them the guide works in silence.
    - Set a daily limit of calls on the agent in ElevenLabs. Our own limit is 30 sessions an hour for each caller.
    - Allow the microphone on the browser of the demo, and wake Render up before showing it.
    - Done when: on the live link, the infection case can be followed by voice from the alert to the report sent.
- [ ] **V1. Look at the whole app on the live link**, on a laptop and on a phone: the first screen, the panel, one indicator, the infection case. The new look and the animations went up on 15 Nov without being seen on a screen by whoever wrote them.
    - Done when: nothing is unreadable or broken on either size.

### Priority 3 · The landing online

Decided on 14 Nov: two deploys. The app stays on Vercel, from `apps/web`. The landing goes on Netlify, from `apps/landing`, with a button that opens the app.

- [ ] **L1. The landing on Netlify.** A site from the repo with `apps/landing` as its folder and no build step. Its main button opens https://mooncare-ten.vercel.app.
    - Done when: the Netlify link shows the landing and its button opens the app.
- [ ] **L2. Content**, starting from Becky's landing:
    - Problem and solution.
    - What the app does.
    - Architecture: the real one, with Postgres on board, and the one of the demo, on Render and Vercel.
    - The team.
    - Datasets and who provides them.
    - How we used AI.
    - Next steps: the link to the ground and the emergency scenarios of milestone 4 that we did not build.
- [ ] **L3. Languages.** English and Spanish, with a switch. Any other language is not decided.
- [ ] **L4. Our own domain.** GoDaddy gives every Space Apps participant a free domain and a year of hosting (Global Offers, message of the GO Team at the kick-off). Claim one and point it to the landing on Netlify, once the landing is up. The app keeps its Vercel address, or gets a subdomain such as `app.`. It is an outside resource, so it goes on the list of P4.
    - Done when: the domain opens the landing in a private window.

### Priority 4 · The ground receives the report

Only if priorities 1 to 3 are done.

- [ ] **G3. Flight surgeon screen.** It needs N1. The four crew members, who has an alert and when their last data arrived. A tap opens that crew member's full panel. The link switch, "Link with Earth: on or off", is on this screen.
    - Done when: with the link off, the screen says since when it has no data, and the crew app works as before.

What was decided for the link to the ground on 14 Nov:

    - The flight surgeon sees the full panel of each crew member: indicators, history and alerts. They are the crew's doctor, as on the ISS. Privacy between crewmates on board does not change.
    - One way only, ship to ground. The ground looks and does not answer.
    - The lost link is shown with a switch, "Link with Earth: on or off". One backend and one database, not two.

### In parallel · Study notes

Runs in its own session and branch, away from the priorities above. It goes to `main` only if it is done and seen before the submission.

- [ ] **K1. Learn more about a parameter.** A folded block of study notes, with drawings and sources, on the page of the seven parameters of the infection alert. The spec is in [learn_more.md](learn_more.md). Frontend only.
    - Done when: the seven parameters show their notes, the tests pass and the page was seen on a phone and on a laptop.

### Not for Sunday

- [ ] **C1. Commander view.** Decided on 14 Nov: the commander has a button that opens what each of the other crew members sees, read only. No check-in and no changes from there. It changes one line of the System_design, section 6: health data is private day to day, except for the commander.
    - Done when: Crew 1 opens the panel of Crew 2 and cannot save a check-in for them. Crew 2 has no such button.
- [ ] **A1. Assistant on board, for the crew member** (next step, not for this hackathon). A local model the astronaut can ask about their own panel: what a value is, why an alert came, what the rule says. It answers only from the record of that indicator and from that person's readings, and says where each answer comes from. It is for the astronaut looking at their data, not for the medical officer during an emergency: there the steps are fixed and come from the manual.

- [ ] **R1. Radiation module: solar flare alert.** Idea from Becky's prototype (`apps/landing/index.html`, the Alerts page): when a solar flare is on its way, the panel shows how far it is, a countdown and the steps to take shelter, different in the base, in the rover and in transit. We have no data for it: the RadLab dose rate shows no spike for the storm of 28 Oct 2021, and there is no public dose rate that triggers an action. It would be a simulated event, and the screen must say so.
    - Done when: a simulated flare opens the alert with its countdown and its steps, labelled as a simulation.

## Teams

| Team | People | Folders |
| :-- | :-- | :-- |
| Backend, data and frontend of the app | Adolfo | `services/api`, `database`, `apps/web` |
| Link to the ground | Ivan | `services/api`, `database` |
| Design and landing | Becky | `apps/landing` |
| Medical review of the rules | Àngels |  |

- Alex left on 14 Nov. His landing is in `apps/landing/moon-care-landing.html`.
- Everybody works on `main` or merges into it often. Say which task you take before you start.
- The contracts in the MVP architecture, section 3, are not changed without telling the others.

## The case without Earth · what was decided

The demo is the base platform plus one case closed on board with no link to Earth. That is the main pain point (System_design, section 1, number 2).

- **14 Nov:** chest pain, then collapse, then CPR, as in the challenge video. Built with NASA's ISS emergency manual (1.102 AED ASSISTED CPR).
- **15 Nov:** changed to a possible infection. Why: a cardiac arrest has never happened in flight and an infection has (Apollo 13, Salyut 7), and our data covers it from the watch and from the blood tests at once. The cardiac procedure stays loaded, out of the demo.
- **The procedure** is BLADDER/KIDNEY INFECTION of the public ISS Medical Checklist (JSC-48522-E4, 2001), word for word.
- **Why it shows the pain point.** The checklist tells the crew to contact the Surgeon before treating, and has its own rule for Loss of Signal. Without a link, the tablet and its voice are what guide.
- **Invented data is labelled.** The readings of the alert are simulated on top of the crew member's real usual values, and the screen says which is which.

Looked at and left for the landing and the pitch, as next steps:

| Scenario | Why not now |
| :-- | :-- |
| Kidney stone and early sepsis | NASA's worst case for the transit to Mars (HRP-48044), and the ISS checklist has its procedures. None of our data sets it off. The infection that can lead to them is the demo (E5) |
| Cardiac arrest | Built first and still loaded. It has never happened in flight |
| Low potassium and arrhythmia | Real data sets it off: Crew 1 has 3.0 mmol/L the day after landing, and Apollo 15 had arrhythmias blamed on low potassium. It is mild, a caution more than an emergency |
| Radiation storm | It happens, and today the warning comes from the ground. No public limit in our units, the RadLab data shows no storm, and no public procedure |
| Low glucose | Real NASA data sets off the alert. No case in flight, and the three low values come from the same blood draw, so they may be a sample problem. |

## Mood rule

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

## Backlog · done

Everything below is built, on `main` and deployed.

## Milestone 0 · The platform works with real data (done)

- [x] Database on Postgres, built from `.sql` files, the same on a laptop and deployed (D2).
- [x] Backend: crew, panel, indicator history and check-in. 56 tests pass.
- [x] Four crew members, each an Inspiration4 astronaut paired with a LifeSnaps volunteer, with a full panel on the demo date, 2021-11-02 (B5).
- [x] Eight measured indicators and the six moods of the check-in (B1, B3).
- [x] Five rules with their source: glucose, resting heart rate, sleep and the two mood ones (B4, B2).
- [x] Each crew member has a role. Crew 1 is the commander.
- [x] Frontend in `apps/web`: profile picker, panel with the alerts first, check-in and indicator detail. Its look is provisional.
- [x] Local jury pitch (P3).

## Milestone 1 · The app is online (done)

One link opens the real app. It is the link we give the jury (How to win, section 1).

- [x] **D3a. Backend and Postgres on Render**, at https://mooncare-73hi.onrender.com. The data is loaded and `/api/crew` answers. The free service sleeps after 15 minutes without use, so the first visit takes about a minute.
- [x] **D4. Frontend on Vercel**, at https://mooncare-ten.vercel.app. One project from the repo with `apps/web` as its folder. `apps/web/vercel.json` sends `/api` to Render.
    - Done when: the Vercel link shows the panel of Crew 1 with its glucose alert.
- [x] **D3b. A check-in is stored.** A check-in saved from the Vercel link was read back from the Render database, and then deleted to leave the demo clean. The restart of the backend was not tried: the data lives in the database, not in the backend.
- [x] **D5. The app link** goes first in the README, before the repo link. It goes first on the project page too, which is P14.
    - Checked on 14 Nov: the link opened at phone size in a new browser session reaches the panel of Crew 1. While the backend wakes up, the first screen says it is loading.

Done when: the link works from a phone outside our network.

## Milestone 2 · The platform, finished (done)

Everything the data document has data for is loaded and shown, in an app that looks like ours. Decided on 14 Nov: this comes before the emergency flow.

Data and backend:

- [x] **N1. Merge the link to the ground of Ivan** (G1, G2). Merged on 14 Nov. The same backend runs as the moon server or the earth server (`NODE_ROLE`), each with its own database, and the moon sends its readings to earth when asked (`POST /api/sync`). With no earth server set, the app works as before. How it works: [moon_earth_sync.md](moon_earth_sync.md).
    - Done when: the tests pass on `main` and the Vercel link still shows the panel of Crew 1.
- [x] **N2. Blood analytes of the Inspiration4 metabolic panel** (data document, Table 2): sodium, potassium, chloride, creatinine, urea, eGFR, albumin and calcium. Each one gets a rule with the normal range the NASA file gives for it, like glucose. For creatinine and calcium the file gives a different range by astronaut and draw, so the rule takes the widest: 0.5 to 1.35 mg/dL and 8.6 to 10.4 mg/dL. The file gives eGFR twice, by race; we load the lower one.
    - Done when: the panel of Crew 1 on 2021-09-19 shows the potassium alert (3.0 mmol/L, range 3.5 to 5.3).
- [x] **N3. The other Inspiration4 blood files** (Table 2): white cells, lymphocytes and haemoglobin; IL-6, TNF-α, IL-1β and IFN-γ; CRP and fibrinogen. The blood count file does give normal ranges, so its three get a rule (haemoglobin takes the widest of its two ranges, 11.7 to 17.1 g/dL). The other six have no range and no rule. CRP is stored in mg/L.
    - Done when: each one has its card and its history for the four crew members.
- [x] **N4. The other LifeSnaps indicators** (Table 2): SpO2, breathing rate, heart rate variability, stress score, fatigue, time awake during the night, VO2 max and the anxiety and affect questionnaires (STAI, PANAS). Shown with no rule, except VO2 max. Fatigue is a seventh mood of the check-in, Tired. A stress score or a breathing rate of 0 is a day the watch could not work one out and is not loaded. The sleep stage ratios are left out: the file does not say what they are a ratio of.
    - Done when: each one has its card and its history for the four crew members.
- [x] **N5. VO2 max rule.** The first rule with a NASA limit: in-mission VO2 max at or above 32.9 mL/kg/min (NASA-STD-3001, V1 4001). The data is the watch's estimate (data document, Reference values from NASA). None of the four crew members is under the limit (their lowest value is 41.7), so the alert does not fire with this data.
    - Done when: a crew member under the limit shows the alert with its source.
- [x] **N6. Radiation dose** (Table 2), from the RadLab dosimeters of the ISS. It is a reading of the ship, not of a person: each day's mean dose rate, from the Lidal detector (the one that reports every 5 minutes on nearly every day), is stored as a reading of every crew member, so the data model does not change. No rule: there is no public limit for a dose rate.
    - Done when: the panel shows the dose rate of the ship and its history.

Frontend:

- [x] **F3. Look of the app.** The design of Becky's prototype (`apps/landing/index.html`) in the real app: theme, cards, icons, bottom bar and the Moon Care logo. Two rules for what goes in: Done on 14 Nov: night theme, glass cards, icons, Moon Care logo and a bottom bar with Today, Data and Alerts. Left out because we have no data for them: XP and levels, the Dr. Nova AI message, blood pressure, the body map, the solar flare alert and the task list. The crew now has names, two women and two men: Eva Lindqvist (commander), Mateo Vargas, Amara Okafor and Liam Novak, in the order of Crew 1 to Crew 4.
    - What we have data for is shown with the real data. No invented value stays.
    - What we have no dataset for, but the crew can record on the tablet, goes in as something to record. It starts empty.
    - Done when: someone outside the team can tell at a glance which indicator has an alert, and no screen shows an invented value.
- [x] **F6. Order of the panel.** With about 40 indicators, the panel needs its groups and its order thought again. Done: Today shows the check-in, one line for the alerts and six daily vitals with their last two weeks. Data has ten groups, closed unless one of their values is out of range, each with where its data comes from.
    - Done when: the alerts are first and any indicator is found in two taps.
- [x] **F5. History charts** with the limits of the rule drawn, readable on a tablet.
    - Done when: the glucose chart shows the 36 mg/dL reading below the line.
- [x] **F4. Mood alert inside the mood card**, not as a card of its own.
    - Done when: the tense alert of Crew 2 shows on the mood card with what to do.
- [x] **F2. Streak of check-ins**: the days in a row with a check-in, on the mood card.
    - Done when: a check-in today adds one to the streak and it is still there after reloading.

## Milestone 4 · One case closed without Earth (done)

The spec is in [emergency_guide.md](emergency_guide.md).

- [x] **E1. Guided emergency, as a state machine with voice.** The spec is in [emergency_guide.md](emergency_guide.md). Built on 14 Nov, after a mentor's advice: on a deep space mission there is a doctor on board, and the link is what sets us apart. The scene is the transit to Mars. A "Simulate a cardiac event" button starts it for Liam Novak. The commander (Eva Lindqvist) and the medical officer (Amara Okafor, a new role) get a red alert on the whole screen. The medical officer is guided block by block through the procedure: the voice reads each step, a timer runs where the manual gives a time, and a tap or a spoken answer picks the next block. The commander sees which block the medical officer is on, and the task the manual gives the second rescuer. The patient sees that help is coming.
    - What is simulated, and the screen says so: the event and its detection. A model that detects it from in-flight heart data is not built, because there is no open dataset to train it.
    - The emergency lives in the browser, so the profiles must be opened on the same device.
    - The voice: one audio file per step, written once with ElevenLabs by `apps/web/scripts/generate-emergency-audio.mjs` and kept in the repo, so the app needs no key and no network. Without the files, the browser's own voice reads the same text.
    - Done when: starting the simulation and opening the medical officer's profile leads from the alert to the last block.
- [x] **E2. The steps**, copied word for word from NASA's Emergency Medical Procedures Manual for the ISS, procedure 1.102 AED ASSISTED CPR (09 APR 15, released under FOIA 16-JSC-F-00174), with its Figure 1. They are in `apps/web/src/lib/procedures.ts`. The manual Adolfo has is partial and has no chest pain procedure: the guide starts when the patient is unresponsive. Procedure 1.103 (ALS algorithm), where 1.102 hands over, is not loaded.
- [x] **E4. A voice agent the medical officer talks with**, built with ElevenLabs Agents on 14 and 15 Nov. It talks in real time, can be interrupted, moves the guide and writes the report. Its instructions are built from `procedures.ts`. Without it, the guide works in silence with its buttons.
- [x] **E5. The scenario is a possible infection** (decided on 15 Nov, replacing the cardiac one in the demo). Seven readings of Liam Novak move away from his usual values, a simulated model flags it, and the guide follows BLADDER/KIDNEY INFECTION of the ISS Medical Checklist (JSC-48522-E4, 2001). The report waits for the link and a button brings the link back. The cardiac procedure stays loaded, out of the demo. Why infection: it has happened in flight (Apollo 13, Salyut 7) and it uses data from the watch and from the blood tests at once.
- [x] **T1. What is due today.** For each parameter the app knows with what it is measured and how often (data document, "How often each parameter is measured"). Today lists what the astronaut has to measure by hand and is due: the check-in, the questionnaires and the blood tests. A task is done when its reading exists, never by ticking a box. What a sensor measures on its own is not a task; it shows only when its data stops arriving. Adds two columns to `cfg.indicator`: who measures it and every how many days. Built on 14 Nov: check-in every day and blood tests every 30 days, the cadence of the periodic health exam of the ISS. The panel says for each indicator whether a reading is due. The blood tests have no form in the app: their task is done when the reading arrives. The STAI and PANAS questionnaires are not routines: they overlap with the daily check-in and have no rule, so their scores stay in Data as history.
    - Done when: a crew member with no check-in today sees it as due, and it shows as done after saving it. A blood test older than its interval shows as due.
- [x] **E3. The documents** say what was built: R9 and the table of pain points in the System_design, the guide spec and this plan.
