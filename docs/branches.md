# Real Telemetry · Branches

Two teams. Each team has one branch, and each person has their own branch off it. What each team builds is in the [plan](plan.md).

| Branch | Team | Folders it owns |
| :-- | :-- | :-- |
| `feat/backend` | Backend, data and AI | `services/api`, `database` |
| `feat/frontend` | Design, frontend, web and app | `apps` |
| `main` | Nobody works here | What we demo. It always runs |

`docs/` and the README belong to both teams.

| Personal branch | Person | Merges into |
| :-- | :-- | :-- |
| `feat/backend-adolfo` | Adolfo | `feat/backend` |
| `feat/backend-ivan` | Ivan | `feat/backend` |
| `feat/frontend-becky` | Becky | `feat/frontend` |
| `feat/frontend-alex` | Alex | `feat/frontend` |

## How to work

1. Work on your personal branch and push often.
2. When a piece works, merge your branch into your team's branch and push. Then your teammate merges the team branch into theirs.
3. When a task from the plan passes its "done when" check, merge the team branch into `main` and push. No pull request and no review needed.
4. After any merge into `main`, both teams merge `main` into their team branch, and each person merges the team branch into theirs. Do it at least every few hours.
5. Stay inside your team's folders. Then the two teams never touch the same file. Inside a team, say which task you take before you start, so the two of you do not edit the same file.

## The line between the teams

The contracts in the [MVP architecture](mvp_architecture.md), section 3, say exactly what the backend returns. The frontend copy of them is `apps/web/src/lib/api.ts`.

- A change to a contract is agreed by both teams first and written in the MVP architecture in the same commit.
- Never write a limit without its source (R11).

## Run it

The steps are in the [README](../README.md). The datasets and the seed files are in the repo, so after cloning you only start the database.
