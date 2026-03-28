-- Fix platform_connections: add linkedin to any existing CHECK constraint
-- The production table uses: access_token, refresh_token, token_expires_at, account_id, account_name, scopes
-- These already exist in production — this migration is a no-op safety check.

-- Drop old check constraint if it still exists (was only in the migration file, not in prod)
alter table platform_connections
  drop constraint if exists platform_connections_platform_check;
