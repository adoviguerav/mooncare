# Real Telemetry

A daily health panel for astronauts, built for the NASA Space Apps Challenge 2026. The design is in [docs/](docs/): start with [system_design.md](docs/system_design.md), then [mvp_architecture.md](docs/mvp_architecture.md). Who builds what is in [plan.md](docs/plan.md), and how we use branches is in [branches.md](docs/branches.md).

## Layout

```
apps/
  web/        Tablet web app: React + Vite + TypeScript
    src/features/   One folder per screen: profile, panel, indicator
    src/lib/        API client (the contracts as types), formatting, config
    src/hooks/  src/styles/
  mobile/     Empty for now
  landing/    Empty for now
services/
  api/        FastAPI backend
    app/            main.py (routes), schemas.py, db.py, config.py
    seed.py           Crew and the code that turns the CSV files into readings
    seed_content.py   Sources, indicators and rules, with their text
    download_data.py  tests/
database/
  sqlite/     schema.sql, and the SQLite file once seeded (not in git)
  datasets/   The raw dataset files, 85 MB
docs/         Design documents
```

## Setup (once)

You need [uv](https://docs.astral.sh/uv/) and Node 22.

```sh
cd services/api
uv run python seed.py            # builds database/sqlite/real_telemetry.db; replaces it if it exists

cd ../../apps/web
npm install
```

## Run

Two terminals. Nothing needs the network once the setup is done.

The datasets are in the repo. `uv run python download_data.py` fetches them again from NASA and Zenodo if a file is missing.

```sh
cd services/api && uv run uvicorn app.main:app --port 8000
cd apps/web && npm run dev
```

Open http://localhost:5173. "Today" is the demo date, 2021-11-02; add `?date=YYYY-MM-DD` to look at another day.

## Tests

```sh
cd services/api && uv run pytest
cd apps/web && npm run build && npm run lint
```
