-- Add autopilot mode to sites
-- When enabled, the autopilot cron auto-generates, auto-approves,
-- and auto-publishes content for blog and twitter channels.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS autopilot_enabled boolean NOT NULL DEFAULT false;
