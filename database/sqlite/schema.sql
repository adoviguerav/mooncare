CREATE TABLE crew_member (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE source (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  url      TEXT NOT NULL,
  citation TEXT NOT NULL
);

CREATE TABLE indicator (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  unit        TEXT,
  how_to_measure TEXT NOT NULL,
  why_it_matters TEXT NOT NULL,
  source_id   TEXT NOT NULL REFERENCES source(id)
);

CREATE TABLE reading (
  crew_member_id INTEGER NOT NULL REFERENCES crew_member(id),
  indicator_id   TEXT    NOT NULL REFERENCES indicator(id),
  taken_at       TEXT    NOT NULL,
  value          REAL    NOT NULL,
  PRIMARY KEY (crew_member_id, indicator_id, taken_at)
);

CREATE TABLE rule (
  id               INTEGER PRIMARY KEY,
  indicator_id     TEXT NOT NULL REFERENCES indicator(id),
  low              REAL,
  high             REAL,
  title            TEXT NOT NULL,
  explanation      TEXT NOT NULL,
  action           TEXT NOT NULL,
  threshold_source TEXT NOT NULL,
  CHECK (low IS NOT NULL OR high IS NOT NULL)
);
