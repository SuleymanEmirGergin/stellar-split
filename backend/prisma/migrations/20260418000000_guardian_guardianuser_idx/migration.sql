-- Add index on Guardian.guardianUserId for efficient social recovery lookups
-- (find all users that a given guardian is protecting)
CREATE INDEX IF NOT EXISTS "Guardian_guardianUserId_idx" ON "Guardian"("guardianUserId");
