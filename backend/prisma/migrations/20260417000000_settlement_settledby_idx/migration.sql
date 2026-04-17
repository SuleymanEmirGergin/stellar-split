-- Add index on Settlement.settledById for efficient "user's settlements" queries
CREATE INDEX IF NOT EXISTS "Settlement_settledById_idx" ON "Settlement"("settledById");
