-- Three schemas, one per kind of table. Each table lives in exactly one of them.
--   cfg  Configuration: what the system knows before any reading arrives (sources, indicators, rules).
--   dat  Data: the crew and their readings. Changes every day.
--   his  History: append-only records. For now, the moon-earth synchronisations (03_sync.sql).
--
-- In Supabase these schemas are not exposed through the Data API (only `public` is, by default),
-- so the tables are reachable only through the FastAPI backend.

CREATE SCHEMA IF NOT EXISTS cfg;
CREATE SCHEMA IF NOT EXISTS dat;
CREATE SCHEMA IF NOT EXISTS his;
