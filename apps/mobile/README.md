# Mobile app (crew)

The app each astronaut uses on their phone, as an installable web app (PWA): React + Vite + TypeScript. It connects only to the **moon** server. Its look comes from the prototype in `apps/landing/index.html`.

## Run

The moon server must be running on port 8000 (see the main README).

```sh
cd apps/mobile
npm install
npm run dev        # http://localhost:5174, /api goes to the moon server
npm run build      # the installable app, with its service worker, in dist/
```

`MOON_API_URL` changes where `/api` goes. `?date=YYYY-MM-DD` in the address changes "today", which is 2021-11-02 by default because the readings come from datasets of 2021 and 2022.

## Signing in

The crew member picks their profile and types their 6-digit PIN. The moon server sets an HttpOnly session cookie that lasts 10 days, so the app opens straight onto the panel until then. Users and PINs are managed with `services/api/manage_users.py`.

## Screens

| Tab | Shows | Data |
| :-- | :-- | :-- |
| Today | Greeting, check-in streak, level and XP, parameters in range, the mood check-in (once a day: it gives way to "Check-in done" until the next morning), Dr. Nova, the main parameters, heart rate through the day | Real |
| Vitals | Every parameter, filtered by body system, and life support: SpO2, breathing rate and the station's radiation | Real |
| Sleep | Duration, efficiency, time awake, asleep vs awake in bed, the last 14 nights against the sleep rule | Real |
| Checklist | Today's tasks: the check-in and the tracker worn overnight tick themselves from the data, the others you tick. Each earns XP; 1,000 XP make a level | Real, kept on the server |
| Data | Every parameter with its latest reading, rule, proposed priority and source | Real |
| Alerts | The rules the latest readings break, with what to do; a solar storm shelter drill that times the crew | Real; the drill is practice |

Tapping a parameter opens its history (7, 30 or 90 days) with the rule's limits drawn, how it is measured, why it matters, the rule and where its limit comes from, and the source of the data.

Everything comes from the API. Radiation is the station's dose rate from NASA RadLab (ISS): the same reading for every crew member, not a personal dose. XP rewards the routine, never a health value. Dr. Nova is written from the alert rules; it is not an AI yet. Sleep stages are not shown because the dataset gives them only compared with each volunteer's average, not as the share of the night.

## Without a network

- The service worker keeps the app on the device, so it opens with no network (built app only, not `npm run dev`).
- The app keeps a copy of the last panel it loaded and shows it, with a banner, when the device is offline or the moon server cannot be reached.
- A check-in saved offline waits on the device and is sent as soon as the server answers. It is never dropped.
- API answers are never cached by the service worker: they hold health data.

## Code

```
src/
  App.tsx            signed in, signed out, or offline with the last panel
  screens/           one file per screen; CrewApp.tsx is the shell with the header and the tabs
  components/        logo, tab bar, modal sheet, charts
  lib/               indicators (body system, priority, formatting), dates, offline copies, useLoad
  styles/theme.css   the prototype's theme
public/              manifest, icon, service worker
```

The API client and its types are shared with the dashboard in `packages/api-client`, imported as `@mooncare/api`.
