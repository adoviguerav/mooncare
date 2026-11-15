# Moon Care pitch page

The landing page for the NASA Space Apps Challenge 2026 presentation. Open `index.html` in a browser; there is no build step.

## Files

- `index.html`: the page layout. The icon sprite stays inline, so the icons also show when the page is opened as a file.
- `css/styles.css`: all the styles.
- `js/i18n.js`: all the page text, in English (`en`, the default), Spanish (`es`) and Catalan (`ca`).
- `js/bg.js`: the moving background: a slowly turning star field at three depths, a sky tint that follows the story (Earth, Moon, Mars, the emergency) and shooting stars.
- `js/intro.js`: Alex's intro animation (Earth, stars, meteors, moon-phase logo) from `../moon-care-landing.html`, adapted to fill the hero section.
- `js/main.js`: the team list (`TEAM`), the language switch, the countdown, the reveal on scroll, the Earth and the live demo.
- `img/favicon.svg`: the tab icon.
- `img/shots/`: screenshots of the app used in the feature sections.
- `moon_care_demo.mp4` and `moon_care_demo.vtt`: the demo video and its English captions, shown in the "Watch the demo" section. Copies of `moon_care_demo.mp4` and `video/moon_care_demo.srt` at the repository root, which `video/build_video.py` writes: copy them again when the video is rebuilt. `img/video-poster.webp` is a frame of it (second 8.6), used as its cover.
- `demo-app/`: the crew app mini demo, the phone in "Try it yourself". It is `apps/mobile` built as it is by `tools/build_app_demo.py`; its calls to `/api` are answered in the browser by `demo-app/demo-api.js` from the same snapshot. Any 6-digit PIN signs in, and what the visitor does lasts until the tab closes. Only `demo-api.js` is written by hand: rebuild the rest with `python tools/build_app_demo.py` when the crew app changes.
- `demo/`: the dashboard mini demo, the tablet in "Try it yourself". The screens of the real app (`apps/web`) without sign-in and without a backend, so it keeps working if the live app goes down:
    - `demo/index.html`, `demo/js/app.js`: profile picker, panel (Today, Data, Alerts) and the screen of one indicator. A check-in is kept only until the page closes.
    - `demo/css/app.css`: a copy of `apps/web/src/styles/index.css`. `demo/css/demo.css`: the demo strip.
    - `demo/data/snapshot.js`: a snapshot of the moon API on the demo date, 2 Nov 2021. Real data, read only.
- `tools/shoot.py`: retakes the screenshots of the real app: four from the mini demo, and the infection case from `apps/web`.
- `tools/snapshot.py`: takes the data of the mini demo from the moon server.

## Common changes

- **Team names:** edit `TEAM` at the top of `js/main.js`. Roles are keys from `js/i18n.js` (`role_backend`, `role_frontend`, `role_research`, `role_medical`, `role_member`).
- **Text:** edit `js/i18n.js`. A key missing in one language falls back to English.
- **New language:** copy the `en` block in `js/i18n.js`, translate it, then add the code to `LANGS` and `HTML_LANG` in `js/main.js` and a button in the `#langs` switcher in `index.html`.
- **App changed:** copy `apps/web/src/styles/index.css` to `demo/css/app.css` again, and port any change of the screens to `demo/js/app.js`.
- **Dashboard sky changed** (`apps/web/src/components/SolarSky.tsx` or `lib/sun.ts`): from `apps/web`, run `npx vite build --config ../landing/pitch/tools/sky/vite.config.mjs`. It writes `demo/js/sky.js`, with a ten-line stand-in for React (`tools/sky/`).
- **Data changed:** start the moon server and run `python tools/snapshot.py http://localhost:8000 demo/data/snapshot.js` from this folder.
- **Screenshots:** with the moon server and `apps/web` (`npm run dev`) running, run `uv run --no-project --with playwright --with pillow python tools/shoot.py` from this folder. It uses the Chrome installed on the machine. Pass `skip` to leave the infection screenshot as it is.

Every screen the page shows exists in the app. What is not built yet is listed as next steps, without a screenshot.

The page opens in English and remembers the visitor's choice after that.
