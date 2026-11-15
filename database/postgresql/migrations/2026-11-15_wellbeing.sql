-- Hydration and breathing for the crew app (15 Nov 2026).
--
-- For a database that already has the tables of schema/00 to 05 and its data: on Render or a local one.
-- A database built from scratch does not need it: schema/06_wellbeing.sql and the seeds already include all this.
--
-- It can run more than once: every step checks first. Run it on each server (moon and earth):
--   psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 -f database/postgresql/migrations/2026-11-15_wellbeing.sql
-- On Render, use the External Database URL of the database (its Connect menu) as DATABASE_URL.

-- 1. The sex of each crew member, only to pick the hydration goal
ALTER TABLE dat.crew_member ADD COLUMN IF NOT EXISTS sex TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crew_member_sex_check') THEN
    ALTER TABLE dat.crew_member ADD CONSTRAINT crew_member_sex_check CHECK (sex IN ('female', 'male'));
  END IF;
END $$;

-- The fictional crew of the demo (services/api/seed.py). Names that are not there are left as they are.
UPDATE dat.crew_member SET sex = 'female' WHERE sex IS NULL AND name IN ('Eva Lindqvist', 'Amara Okafor', 'Sofia Marchetti');
UPDATE dat.crew_member SET sex = 'male'   WHERE sex IS NULL AND name IN ('Mateo Vargas', 'Liam Novak', 'Kenji Mori');

-- 2. The tables (the same as schema/06_wellbeing.sql)
CREATE TABLE IF NOT EXISTS cfg.hydration_goal (
  sex             TEXT          PRIMARY KEY CHECK (sex IN ('female', 'male')),
  total_water_ml  INTEGER       NOT NULL CHECK (total_water_ml > 0),
  drinks_share    NUMERIC(3, 2) NOT NULL CHECK (drinks_share > 0 AND drinks_share <= 1),
  source          TEXT          NOT NULL,
  sync_seq        BIGINT        NOT NULL DEFAULT nextval('his.sync_seq')
);

CREATE TABLE IF NOT EXISTS dat.hydration_drink (
  crew_member_id INTEGER     NOT NULL REFERENCES dat.crew_member (id),
  drunk_at       TIMESTAMPTZ NOT NULL,
  day            DATE        NOT NULL,
  ml             INTEGER     NOT NULL CHECK (ml > 0 AND ml <= 1000),
  undone         BOOLEAN     NOT NULL DEFAULT false,
  sync_seq       BIGINT      NOT NULL DEFAULT nextval('his.sync_seq'),
  PRIMARY KEY (crew_member_id, drunk_at)
);

CREATE INDEX IF NOT EXISTS hydration_drink_day_idx ON dat.hydration_drink (crew_member_id, day);

CREATE TABLE IF NOT EXISTS dat.breathing_session (
  crew_member_id INTEGER     NOT NULL REFERENCES dat.crew_member (id),
  finished_at    TIMESTAMPTZ NOT NULL,
  day            DATE        NOT NULL,
  breaths        INTEGER     NOT NULL CHECK (breaths > 0 AND breaths <= 20),
  sync_seq       BIGINT      NOT NULL DEFAULT nextval('his.sync_seq'),
  PRIMARY KEY (crew_member_id, finished_at)
);

CREATE INDEX IF NOT EXISTS breathing_session_day_idx ON dat.breathing_session (crew_member_id, day);

-- CREATE OR REPLACE TRIGGER needs PostgreSQL 14 or later (Render has it)
CREATE OR REPLACE TRIGGER bump_sync_seq BEFORE UPDATE ON cfg.hydration_goal    FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
CREATE OR REPLACE TRIGGER bump_sync_seq BEFORE UPDATE ON dat.hydration_drink   FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
CREATE OR REPLACE TRIGGER bump_sync_seq BEFORE UPDATE ON dat.breathing_session FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();

-- 3. The goals (the same as seeds/14_cfg_hydration_goals.sql)
INSERT INTO cfg.hydration_goal (sex, total_water_ml, drinks_share, source) VALUES
  ('female', 2000, 0.75, 'EFSA Panel on Dietetic Products, Nutrition and Allergies (2010). Scientific Opinion on Dietary Reference Values for water. EFSA Journal 8(3):1459. Adequate total water intake for adults: 2.0 L a day for women and 2.5 L for men, with 20 to 30% coming from food, so about 75% from drinks. An Earth reference: the flight surgeon sets space and exercise targets.'),
  ('male', 2500, 0.75, 'EFSA Panel on Dietetic Products, Nutrition and Allergies (2010). Scientific Opinion on Dietary Reference Values for water. EFSA Journal 8(3):1459. Adequate total water intake for adults: 2.0 L a day for women and 2.5 L for men, with 20 to 30% coming from food, so about 75% from drinks. An Earth reference: the flight surgeon sets space and exercise targets.')
ON CONFLICT (sex) DO NOTHING;

