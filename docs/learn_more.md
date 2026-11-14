# Learn more about a parameter

Study notes inside the page of each parameter, so a crew member with no medical training can understand what a reading is and why it matters. Spec written on 15 Nov 2026. It is task K1 of the [plan](plan.md).

## Why

Requirement R4 of the [system design](system_design.md): the app is usable by people with no medical background. The page of a parameter already says what it is, what is normal, what the reading means and what to do. It does not teach. A crew that has to solve problems alone (pain point 1) needs to be able to study what it measures.

## What it is

A folded block on the page of a parameter, under the history chart: "Learn more about C-reactive protein". Closed by default, so whoever only wants the reading does not see it. It is not a separate page: the app has no router and must not get one.

Inside, in this order:

| Block | What it says | Length |
| :-- | :-- | :-- |
| What it does in the body | What the thing measured is, and its job | 2 to 4 sentences, with one drawing |
| What moves it | What makes it go up, and what makes it go down | A short list for each direction |
| In space | Why it can change on a mission, if a source says so | 1 to 3 sentences. Left out if no source covers it |
| Read it together with | Other parameters of the app that help to read this one, each a button that opens that parameter | 2 to 4 parameters |
| Sources | Where every statement above comes from | A list of links |

## Scope

Seven parameters, the ones of the infection alert (`apps/web/src/lib/infectionSignals.ts`), so the notes support the demo:

`skin_temperature`, `breathing_rate`, `heart_rate_variability`, `spo2`, `sleep_efficiency`, `crp`, `lymphocytes`.

A parameter with no notes shows no block. The other parameters get theirs later, one entry at a time, with no code change.

## Content rules

These decide whether the work is accepted.

- **Every statement has a source**, and the source is in the entry. Allowed sources: MedlinePlus (U.S. National Library of Medicine), NASA Human Research Program evidence reports, NASA OCHMO technical briefs, NASA-STD-3001, and peer-reviewed papers. Open the page and read it before citing it. A statement with no source is left out.
- **No number that the app does not already have.** No normal range, limit or dose is added. The ranges live in the rules of the database and are shown above the notes.
- **No diagnosis and no advice.** The notes explain; "What to do" stays where it is on the page.
- **Plain English**, short sentences, no jargon without a few words that explain it. The reader is an engineer or a pilot, not a doctor.
- **Rewritten in our words.** No sentence copied from a source.
- **The drawings are ours**, made as SVG. No image is taken from a website.

## Where it goes in the code

Frontend only. No change to the database, the seeds or the API: a change there breaks the live app until the Render database is rebuilt.

| File | What |
| :-- | :-- |
| `apps/web/src/lib/learn.ts` (new) | The notes as data, keyed by parameter id: blocks, drawings, related parameters, sources |
| `apps/web/src/features/indicator/LearnMore.tsx` (new) | The folded block |
| `apps/web/src/features/indicator/IndicatorScreen.tsx` | Shows the block under the history card. Needs a way to open another parameter from "Read it together with": `App.tsx` already holds which parameter is open |
| `apps/web/public/learn/` (new) | The SVG drawings |
| `apps/web/src/styles/index.css` | The few styles the block needs |
| `apps/web/tests/learn.test.mjs` (new) | Tests of the data |

Shape of an entry:

```ts
type LearnNote = {
  body: { text: string; drawing: { src: string; caption: string } }
  raises: string[]
  lowers: string[]
  inSpace?: string
  readWith: string[] // parameter ids
  sources: { title: string; url: string }[]
}
```

## Look and behaviour

Follow what the app already does. Read `apps/web/src/features/indicator/IndicatorScreen.tsx` and the "Indicator detail" and "Emergency" parts of `apps/web/src/styles/index.css` first, and copy their patterns. Do not invent new ones.

- **Text hierarchy.** Title of a block: large and bold. Subtitle: in between, bold. Body: regular weight, in `--ink`. Secondary text: smaller, in `--mute`. The `.explain` block of the page is the model.
- **Two buttons only**: `.primary` for the way forward, `.ghost` for everything else. "Read it together with" uses `.ghost`. No new button style.
- **Colours and sizes from the tokens** in `:root`. No new colour.
- **The block is a `.card`**, folded with `<details>`, like "Where the numbers come from" on the same page.
- **Drawings**: SVG, drawn by hand in the style of `apps/web/public/emergency/*.svg`: simple line drawings, stroke `#e6f1fb`, accents only from the palette (`#2fd8ff`, `#3be0a0`, `#ffb84a`, `#ff5a52`). One idea per drawing, readable at 240 px wide, with a caption. Each drawing has a real `alt` text.
- **Motion**: only `transform` and `opacity`, inside `@media (prefers-reduced-motion: no-preference)`. The drawing may fade and rise in when the block opens. Nothing loops.
- **No noise.** No disclaimers on each block, no "note" boxes, no labels saying what is ours. One line at the end of the block lists the sources.
- **Works on a phone**: one column, touch targets of 48 px.
- **No new dependency.** No router, no chart or icon library, no Markdown renderer.

## Tests

In `apps/web/tests/learn.test.mjs`, run with `npm test`:

- Every entry belongs to a parameter that exists (use the ids of `infectionSignals.ts`, which are the seven of the scope).
- Every entry has at least one source, and every source has an `https` link.
- Every drawing named in an entry exists in `apps/web/public/learn/`.
- Every parameter in "Read it together with" is a parameter of the app (the ids in `apps/web/src/lib/groups.ts`).

## Done when

- Opening any of the seven parameters shows the folded block, and it opens with its five blocks and at least one drawing.
- A button of "Read it together with" opens that parameter.
- A parameter outside the seven shows no block and no error.
- `npm test`, `npm run build` and `npm run lint` pass in `apps/web`.
- The page was looked at in a browser at phone width and at laptop width, with a screenshot of each in the report.
- The report lists, for each of the seven, the sources that were opened and read.

## Out of scope

- Notes for the other parameters.
- Quizzes, progress or anything that tracks what was studied.
- Translating the notes.
- Any change to the backend.
