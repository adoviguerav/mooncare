# Real Telemetry · Plan

Who builds what, from now until we submit. What we are building and why is in the System_design (system_design.md). How it is built is in the MVP architecture (mvp_architecture.md). This document only adds the order, the split into two teams and what is already done.

Tick a task when its "done when" check passes.

## 1. Where we are (14 Nov)

Built and checked (the backend tests pass):

- [x] Database and seed script, with one crew member (Crew 1).
- [x] Two indicators: blood glucose with its rule, and heart rate.
- [x] Backend: crew, panel and indicator history.
- [x] Every dataset of the data document is in `database/datasets` (85 MB), so nobody downloads anything. Radiation covers May 2021 to March 2022.
- [x] Frontend: profile picker, panel and indicator detail. The detail already shows how to measure, why it matters, the rule, what to do and the source.

Not built yet:

- The daily check-in and the mood indicators.
- The CPR flow.
- The other MVP indicators: sleep, resting heart rate, temperature, exercise.
- The other three crew members.
- The rules for sleep, resting heart rate and mood.
- The look of the app and the streak.
- The demo, the pitch and the submission.

## 2. How the two teams work in parallel

- **Backend, data and AI** (2 people) works in `services/api` and `database`, on the branch `feat/backend`. Adolfo and Ivan.
- **Design, frontend, web and app** (2 people) works in `apps`, on the branch `feat/frontend`. Becky and Alex.
- Each team merges into `main` when a task passes its check. The rules are in [branches.md](branches.md).
- The contracts in the MVP architecture, section 3, are the line between the two teams. They say exactly what the backend returns. The check-in contract is already written there, so the frontend can build its screen before the endpoint exists.
- A change to a contract is agreed by both teams first.
- The order follows NASA's pain points (System_design, section 1): first what covers the highest ones and is not built yet. That is the CPR flow (pain point 2) and the mood check-in (pain point 3).

## 3. Tasks

In order. Each task names the requirement (R) it covers.

### Backend, data and AI

- [ ] **B1. Check-in and mood readings** (R2, R3; `feat/checkin-mood`). The `PUT` check-in endpoint, and the six mood indicators loaded from LifeSnaps.
    - Done when: saving a check-in for 2021-11-02 returns what was saved, and the panel for that day shows it.
- [ ] **B2. Mood rule** (R10; `feat/alerts-rules`). The rule in section 4.
    - Done when: the crew member with the tense fortnight shows the alert on the demo date, and Crew 1 does not.
- [ ] **B3. The other MVP indicators** (R1; `feat/backend_data`): resting heart rate, sleep duration, sleep efficiency, skin temperature, very active minutes, steps.
    - Done when: the panel returns all of them for Crew 1 on the demo date.
- [ ] **B4. Sleep and resting heart rate rules** (R10; `feat/alerts-rules`). The limits are already decided (MVP architecture, section 5).
    - Done when: a night under 7 hours shows the alert with its explanation and what to do.
- [ ] **B5. The other three crew members** (`feat/backend_data`). Each one's dates are shifted so their data lands on the demo date, 2021-11-02.
    - Done when: the profile picker shows four crew members and each has a full panel on the demo date.
- [ ] **B6. Panel order** (`feat/backend_data`) by the priority rule (System_design, section 7): mood, glucose, heart rate, exercise, sleep, temperature.
    - Done when: the panel returns them in that order.

### Design, frontend, web and app

- [ ] **F1. CPR flow** (R9; `feat/cpr-emergency`). It needs nothing from the backend, so it starts now. It follows the ISS procedure, with one image per step and the timers.
    - Done when: one tap from the panel opens it, and it can be followed to the last step with the network off.
- [ ] **F2. Check-in screen** (R2, R3; `feat/checkin-mood`). Six moods, more than one allowed. The app asks for it when today's is missing. A streak counts the days in a row.
    - Done when: a check-in made on the tablet is still there after reloading.
- [ ] **F3. Look of the app** (R1, R10; `feat/daily-panel`): name, style, alert colours, and the six moods as one card.
    - Done when: someone outside the team can tell at a glance which indicator has an alert.
- [ ] **F4. Mood alert on the mood card** (R10; `feat/checkin-mood`). The backend sends the mood rule as two extra indicators (section 4). They are shown inside the mood card, not as cards of their own.
    - Done when: the tense alert of B2 shows on the mood card with what to do.
- [ ] **F5. History charts** (R7; `feat/daily-panel`): readable on a tablet, with the limits of the rule drawn.
    - Done when: the glucose chart shows the 36 mg/dL reading below the line.

### Both teams, at the end

- [ ] Read the 2026 submission guide today. Our notes come from the 2025 guide (System_design, section 1).
- [ ] Demo script: a normal day, then the glucose alert of Crew 1 (36 mg/dL), then the CPR flow.
- [ ] Rehearse the demo and record a backup.
- [ ] Pitch with the five pain points (System_design, section 7).
- [ ] Architecture slide: the target architecture with what is built marked (System_design, section 5).
- [ ] Submission: a video of 30 seconds at most or 7 slides at most, the form fields, the list of AI tools and outside resources, and every link tested in a private window.

### After the MVP

These wait until every task above is ticked. They are the planned parts of the target architecture (System_design, section 5).

- [ ] **Onboard AI** (`feat/stretch-assistant`). The emergency assistant, E1 to E6.
- [ ] **Link to the ground.** The queue of messages to Earth and what the flight surgeon sees.
- [ ] **Mobile app** (`apps/mobile`, new branch `feat/mobile`).
- [ ] The other stretch goals, in the order of the System_design, section 2.

## 4. Mood rule (proposed)

To confirm with whoever leads the medical side.

- **The rule.** Warn when "Sad" was chosen on more than half of the last 14 days, that is, 8 or more. The same for "Tense or anxious". They are two separate rules.
- **Where it comes from.** PHQ-2 (depression) and GAD-2 (anxiety) are the standard short screening questionnaires. Both ask how often something happened over the last 2 weeks, and "more than half the days" is the answer that starts to count towards a positive result. ASTRA-HEALTH already names their long versions, PHQ-9 and GAD-7.
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

## 5. Dates

Proposed, to confirm.

| When | What |
| :-- | :-- |
| Sunday 15, 12:00 | Stop adding features. From here on we only fix what is broken, rehearse the demo, record the backup and fill in the submission. Why: a submission is final and a late one is not judged, and a feature added in the last hours is what usually breaks a demo |
| Sunday 15, 21:00 | Submit |
| Sunday 15, 23:59 | Submissions close. Check the time zone on the 2026 site |

## 6. Owners

| Team | People |
| :-- | :-- |
| Backend, data and AI | Adolfo, Ivan |
| Design, frontend, web and app | Becky, Alex |
| Medical review of the rules |  |
| Pitch and submission |  |
