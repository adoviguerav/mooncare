# Moon Care pitch page

The landing page for the NASA Space Apps Challenge 2026 presentation. Open `index.html` in a browser; there is no build step.

## Files

- `index.html`: the page layout. The icon sprite stays inline, so the icons also show when the page is opened as a file.
- `css/styles.css`: all the styles.
- `js/i18n.js`: all the page text, in English (`en`, the default), Spanish (`es`) and Catalan (`ca`).
- `js/intro.js`: Alex's intro animation (Earth, stars, meteors, moon-phase logo) from `../moon-care-landing.html`, adapted to fill the hero section.
- `js/main.js`: the team list (`TEAM`), the language switch, the countdown, the reveal on scroll, the Earth and the live demo.
- `img/favicon.svg`: the tab icon.
- `img/shots/`: screenshots of the app used in the feature sections.
- `app.html`: a copy of the Mooncare tablet app, shown in the "Try it yourself" frame.
- `tools/shoot.py`: retakes the screenshots from `app.html`.

## Common changes

- **Team names:** edit `TEAM` at the top of `js/main.js`. Roles are keys from `js/i18n.js` (`role_backend`, `role_frontend`, `role_medical`, `role_member`).
- **Text:** edit `js/i18n.js`. A key missing in one language falls back to English.
- **New language:** copy the `en` block in `js/i18n.js`, translate it, then add the code to `LANGS` and `HTML_LANG` in `js/main.js` and a button in the `#langs` switcher in `index.html`.
- **App changed:** replace `app.html`, then run `python3 tools/shoot.py` from this folder (needs Playwright and Chrome).

The page opens in English and remembers the visitor's choice after that.
