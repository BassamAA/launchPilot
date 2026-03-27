-- Social strategy storage: Instagram, YouTube, LinkedIn strategies stored per site
ALTER TABLE sites ADD COLUMN IF NOT EXISTS social_strategy_json jsonb DEFAULT '{}'::jsonb;
