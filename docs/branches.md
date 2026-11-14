# Real Telemetry · Branches

Two teams, two branches. What each team builds is in the [plan](plan.md).

| Branch | Team | Folders it owns |
| :-- | :-- | :-- |
| `feat/backend` | Backend, data and AI | `services/api`, `database` |
| `feat/frontend` | Design, frontend, web and app | `apps` |
| `main` | Nobody works here | What we demo. It always runs |

`docs/` and the README belong to both teams.

## How to work

1. Work on your team's branch. The two of you push to it directly. Pull before you start, and push often.
2. When a task from the plan passes its "done when" check, merge your branch into `main` and push. No pull request and no review needed.
3. After any merge into `main`, both teams merge `main` into their branch. Do it at least every few hours.
4. Stay inside your folders. Then the two branches never touch the same file and merges have no conflicts.

## The line between the teams

The contracts in the [MVP architecture](mvp_architecture.md), section 3, say exactly what the backend returns. The frontend copy of them is `apps/web/src/lib/api.ts`.

- A change to a contract is agreed by both teams first and written in the MVP architecture in the same commit.
- Never write a limit without its source (R11).

## Run it

The steps are in the [README](../README.md). The datasets are in the repo, so after cloning you only run the seed script.
