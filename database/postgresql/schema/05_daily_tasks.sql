-- The daily checklist. Both servers have this same structure.

-- The tasks of the daily checklist. Some complete themselves from the data (the check-in, the tracker worn
-- overnight); the others the crew member ticks. XP is game design, not a health measure.
-- Managed on earth and downloaded by the moon.
CREATE TABLE cfg.daily_task (
  id            TEXT    PRIMARY KEY,
  title         TEXT    NOT NULL,
  xp            INTEGER NOT NULL CHECK (xp > 0),
  completion    TEXT    NOT NULL CHECK (completion IN ('auto_checkin', 'auto_sleep', 'manual')),
  display_order INTEGER NOT NULL UNIQUE,
  sync_seq      BIGINT  NOT NULL DEFAULT nextval('his.sync_seq')
);

-- A ticked (or unticked) manual task. Unticking sets done to false instead of deleting the row, because the
-- sync does not carry deletions. Written on the moon and sent to earth.
CREATE TABLE dat.task_completion (
  crew_member_id INTEGER     NOT NULL REFERENCES dat.crew_member (id),
  task_id        TEXT        NOT NULL REFERENCES cfg.daily_task (id),
  day            DATE        NOT NULL,
  done           BOOLEAN     NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_seq       BIGINT      NOT NULL DEFAULT nextval('his.sync_seq'),
  PRIMARY KEY (crew_member_id, task_id, day)
);

CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON cfg.daily_task       FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
CREATE TRIGGER bump_sync_seq BEFORE UPDATE ON dat.task_completion  FOR EACH ROW EXECUTE FUNCTION his.bump_sync_seq();
