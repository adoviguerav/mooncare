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
    app/            main.py (routes), schemas.py, models.py (SQLAlchemy), db.py, config.py
                    sync.py, sync_client.py, sync_routes.py: moon-earth synchronisation
    seed.py           Crew and the code that turns the CSV files into the INSERT files
    seed_content.py   Sources, indicators and rules, with their text
    load_database.py  Creates the tables and loads the INSERT files into PostgreSQL or Supabase
    download_data.py  tests/
database/
  postgresql/ schema/ (CREATE), seeds/ (INSERT), docker-compose.yml. See its README
  datasets/   The raw dataset files, 85 MB
docs/         Design documents
```

## Setup (once)

You need [uv](https://docs.astral.sh/uv/), PostgreSQL (local, or a Supabase project) and Node 22.

The backend uses PostgreSQL: a local server or Supabase. Both are built from the same `.sql` files, and `DATABASE_PROVIDER` in `services/api/.env` picks one. Details in [database/postgresql](database/postgresql/README.md).

```sh
cd services/api
cp .env.example .env               # DATABASE_PROVIDER and the connection string of that database
uv run python load_database.py     # creates the tables and loads the data, if they are not there yet

cd ../../apps/web
npm install
```

After changing the crew, a text, a rule or the datasets: regenerate the INSERT files with `uv run python seed.py`, commit them, and reload with `uv run python load_database.py --rebuild`.

## Run

Two terminals. Nothing needs the network once the setup is done.

The datasets are in the repo. `uv run python download_data.py` fetches them again from NASA and Zenodo if a file is missing.

```sh
cd services/api && uv run uvicorn app.main:app --port 8000
cd apps/web && npm run dev
```

Each crew member is fictional: the blood values of one Inspiration4 astronaut and the wearable and mood data of one LifeSnaps volunteer. The values are real. The LifeSnaps dates are shifted by a fixed number of days so they line up with the mission dates.

Open http://localhost:5173. "Today" is the demo date, 2021-11-02; add `?date=YYYY-MM-DD` to look at another day.

### Moon and earth servers

The same backend runs as the moon server (`NODE_ROLE=moon`, the default) or the earth server (`NODE_ROLE=earth`), each with its own database. The moon works on its own and syncs with earth when asked. To run both on one laptop, put the earth settings in `services/api/.env.earth` and:

```sh
cd services/api
ENV_FILE=.env.earth uv run python load_database.py             # once: the earth database
ENV_FILE=.env.earth uv run uvicorn app.main:app --port 8001    # earth, next to the moon on 8000
curl -X POST http://localhost:8000/api/sync                    # the moon sends its data and downloads earth's
```

How it works, the endpoints and the configuration are in [docs/moon_earth_sync.md](docs/moon_earth_sync.md).

## Tests

The backend tests create throwaway databases on the server of `POSTGRESQL_URL` and drop them at the end, so that server must be running. They never touch Supabase.

```sh
cd services/api && uv run pytest
cd apps/web && npm run build && npm run lint
```
