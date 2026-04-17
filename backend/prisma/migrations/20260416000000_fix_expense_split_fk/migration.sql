-- Migration: Add ExpenseSplit.userId → User.id FK constraint + RecoveryRequest.groupId index
-- Safety: Delete orphaned rows before adding FK to avoid constraint violation.

-- 1. Remove orphaned ExpenseSplit rows where userId has no matching User.id
DELETE FROM "ExpenseSplit"
WHERE "userId" NOT IN (SELECT "id" FROM "User");

-- 2. Add FK constraint: ExpenseSplit.userId → User.id (cascade delete)
ALTER TABLE "ExpenseSplit"
  ADD CONSTRAINT "ExpenseSplit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Add missing groupId index on RecoveryRequest (for efficient lookup by group)
CREATE INDEX IF NOT EXISTS "RecoveryRequest_groupId_idx"
  ON "RecoveryRequest"("groupId");
