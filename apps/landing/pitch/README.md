# Moon Care pitch page

The landing page for the NASA Space Apps Challenge 2026 presentation. Open `index.html` in a browser; there is no build step.

## Files

- `index.html`: the page layout and styles. The team list (`TEAM`) is in the script at the bottom.
- `i18n.js`: all the page text, in English (`en`), Spanish (`es`) and Portuguese, Brazil (`pt`).
- `intro.js`: Alex's intro animation (Earth, stars, meteors, moon-phase logo) from `../moon-care-landing.html`, adapted to fill the hero section.
- `app.html`: a copy of the Mooncare tablet app, shown in the "Try it yourself" frame.
- `shots/`: screenshots of the app used in the feature sections.
- `tools/shoot.py`: retakes the screenshots from `app.html`.

## Common changes

- **Team names:** edit `TEAM` near the bottom of `index.html`. Roles are keys from `i18n.js` (`role_backend`, `role_frontend`, `role_medical`, `role_member`).
- **Text:** edit `i18n.js`. A key missing in one language falls back to English.
- **New language:** copy the `en` block in `i18n.js`, translate it, then add the code to `LANGS` and `HTML_LANG` and a button in the `#langs` switcher in `index.html`.
- **App changed:** replace `app.html`, then run `python3 tools/shoot.py` from this folder (needs Playwright and Chrome).

The page picks the visitor's browser language on the first visit and remembers their choice after that.
