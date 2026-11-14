# Real Telemetry · Plan

What we do, milestone by milestone, until we submit. A milestone is finished before the next one starts.

- What we are building and why: [system_design.md](system_design.md).
- How it is built: [mvp_architecture.md](mvp_architecture.md).
- What decides whether we win: [how_to_win_nasa_space_apps.md](how_to_win_nasa_space_apps.md).
- How we use branches: [branches.md](branches.md).

Reorganised on 14 Nov. Two decisions behind it:

- All the code is finished today, Saturday 14. Sunday is for the pitch, the video and the submission.
- The demo is the base platform plus one extra flow: an emergency handled on board with no connection to Earth. That is the main pain point (System_design, section 1, number 2). Following the crew from the ground already exists on the ISS, so the link to the ground goes to the next steps.

| Milestone | What | State |
| :-- | :-- | :-- |
| 0 | The platform works with real data | Done |
| 1 | The app is online | In progress |
| 2 | The app looks like ours | To do |
| 3 | One emergency without Earth | Scenario not chosen |
| 4 | The landing page | To do |
| 5 | If there is time | To do |
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

## Milestone 1 · The app is online

One link opens the real app. It is the link we give the jury (How to win, section 1).

- [x] **D3a. Backend and Postgres on Render**, at https://mooncare-73hi.onrender.com. The data is loaded and `/api/crew` answers. The free service sleeps after 15 minutes without use, so the first visit takes about a minute.
- [ ] **D4. Frontend on Vercel.** One project from the repo with `apps/web` as its folder. `apps/web/vercel.json` already sends `/api` to Render. Adolfo creates the project.
    - Done when: the Vercel link shows the panel of Crew 1 with its glucose alert.
- [ ] **D3b. A check-in survives.** Save a check-in from the Vercel link, restart the backend on Render and see it is still there. Then load the data again to leave the demo clean.
- [ ] **D5. The app link** goes first in the README and on the project page, before the repo link.
    - Done when: someone outside the team opens it on a phone in a private window and reaches the panel.

Done when: the link works from a phone outside our network.

## Milestone 2 · The app looks like ours

- [ ] **F3. Look of the app.** The design and the Moon Care logo of Becky's prototype (`apps/landing/index.html`), in the real app. Only the look: the prototype's values are invented and stay out.
    - Done when: someone outside the team can tell at a glance which indicator has an alert.
- [ ] **F5. History charts** with the limits of the rule drawn, readable on a tablet.
    - Done when: the glucose chart shows the 36 mg/dL reading below the line.
- [ ] **F4. Mood alert inside the mood card**, not as a card of its own.
    - Done when: the tense alert of Crew 2 shows on the mood card with what to do.
- [ ] **F2. Streak of check-ins**: the days in a row with a check-in, on the mood card.
    - Done when: a check-in today adds one to the streak and it is still there after reloading.

Done when: the four tasks are on the Vercel link.

## Milestone 3 · One emergency without Earth

A reading sets off an alert on board, and the tablet guides the crew step by step, with no link. One scenario is built. The others are explained on the landing and in the pitch.

- [ ] **E0. Choose the scenario.** It must be a real need, set off by data we have, with a limit and a procedure that both have a source. A research is running on 14 Nov. Looked at so far:

    | Scenario | For | Against |
    | :-- | :-- | :-- |
    | Low glucose | Real NASA data already sets off the alert (Crew 1, 36 mg/dL) | No case in flight. The procedure has to come from Àngels |
    | CPR | The clearest emergency | No case in space. It uses none of our data. The ISS crew already does it alone |
    | Radiation storm | It happens: ISS crews take shelter, and the warning comes from the ground | No public limit in our units. The RadLab data shows no storm. No public procedure |

- [ ] **E1. Guided steps screen**: fixed steps, one per screen, with timers where the procedure has them. It works with the network off.
    - Done when: one tap from the alert opens it and it can be followed to the last step with the network off.
- [ ] **E2. The procedure of the chosen scenario**, with its source on screen. Nobody invents a step.
- [ ] **E3. Update the documents**: R9 and the demo script (P8) name the CPR flow today.

Done when: on the Vercel link, the alert of the chosen scenario opens its guide and it can be followed to the end.

## Milestone 4 · The landing page

Our letter of introduction to the NASA experts. It is the first page of the same Vercel project: the landing at `/` and the app at `/app`.

- [ ] **L1. One deploy, two pages.** The landing at `/` with a button that opens the app at `/app`.
- [ ] **L2. Content**, starting from Becky's landing:
    - Problem and solution.
    - What the app does.
    - Architecture: the real one, with Postgres on board, and the one of the demo, on Render and Vercel.
    - The team.
    - Datasets and who provides them.
    - How we used AI.
    - Next steps: the link to the ground and the emergency scenarios we did not build.
- [ ] **L3. Languages.** English and Spanish, with a switch. Any other language is not decided.

Done when: someone who does not know the project reads the landing, opens the app from it and understands what it is.

## Milestone 5 · If there is time

In this order.

- [ ] **VO2 max rule.** The first rule with a NASA limit: in-mission VO2 max at or above 32.9 mL/kg/min (NASA-STD-3001, V1 4001). The data is the watch's estimate in LifeSnaps (data document, Reference values from NASA).
- [ ] **Link to the ground** (Ivan). It is not part of the demo flow. If it is not finished, it goes on the architecture slide (P10) and in the next steps of the pitch (P9). Decided on 14 Nov:
    - The flight surgeon sees the full panel of each crew member: indicators, history and alerts. They are the crew's doctor, as on the ISS. Privacy between crewmates on board does not change.
    - One way only, ship to ground. The ground looks and does not answer.
    - The lost link is shown with a switch, "Link with Earth: on or off". One backend and one database, not two.
    - [ ] **G1. Link switch and queue** (backend). With the link off, new readings are saved on board and wait in a queue. With the link on, the queue empties. Each sync is recorded in the `his` schema. It adds to the data model, so agree it first.
        - Done when: with the link off, a check-in shows on the crew panel and not on the ground. After turning the link on, the ground shows it.
    - [ ] **G2. Ground panel** (backend). The same panel and history, built only from what has reached the ground, plus when the last data arrived.
        - Done when: the ground panel of Crew 1 shows the glucose alert and the time of the last data received.
    - [ ] **G3. Flight surgeon screen** (frontend). The four crew members, who has an alert and when their last data arrived. A tap opens that crew member's full panel. The link switch is on this screen.
        - Done when: with the link off, the screen says since when it has no data, and the crew app works as before.
- [ ] **Commander screen.** The role exists. What the commander sees is not decided (System_design, section 2).

After the hackathon: the onboard AI (E1 to E6 of the System_design), the mobile app and the other stretch goals.

## Milestone 6 · Show it

Sunday 15. Nobody adds features. We only fix what is broken. In this order:

- [ ] **P4.** List of AI tools and outside resources. The form asks for it.
- [ ] **P5.** Pick one global award category: Best Use of Science, Best Use of Technology or Best Mission Concept.
- [ ] **P6.** Write the opening sentence: user, problem and result.
- [ ] **P8.** Demo script: a normal day, then the alert, then the emergency flow of milestone 3.
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
