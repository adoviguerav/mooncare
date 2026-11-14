# Real Telemetry · Branches

## 1. About this document

**What is this:** The list of branches we work on, what each one covers, and the rules for using them.

**Why it's here:** Several people work in parallel. If everyone knows which branch owns which part of the product, we avoid duplicated work and merge conflicts.

Requirement codes (R1 to R11, E1 to E6) come from [system_design.md](system_design.md).

## 2. Branches

`main` is always working and is the only branch we demo from. Every other branch starts from `main` and returns to it through a pull request.

| Branch | Covers | Main area of the code |
| :-- | :-- | :-- |
| `feat/daily-panel` | R1, R4, R7. The main dashboard, the indicator detail view, the history charts and the plain-language explanations. | `apps/web/src/features/panel`, `apps/web/src/features/indicator` |
| `feat/checkin-mood` | R2, R3, R6. The daily check-in routine, the mood readings and the gamification. | New `apps/web/src/features/checkin`, plus a check-in endpoint in `services/api/app` |
| `feat/alerts-rules` | R8, R10, R11. The rules and the alert engine: limits, explanations, what to do, sources, and how new indicators are added. | `services/api` (`seed_content.py`, `schemas.py`, `app/main.py`) |
| `feat/cpr-emergency` | R9. The guided CPR flow: fixed steps, timers, and the mode for when the link with Earth is down. | New `apps/web/src/features/emergency` |
| `feat/landing` | The landing page: pitch, demo and submission material. | `apps/landing` |
| `feat/stretch-assistant` | The stretch goals, in order: emergency assistant, EVA mini panel, cross-indicator warnings. Do not start until the MVP works. | New feature folders |

Not covered by a branch:

- `apps/mobile`: the MVP is a tablet web app. Create `feat/mobile` if it is needed later.
- Data work (`seed.py`, `schema.sql`, datasets): goes in the branch that needs the change. If several people edit the schema, create `feat/data-pipeline`.

## 3. Rules

1. **One branch, one area.** Keep changes inside the area in the table. If you need something outside it, tell the owner of that area first.
2. **Pull requests into `main`.** Nobody pushes to `main` directly. Another person reviews before merging.
3. **Keep up with `main`.** Merge `main` into your branch often, at least once a day. `feat/daily-panel` and `feat/alerts-rules` both touch the API types (`apps/web/src/lib/api.ts` and `services/api/app/schemas.py`), so conflicts are most likely there.
4. **Change the contracts carefully.** The endpoints and the data model are described in [mvp_architecture.md](mvp_architecture.md). If a change alters them, update that document in the same pull request.
5. **Small pull requests.** One feature or fix per pull request, so it can be reviewed quickly.
6. **Never write a limit without its source.** This applies to every rule in `feat/alerts-rules` (R11).

## 4. Naming

- New branches use `feat/<short-name>` for features and `fix/<short-name>` for fixes.
- If a branch grows too large, split it into `feat/<area>-<detail>` branches off the area branch, for example `feat/alerts-rules-baseline`, and merge them back into the area branch.
- Delete a branch after its pull request is merged, unless it is one of the area branches above.
