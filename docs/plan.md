# Real Telemetry · Plan

What we do, milestone by milestone, until we submit. A milestone is finished before the next one starts.

- What we are building and why: [system_design.md](system_design.md).
- How it is built: [mvp_architecture.md](mvp_architecture.md).
- What decides whether we win: [how_to_win_nasa_space_apps.md](how_to_win_nasa_space_apps.md).
- How we use branches: [branches.md](branches.md).

Reorganised on 14 Nov. Two decisions behind it:

- All the code is finished today, Saturday 14. Sunday is for the pitch, the video and the submission.
- The platform is finished first: data, backend and frontend. Then the nice to have. Then the emergency flow and the landing.
- The demo is the base platform plus one extra flow: an emergency handled on board with no connection to Earth. That is the main pain point (System_design, section 1, number 2). Following the crew from the ground already exists on the ISS, so the link to the ground is built but is not the flow we show.

| Milestone | What | State |
| :-- | :-- | :-- |
| 0 | The platform works with real data | Done |
| 1 | The app is online | Done |
| 2 | The platform, finished: every dataset loaded and shown, with our look | To do |
| 3 | The other profiles: flight surgeon and commander | To do |
| 4 | One emergency without Earth: chest pain and CPR | To do |
| 5 | The landing page | To do |
| 6 | Show it | Sunday |

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

## Milestone 2 · The platform, finished

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

Done when: every row of Tables 1 and 2 of the data document is on the Vercel link, with the new look.

## Milestone 3 · The other profiles

- [ ] **G3. Flight surgeon screen.** It needs N1. The four crew members, who has an alert and when their last data arrived. A tap opens that crew member's full panel. The link switch, "Link with Earth: on or off", is on this screen.
    - Done when: with the link off, the screen says since when it has no data, and the crew app works as before.
- [ ] **C1. Commander view.** Decided on 14 Nov: the commander has a button that opens what each of the other crew members sees, read only. No check-in and no changes from there. It changes one line of the System_design, section 6: health data is private day to day, except for the commander.
    - Done when: Crew 1 opens the panel of Crew 2 and cannot save a check-in for them. Crew 2 has no such button.

What was decided for the link to the ground on 14 Nov:

    - The flight surgeon sees the full panel of each crew member: indicators, history and alerts. They are the crew's doctor, as on the ISS. Privacy between crewmates on board does not change.
    - One way only, ship to ground. The ground looks and does not answer.
    - The lost link is shown with a switch, "Link with Earth: on or off". One backend and one database, not two.

Done when: the two screens are on the Vercel link.

## Milestone 4 · One emergency without Earth

The scenario of the challenge video: halfway to Mars, a crewmate feels a sharp pain in the chest and collapses. What is happening, and what should the others do? The tablet guides the crew step by step, with no link to Earth.

Decided on 14 Nov: chest pain, then collapse, then CPR. Why: it is the emergency the challenge itself shows, and the procedure is NASA's own.

- **The procedure** is the ISS emergency manual that Adolfo has. If it is not enough, the public ISS Medical Checklist (JSC-48522-E4, 2001), sections "Chest pain - acute" and "Cardiopulmonary resuscitation: CPR". It is public: http://web.archive.org/web/20230519222418/https://www.nasa.gov/centers/johnson/pdf/163533main_ISS_Med_CL.pdf
- **Why it shows the pain point.** The checklist tells the crew to contact the flight surgeon. Without a link, the tablet is what guides them.
- **No invented data.** A tap opens the flow, not a reading.
- **Its limits, said on screen.** The checklist is from 2001. No cardiac arrest in space is on record.

Tasks:

- [ ] **E1. Guided steps screen**: fixed steps, one per screen, with timers where the procedure has them. It works with the network off.
    - Done when: one tap from the panel opens it and it can be followed to the last step with the network off.
- [ ] **E2. The steps of the two procedures**, copied from the checklist, each with its page. Nobody invents or rewrites a medical step. Àngels reads them before the demo.
- [ ] **E3. Update the documents**: R9 in the System_design and the demo script (P8).

Looked at and left for the landing and the pitch, as next steps:

| Scenario | Why not now |
| :-- | :-- |
| Kidney stone, infection and early sepsis | NASA's worst case for the transit to Mars (HRP-48044), and the ISS checklist has its procedures. None of our data sets it off |
| Low potassium and arrhythmia | Real data sets it off: Crew 1 has 3.0 mmol/L the day after landing, and Apollo 15 had arrhythmias blamed on low potassium. It is mild, a caution more than an emergency |
| Radiation storm | It happens, and today the warning comes from the ground. No public limit in our units, the RadLab data shows no storm, and no public procedure |
| Low glucose | Real NASA data sets off the alert. No case in flight, and the three low values come from the same blood draw, so they may be a sample problem. To ask Àngels |

Done when: on the Vercel link, one tap opens the guide and it can be followed to the end.

### Measurement routines

- [ ] **T1. What is due today.** For each parameter the app knows with what it is measured and how often (data document, "How often each parameter is measured"). Today lists what the astronaut has to measure by hand and is due: the check-in, the questionnaires and the blood tests. A task is done when its reading exists, never by ticking a box. What a sensor measures on its own is not a task; it shows only when its data stops arriving. Adds two columns to `cfg.indicator`: who measures it and every how many days.
    - Done when: a crew member with no check-in today sees it as due, and it shows as done after saving it. A blood test older than its interval shows as due.

### If there is time after the emergency

- [ ] **R1. Radiation module: solar flare alert.** Idea from Becky's prototype (`apps/landing/index.html`, the Alerts page): when a solar flare is on its way, the panel shows how far it is, a countdown and the steps to take shelter, different in the base, in the rover and in transit. We have no data for it: the RadLab dose rate shows no spike for the storm of 28 Oct 2021, and there is no public dose rate that triggers an action. It would be a simulated event, and the screen must say so.
    - Done when: a simulated flare opens the alert with its countdown and its steps, labelled as a simulation.

## Milestone 5 · The landing page

Our letter of introduction to the NASA experts. Decided on 14 Nov: two deploys. The app stays on Vercel, from `apps/web`. The landing goes on Netlify, from `apps/landing`, with a button that opens the app.

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

Done when: someone who does not know the project reads the landing, opens the app from it and understands what it is.

After the hackathon: the onboard AI (E1 to E6 of the System_design), the mobile app and the other stretch goals.

## Milestone 6 · Show it

Sunday 15. Nobody adds features. We only fix what is broken. In this order:

- [ ] **P4.** List of AI tools and outside resources. The form asks for it.
- [ ] **P5.** Pick one global award category: Best Use of Science, Best Use of Technology or Best Mission Concept.
- [ ] **P6.** Write the opening sentence: user, problem and result.
- [ ] **P8.** Demo script: a normal day, then the glucose alert, then the chest pain and CPR flow.
- [ ] **P9.** Pitch of 3 minutes with the five pain points (System_design, section 7) and the five judging criteria. It ends with next steps: what we built first and what we left for later.
- [ ] **P10.** Architecture slide: the target architecture with what is built marked (System_design, section 5).
- [ ] **P11.** Record the video: 30 seconds at most, with English subtitles. Going over makes us ineligible.
- [ ] **P12.** Record a backup of the full demo.
- [ ] **P13.** Rehearse the pitch twice. Everyone can explain what they built.
- [ ] **P14.** Project page, in English: text, screenshots, the app link, the repo link, NASA data used, other data and resources, AI use.
- [ ] **P15.** Test every link in a private window.
- [ ] **P16.** Submit. Submissions close on Sunday 15 at 23:59, and a submission is final.

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
