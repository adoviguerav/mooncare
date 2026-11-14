# Real Telemetry · How to win NASA Space Apps

What decides whether we win, and what we must deliver for it. The tasks that come out of this document are in the [plan](plan.md).

The official rules below come from past editions: the submission guide is from 2025 and the judging guide from 2024. The 2026 guides must be re-read before we submit. Links marked with * were read by the research agent, not opened by one of us.

## 1. The two filters

There are two filters, in order.

### Barcelona jury

They decide which teams go to the global round. They see us in person for 3 minutes and ask questions.

We need:

- The app working, because it is what we show.
- The 3-minute pitch, because it is the only time they hear us.
- Everyone able to explain what we built, because they ask.

### NASA experts

From the teams the local jury nominates, they choose the finalists and the winners. They never see us. They only see what we upload to the Space Apps site before Sunday at 23:59.

We need:

- The project page in English, with text and screenshots. It is what they read.
- A 30-second video of the app, with English subtitles. NASA requires a demo, and going over 30 seconds makes the project ineligible.
- The public GitHub repo with a README.
- The app deployed: frontend on Vercel, backend and a Postgres database on Render. The link goes in the README and on the project page.

### The link we share is the app, not the repo

This is the thing that matters most. Previous winners stood out by letting the jury open the real application through a link and use it as if they were the astronauts. So the link we put first is the deployed app. The repo link goes second.

## 2. Order

1. Today: the app with one complete case, end to end.
2. Tonight: public repo and a first draft of the project page submitted.
3. Sunday morning: deploy.
4. Sunday midday: record the video.
5. Before the local jury: rehearse the pitch twice.
6. Sunday afternoon: final page with screenshots and links tested in a private window. Submit.

## 3. Build

### Framing

- Copy the official challenge statement (objectives, considerations, data resources) before deciding anything. Nobody could open the official page during the research, the challenge title we use comes from other teams' repos, and the Relevance criterion measures whether we answer that statement. ([2026 challenges page*](https://www.spaceappschallenge.org/2026/challenges/))
- Focus on the MVP flow working fully, end to end. The only recent global winner on astronaut health (SpaceGenes+, 2025) showed one live case and left the rest as concept. ([SpaceGenes+*](https://spacegenes-plus.framer.website/))
- Decide what Real Telemetry does that rival repos don't. Almost all of them are simulated vitals, thresholds and alerts, and that won't score on creativity (our inference). ([aurora*](https://github.com/fabriciojunio/aurora-astronaut-health), [vita*](https://github.com/Nav33dCodes/vita-astronaut-health-monitor))
- Don't start the project before the hackathon begins. The organizing team said so in 2025. Research, choosing data and planning are fine, according to a global finalist. ([GO Team 2025](https://github.com/nasa/spaceapps/discussions/1273), [DevStory*](https://blog.devstory.co.kr/en/post/nasa-space-app-challenge/index.html))

### Data

- Using NASA data is required to be eligible for a global award. ([2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))
- Work with real data from the start, not simulated, and make the NASA data feed a core function of the dashboard. This is our inference: public repos from other teams on this challenge simulate vitals and use NASA data as decoration, and SpaceGenes+ won on a real dataset. ([rival repo*](https://github.com/meahadi-hasan/AstroByte-Health-Monitor), [Godel*](https://www.godeltech.com/putting-agentic-development-to-the-test/))
- No personal data. For a health dashboard that means a fictional crew or published data. ([2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))

### Product

- Show the source and the rule behind every indicator on the dashboard. The Validity criterion measures whether the science is sound, and SpaceGenes+ displayed its formula (our inference). ([2024 judging guide](https://spaceappschallenge.org/resources/judging-awards-guide), [SpaceGenes+*](https://spacegenes-plus.framer.website/))

### Team

- Everyone must be able to explain what they built. A Space Apps judge describes a team that solved almost everything with prompts and couldn't explain its solution when asked. ([Hyderabad judge*](https://muhammadhuzaifa.pro/judging-at-nasa-space-apps-challenge-in-hyderabad))
- Keep a running note of which AI tools and external resources we use. AI use must be declared, every external resource listed (open source included), and generated media needs a watermark. ([2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))

## 4. Pitch

### Before writing it

- Ask the Local Lead for the pitch length and format, who judges, how many teams get nominated and the local judging time. None of it is public. Winning the local prize doesn't guarantee the nomination, and local judging may not match the submission deadline. ([2024 judging guide](https://spaceappschallenge.org/resources/judging-awards-guide), [2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))
- Prepare two versions. A local panel set up by the Local Lead picks the nominees, and NASA experts judge after that. The local pitch is for generalists and the submission text for experts (the second part is our inference). ([2024 judging guide](https://spaceappschallenge.org/resources/judging-awards-guide))
- Cover the five criteria: Impact (size of the problem), Creativity (new approach), Validity (sound science, would work for real), Relevance (answers the challenge, complete, usable) and Presentation. The guide asks teams to give presentation as much care as the other four. ([2024 judging guide](https://spaceappschallenge.org/resources/judging-awards-guide))
- Pick one global award category and write the summary in the words of its definition. By definition the ones that fit an onboard health dashboard are Best Use of Science, Best Use of Technology and Best Mission Concept (our inference). ([2025 awards*](https://www.spaceappschallenge.org/2025/awards/))

### Opening

- Open with one sentence a judge can repeat to another judge: user, problem and result. Judges deliberate from memory and compare with what they just saw. Draft to close: "Real Telemetry is the dashboard that tells the crew of a long mission, every day, [which decision], using [which NASA data]". ([Kurbaitaev](https://dev.to/kurbaitaev/what-judges-actually-score-notes-from-a-year-of-hackathon-judging-3p4l))
- Make the user and the problem clear in that first sentence, not later. One judge spent a third of a slot not knowing what he was looking at because the team opened with context. ([Kurbaitaev](https://dev.to/kurbaitaev/what-judges-actually-score-notes-from-a-year-of-hackathon-judging-3p4l), [JetBrains](https://blog.jetbrains.com/ai/2026/06/how-to-win-a-hackathon-notes-from-the-judging-table/))

### Demo

- Show the flow running live and bring a backup recording. For one judge the test is whether the project runs in front of him or not. ([Tarak](https://www.outlookindia.com/hub4business/does-it-actually-work-rahul-taraks-decade-at-the-judging-table), [Kurbaitaev](https://dev.to/kurbaitaev/what-judges-actually-score-notes-from-a-year-of-hackathon-judging-3p4l))
- Name the NASA dataset we used and show on screen the indicator that depends on it. That is how we make the organizer look good: NASA requires its data for global awards and the form has a field to explain how it was used (applying it this way is our inference). ([2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/), [Deck*](https://sustained.substack.com/p/lessons-from-winning-five-hackathons))

### Close

- End with next steps: what we built first and why, and what we left for later. Judges ask teams to say what works and what doesn't, admitting a limitation raised scores, and the best teams could explain what they cut. ([JetBrains](https://blog.jetbrains.com/ai/2026/06/how-to-win-a-hackathon-notes-from-the-judging-table/), [Kurbaitaev](https://dev.to/kurbaitaev/what-judges-actually-score-notes-from-a-year-of-hackathon-judging-3p4l), [Semgrep](https://semgrep.dev/blog/2026/the-ai-hackathon-effect))

## 5. Submission (what the NASA experts see)

- Demo of at most 30 seconds of video, or at most 7 slides. Going over makes the project ineligible for global judging. We go with the video. Script suggested by the guide: team (0:00), challenge (0:02), name (0:05), idea (0:10), future (0:20 to 0:30). ([2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))
- Everything in English, with subtitles if the video is spoken in another language. ([2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))
- Links that open without login, and the demo hosted outside the Space Apps site. Test them in a private window. ([2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))
- Submit with margin. Submissions open Saturday 14 at 9:00 and close Sunday 15 at 23:59. Late projects aren't judged and a submission is final. ([2026 home page*](https://www.spaceappschallenge.org/2026/), [2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))
- Have the form fields ready: name, summary, demo link, project link, detailed description, NASA data, other data and resources, AI use and verification. ([2025 submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/))

## 6. Notes as they come up

Technical ideas:

- (add here)

Things to mention in the pitch:

- (add here)
