-- Synchronisation between the MOON and EARTH servers. Both databases have this same structure.
--
-- The moon works on its own and, when it chooses, connects to earth to send its data (push) and to
-- download what is new on earth (pull). See services/api/app/sync.py.
--
-- How a change is found: every synchronised row carries sync_seq, a number from one sequence that grows
-- on every insert and every update. A sync sends the rows with sync_seq above the last one already sent.

CREATE SEQUENCE his.sync_seq AS BIGINT;

-- On insert the column default takes the next number. On update this trigger does.
CREATE FUNCTION his.bump_sync_seq() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.sync_seq := nextval('his.sync_seq');
  RETURN NEW;
END;
$$;

ALTER TABLE cfg.source      ADD COLUMN sync_seq BIGINT NOT NULL DEFAULT nextval('his.sync_seq');
ALTER TABLE cfg.indicator   ADD COLUMN sync_seq BIGINT NOT NULL DEFAULT nextval('his.sync_seq');
ALTER TABLE cfg.rule        ADD COLUMN sync_seq BIGINT NOT NULL DEFAULT nextval('his.sync_seq');
ALTER TABLE dat.crew_member ADD COLUMN sync_seq BIGINT NOT NULL DEFAULT nextval('his.sync_seq');
ALTER TABLE dat.reading     ADD COLUMN sync_seq BIGINT NOT NULL DEFAULT nextval('his.sync_seq');

CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON cfg.source      FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON cfg.indicator   FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON cfg.rule        FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON dat.crew_member FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON dat.reading     FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();

-- A push reads the readings changed since the last one sent
CREATE INDEX reading_sync_seq_idx ON dat.reading (sync_seq);

-- History of every synchronisation, successful or not, on both servers. Append only.
CREATE TABLE his.sync_operation (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  direction   TEXT        NOT NULL CHECK (direction IN ('push', 'pull', 'received_push', 'served_pull')),
  peer        TEXT        NOT NULL,              -- the other server: its URL, or 'moon'
  started_at  TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT        NOT NULL CHECK (status IN ('ok', 'failed')),
  row_count   INTEGER     NOT NULL DEFAULT 0,
  from_seq    BIGINT,                            -- rows above this were asked for or sent
  to_seq      BIGINT,                            -- the highest sync_seq included; the next sync starts here
  error       TEXT                               -- why it failed, never medical data
);

CREATE INDEX sync_operation_direction_idx ON his.sync_operation (direction, status, id DESC);
