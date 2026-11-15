-- Hydration and breathing, from the crew app (Becky's prototype, 15 Nov). Both servers have this same structure.
-- See services/api/app/wellbeing.py. On a database built before these tables, run
-- database/postgresql/migrations/2026-11-15_wellbeing.sql instead of rebuilding.

-- The daily hydration goal, a reference value with its source. It is not a clinical threshold and it raises no
-- alert: it only fills the fountain. Managed on earth and downloaded by the moon.
CREATE TABLE cfg.hydration_goal (
  sex             TEXT          PRIMARY KEY CHECK (sex IN ('female', 'male')),
  total_water_ml  INTEGER       NOT NULL CHECK (total_water_ml > 0),        -- adequate total water intake a day
  drinks_share    NUMERIC(3, 2) NOT NULL CHECK (drinks_share > 0 AND drinks_share <= 1),  -- the part that comes from drinks
  source          TEXT          NOT NULL,
  sync_seq        BIGINT        NOT NULL DEFAULT nextval('his.sync_seq')
);

-- One drink logged by a crew member. Undoing a drink sets undone instead of deleting the row, because the sync
-- does not carry deletions. Written on the moon and sent to earth.
CREATE TABLE dat.hydration_drink (
  crew_member_id INTEGER     NOT NULL REFERENCES dat.crew_member (id),
  drunk_at       TIMESTAMPTZ NOT NULL,
  day            DATE        NOT NULL,                                -- the mission day it counts for
  ml             INTEGER     NOT NULL CHECK (ml > 0 AND ml <= 1000),
  undone         BOOLEAN     NOT NULL DEFAULT false,
  sync_seq       BIGINT      NOT NULL DEFAULT nextval('his.sync_seq'),
  PRIMARY KEY (crew_member_id, drunk_at)
);

CREATE INDEX hydration_drink_day_idx ON dat.hydration_drink (crew_member_id, day);

-- One finished breathing exercise. A relaxation tool, not a measure: no rule reads it.
-- Written on the moon and sent to earth.
CREATE TABLE dat.breathing_session (
  crew_member_id INTEGER     NOT NULL REFERENCES dat.crew_member (id),
  finished_at    TIMESTAMPTZ NOT NULL,
  day            DATE        NOT NULL,
  breaths        INTEGER     NOT NULL CHECK (breaths > 0 AND breaths <= 20),
  sync_seq       BIGINT      NOT NULL DEFAULT nextval('his.sync_seq'),
  PRIMARY KEY (crew_member_id, finished_at)
);

CREATE INDEX breathing_session_day_idx ON dat.breathing_session (crew_member_id, day);

CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON cfg.hydration_goal    FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON dat.hydration_drink   FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON dat.breathing_session FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
