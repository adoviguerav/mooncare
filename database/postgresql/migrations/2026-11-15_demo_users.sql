-- The public demo accounts of the landing page (15 Nov 2026).
--
-- The landing tells visitors how to sign in:
--   - Amara Okafor, medical officer, in the dashboard (apps/web): she sees the whole crew and is the one the
--     emergency guide and its voice are for.
--   - Liam Novak, crew member, in the crew app (apps/mobile).
-- Both with the PIN 123456, printed on the landing on purpose: these are demo accounts on fictional data.
-- Never give this PIN to an account with real data.
--
-- Only the argon2 hash of the PIN is stored, never the PIN. It can run more than once: it creates the account
-- if it is missing, and otherwise resets its PIN and turns it on. It needs the tables of schema/04_auth.sql.
--   psql "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 -f database/postgresql/migrations/2026-11-15_demo_users.sql
-- On a moon and earth pair, run it on earth: the moon receives the users with the next sync.

INSERT INTO dat.app_user (display_name, role, crew_member_id, pin_hash, is_active)
SELECT name, role, id, '$argon2id$v=19$m=65536,t=3,p=4$JSwLCyiE0rLI9idMnjIGNA$0ilUdgXNjuRPAvpbSEL1RMyvzZCy7vQOaiZpA53uGeU', true
FROM dat.crew_member
WHERE name IN ('Amara Okafor', 'Liam Novak')
ON CONFLICT (crew_member_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, is_active = true;
